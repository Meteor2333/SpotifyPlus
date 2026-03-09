package com.lenerd46.spotifyplus.beautifullyrics.entities;

import android.content.Context;
import android.graphics.*;
import android.os.*;
import android.view.Choreographer;
import android.view.View;
import android.view.ViewGroup;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

public class OldAnimatedBackgroundView extends View {
    // VISUAL CONFIGURATION
    private static final float DOWNSAMPLE_FACTOR = 0.12f;
    private static final float BLUR_RADIUS_RATIO = 0.4f;
    private static final int   BOX_BLUR_PASSES = 3;
    private static final long  TRANSITION_DURATION_MS = 1200L;
    private static final int   BLOB_COUNT = 7;
    private static final int   BLOB_POINTS = 16;

    // TRIPLE BUFFERING
    private static final int BUFFER_COUNT = 3;

    private final HandlerThread renderThread;
    private Handler renderHandler;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean isRendering = new AtomicBoolean(false);
    private final Object lock = new Object();

    private final Bitmap[] buffers = new Bitmap[BUFFER_COUNT];
    private final Canvas[] canvases = new Canvas[BUFFER_COUNT];
    private int renderHeadIndex = 0;
    private Bitmap renderedBitmap;

    private int viewW, viewH;
    private int offW = 1, offH = 1;
    private float scaleToOffscreen = 1f;

    private Bitmap sourceImage;
    private Bitmap shaderBitmap;
    private int baseColor = 0xFF101010;

    private List<Blob> blobs = new ArrayList<>();
    private final List<Path> blobPaths = new ArrayList<>();
    private final List<BitmapShader> blobShaders = new ArrayList<>();

    private final Paint renderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint drawPaint =
            new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
    private final Matrix tmpMatrix = new Matrix();

    private long startTimeMs;
    private boolean isTransitioning = false;
    private Bitmap previousBitmap;
    private long transitionStartMs;

    // blur scratch
    private int[] blurBufA, blurBufB;
    private int blurBufW, blurBufH;
    private boolean blurred = true;

    private final ViewGroup root;
    private Choreographer.FrameCallback frameCallback;

    public OldAnimatedBackgroundView(Context ctx, Bitmap bitmap, ViewGroup root) {
        super(ctx);
        this.root = root;
        setLayerType(LAYER_TYPE_HARDWARE, null);

        this.sourceImage =
                (bitmap != null && !bitmap.isRecycled())
                        ? bitmap
                        : Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);

        renderThread = new HandlerThread("BGAnim");
        renderThread.start();
        renderHandler = new Handler(renderThread.getLooper());

        renderPaint.setStyle(Paint.Style.FILL);
        startTimeMs = SystemClock.elapsedRealtime();

        frameCallback = nano -> {
            if (getWindowToken() == null) return;
            renderHandler.post(renderRunnable);
            Choreographer.getInstance().postFrameCallback(frameCallback);
        };
    }

    public void updateImage(Bitmap newImage) {
        if (newImage == null || newImage.isRecycled()) return;
        synchronized (lock) {
            if (renderedBitmap != null) {
                previousBitmap = renderedBitmap;
                transitionStartMs = SystemClock.elapsedRealtime();
                isTransitioning = true;
            }
            sourceImage = newImage;
        }
        renderHandler.post(this::internalRebuildResources);
    }

    public void setBlurred(boolean enable) {
        blurred = enable;
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        allocateBuffersIfNeeded(getWidth(), getHeight());
        renderHandler.post(this::internalRebuildResources);
        Choreographer.getInstance().postFrameCallback(frameCallback);
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        Choreographer.getInstance().removeFrameCallback(frameCallback);
        renderHandler.removeCallbacksAndMessages(null);
        renderThread.quitSafely();
        synchronized (lock) {
            for (int i = 0; i < BUFFER_COUNT; i++) {
                if (buffers[i] != null && !buffers[i].isRecycled()) {
                    buffers[i].recycle();
                    buffers[i] = null;
                }
            }
            if (shaderBitmap != null) shaderBitmap.recycle();
        }
    }

    @Override
    protected void onSizeChanged(int w, int h, int ow, int oh) {
        super.onSizeChanged(w, h, ow, oh);
        allocateBuffersIfNeeded(w, h);
        renderHandler.post(this::internalRebuildResources);
    }

    private void allocateBuffersIfNeeded(int vw, int vh) {
        if (vw <= 0 || vh <= 0) return;
        viewW = vw; viewH = vh;
        int tw = Math.max(1, Math.round(vw * DOWNSAMPLE_FACTOR));
        int th = Math.max(1, Math.round(vh * DOWNSAMPLE_FACTOR));
        if (buffers[0] != null
                && buffers[0].getWidth() == tw
                && buffers[0].getHeight() == th) {
            return;
        }
        synchronized (lock) {
            for (int i = 0; i < BUFFER_COUNT; i++) {
                if (buffers[i] != null) buffers[i].recycle();
                buffers[i] = Bitmap.createBitmap(tw, th, Bitmap.Config.ARGB_8888);
                canvases[i] = new Canvas(buffers[i]);
            }
            offW = tw; offH = th;
            scaleToOffscreen = offW / (float) vw;
            blurBufA = new int[offW * offH];
            blurBufB = new int[offW * offH];
            blurBufW = offW; blurBufH = offH;
        }
    }

    /**
     * Builds a saturated, contrast‐boosted square texture (shaderBitmap),
     * picks a dark baseColor, then seeds and generates all blobs
     * deterministically from the image contents.
     */
    private void internalRebuildResources() {
        if (offW <= 0 || offH <= 0) return;

        // 1) Prepare shaderBitmap
        int sz = Math.max(512,
                Math.max(sourceImage.getWidth(), sourceImage.getHeight()));
        Bitmap base = Bitmap.createBitmap(sz, sz, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(base);
        Paint p = new Paint(Paint.FILTER_BITMAP_FLAG);

        // Saturation & slight contrast
        ColorMatrix cm = new ColorMatrix();
        cm.setSaturation(2.5f);
        float contrast = 1.1f, t = (-.5f * contrast + .5f) * 255f;
        cm.postConcat(new ColorMatrix(new float[]{
                contrast,0,0,0,t,
                0,contrast,0,0,t,
                0,0,contrast,0,t,
                0,0,0,1,0
        }));
        p.setColorFilter(new ColorMatrixColorFilter(cm));

        Rect src = centerCropRect(
                sourceImage.getWidth(), sourceImage.getHeight(), sz, sz);
        c.drawBitmap(sourceImage, src, new Rect(0,0,sz,sz), p);

        baseColor = getDarkDominantColor(base);
        synchronized (lock) {
            if (shaderBitmap != null) shaderBitmap.recycle();
            shaderBitmap = base;
        }

        // 2) Compute a 64-bit seed from the image pixels (16×16 downsample)
        long seed = computeImageSeed(sourceImage);

        // 3) Generate blobs deterministically
        Random rnd = new Random(seed);
        blobs.clear();
        blobPaths.clear();
        blobShaders.clear();

        float baseR = Math.max(viewW, viewH) * 0.35f;
        for (int i = 0; i < BLOB_COUNT; i++) {
            float x = rnd.nextFloat() * viewW;
            float y = rnd.nextFloat() * viewH;
            float vx = (rnd.nextFloat() - .5f) * 1.5f;
            float vy = (rnd.nextFloat() - .5f) * 1.5f;
            float r = baseR * (.8f + rnd.nextFloat() * .6f);
            // texture anchors in the shaderBitmap square
            float tx = rnd.nextFloat() * (sz * .6f) + sz * .2f;
            float ty = rnd.nextFloat() * (sz * .6f) + sz * .2f;
            blobs.add(new Blob(x,y,r,vx,vy,tx,ty));
            blobPaths.add(new Path());
            blobShaders.add(
                    new BitmapShader(shaderBitmap,
                            Shader.TileMode.MIRROR,
                            Shader.TileMode.MIRROR));
        }
    }

    // Main render pass
    private final Runnable renderRunnable = () -> {
        if (!isRendering.compareAndSet(false, true)) return;
        try {
            if (offW<=0||offH<=0||shaderBitmap==null||shaderBitmap.isRecycled())
                return;
            int idx = (renderHeadIndex+1)%BUFFER_COUNT;
            Bitmap buf = buffers[idx];
            Canvas c = canvases[idx];
            final long now = SystemClock.elapsedRealtime();
            final float t = (now - startTimeMs)/1000f;
            c.drawColor(baseColor);

            for (int i=0;i<blobs.size();i++){
                Blob b = blobs.get(i);
                updateBlobPhysics(b, viewW, viewH);
                Path path = blobPaths.get(i);
                updateBlobPath(path,b,t,i,scaleToOffscreen);
                BitmapShader sh = blobShaders.get(i);
                updateShaderMatrix(tmpMatrix,sh,b,t,scaleToOffscreen,
                        shaderBitmap.getWidth());
                renderPaint.setShader(sh);
                c.drawPath(path, renderPaint);
            }
            renderPaint.setShader(null);

            if (blurred) {
                int radius = Math.max(1, (int)(offW*BLUR_RADIUS_RATIO));
                fastBoxBlurOpaque(buf, radius, BOX_BLUR_PASSES);
            }

            synchronized(lock){
                renderedBitmap = buf;
                renderHeadIndex = idx;
            }
            mainHandler.post(this::postInvalidateOnAnimation);
        } catch(Exception ignored){}
        finally{ isRendering.set(false); }
    };

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        Bitmap cur, prev;
        long start;
        synchronized(lock){
            cur=renderedBitmap;
            prev=previousBitmap;
            start=transitionStartMs;
        }
        if (cur==null||cur.isRecycled()){
            canvas.drawColor(baseColor);
            return;
        }
        Rect dst=new Rect(0,0,getWidth(),getHeight());
        if (isTransitioning && prev!=null && !prev.isRecycled()){
            float p= Math.min(
                    (SystemClock.elapsedRealtime()-start)/(float)TRANSITION_DURATION_MS,1f);
            drawPaint.setAlpha(255);
            canvas.drawBitmap(prev,null,dst,drawPaint);
            drawPaint.setAlpha((int)(p*255));
            canvas.drawBitmap(cur,null,dst,drawPaint);
            if (p>=1f){
                isTransitioning=false;
                synchronized(lock){ previousBitmap=null; }
            }
        } else {
            drawPaint.setAlpha(255);
            canvas.drawBitmap(cur,null,dst,drawPaint);
        }
    }

    // --- Helpers ---

    private void updateBlobPhysics(Blob b, int w, int h) {
        b.x+=b.vx; b.y+=b.vy;
        float m=b.radius*.5f;
        if(b.x< -m){b.x=-m; b.vx*=-1;}
        if(b.x> w+m){b.x=w+m; b.vx*=-1;}
        if(b.y< -m){b.y=-m; b.vy*=-1;}
        if(b.y> h+m){b.y=h+m; b.vy*=-1;}
    }

    private void updateBlobPath(Path path, Blob b,
                                float t, int idx, float s) {
        path.rewind();
        float cx=b.x*s, cy=b.y*s, r=b.radius*s;
        double to = t + idx*10;
        for(int i=0;i<=BLOB_POINTS;i++){
            float ang = (float)(2*Math.PI*i/BLOB_POINTS);
            float noise = (float)(
                    Math.sin(ang*3+to)*.1 + Math.cos(ang*5-to*.8)*.05
            );
            float rr=r*(1+noise);
            float px = cx+rr*(float)Math.cos(ang);
            float py = cy+rr*(float)Math.sin(ang);
            if(i==0) path.moveTo(px,py);
            else    path.lineTo(px,py);
        }
        path.close();
    }

    private void updateShaderMatrix(Matrix m, BitmapShader sh,
                                    Blob b, float t, float s, int sz) {
        m.reset();
        float zoom=3f;
        float panX = (float)Math.sin(t*.2 + b.texAnchorX)*50f;
        float panY = (float)Math.cos(t*.2 + b.texAnchorY)*50f;
        float tx = -b.texAnchorX - panX;
        float ty = -b.texAnchorY - panY;
        float bx = b.x*s, by = b.y*s;
        m.postTranslate(tx,ty);
        m.postScale(zoom,zoom);
        m.postRotate(t*5f + b.texAnchorX);
        m.postTranslate(bx,by);
        sh.setLocalMatrix(m);
    }

    private static Rect centerCropRect(int sw,int sh,int dw,int dh){
        float sa=sw/(float)sh, da=dw/(float)dh;
        if(sa>da){
            int nw=Math.round(sh*da), x=(sw-nw)/2;
            return new Rect(x,0,x+nw,sh);
        } else {
            int nh=Math.round(sw/da), y=(sh-nh)/2;
            return new Rect(0,y,sw,y+nh);
        }
    }

    private static int getDarkDominantColor(Bitmap b){
        int w=b.getWidth(),h=b.getHeight();
        int c1=b.getPixel(w/2,h/2), c2=b.getPixel(10,10);
        int r=((Color.red(c1)+Color.red(c2))/2)/4;
        int g=((Color.green(c1)+Color.green(c2))/2)/4;
        int bl=((Color.blue(c1)+Color.blue(c2))/2)/4;
        return Color.rgb(r,g,bl);
    }

    /**
     * Downsamples the image to ~16×16 grid and does a simple rolling hash
     * over those pixels to produce a stable 64-bit seed.
     */
    private long computeImageSeed(Bitmap img){
        int w=img.getWidth(), h=img.getHeight();
        int stepX = Math.max(1, w/16), stepY = Math.max(1, h/16);
        long hash = 0x9E3779B97F4A7C15L; // some large prime offset
        for(int y=0;y<h;y+=stepY){
            for(int x=0;x<w;x+=stepX){
                hash = hash*31 + img.getPixel(x,y);
            }
        }
        return hash;
    }

    private void fastBoxBlurOpaque(Bitmap src, int r, int passes) {
        if(r<=0||passes<=0) return;
        if(blurBufA==null||blurBufW!=offW||blurBufH!=offH) return;
        src.getPixels(blurBufA,0,offW,0,0,offW,offH);
        for(int i=0;i<passes;i++){
            boxBlurHorizontalOpaque(blurBufA,blurBufB,offW,offH,r);
            boxBlurVerticalOpaque(blurBufB,blurBufA,offW,offH,r);
        }
        for(int i=0;i<blurBufA.length;i++) blurBufA[i]|=0xFF000000;
        src.setPixels(blurBufA,0,offW,0,0,offW,offH);
    }

    private static void boxBlurHorizontalOpaque(
            int[] s, int[] d, int w, int h, int r){
        int div=r*2+1;
        for(int y=0;y<h;y++){
            int tr=0,tg=0,tb=0, yi=y*w;
            for(int x=-r;x<=r;x++){
                int c=s[yi+clamp(x,0,w-1)];
                tr+=(c>>16)&0xFF; tg+=(c>>8)&0xFF; tb+=c&0xFF;
            }
            for(int x=0;x<w;x++){
                d[yi+x]=0xFF000000
                        |((tr/div)<<16)|((tg/div)<<8)|(tb/div);
                int out=s[yi+clamp(x-r,0,w-1)];
                int in =s[yi+clamp(x+r+1,0,w-1)];
                tr+=((in>>16)&0xFF)-((out>>16)&0xFF);
                tg+=((in>>8)&0xFF)-((out>>8)&0xFF);
                tb+=(in&0xFF)-(out&0xFF);
            }
        }
    }

    private static void boxBlurVerticalOpaque(
            int[] s, int[] d, int w, int h, int r){
        int div=r*2+1;
        for(int x=0;x<w;x++){
            int tr=0,tg=0,tb=0;
            for(int y=-r;y<=r;y++){
                int c=s[clamp(y,0,h-1)*w+x];
                tr+=(c>>16)&0xFF; tg+=(c>>8)&0xFF; tb+=c&0xFF;
            }
            for(int y=0;y<h;y++){
                d[y*w+x]=0xFF000000
                        |((tr/div)<<16)|((tg/div)<<8)|(tb/div);
                int out=s[clamp(y-r,0,h-1)*w+x];
                int in =s[clamp(y+r+1,0,h-1)*w+x];
                tr+=((in>>16)&0xFF)-((out>>16)&0xFF);
                tg+=((in>>8)&0xFF)-((out>>8)&0xFF);
                tb+=(in&0xFF)-(out&0xFF);
            }
        }
    }

    private static int clamp(int v,int lo,int hi){
        return v<lo?lo:(v>hi?hi:v);
    }

    public static class Blob {
        public float x,y,radius;
        public float vx,vy;
        public final float texAnchorX, texAnchorY;
        public Blob(float x,float y,float rad,
                    float vx,float vy,float tx,float ty) {
            this.x = x; this.y = y; this.radius = rad;
            this.vx = vx; this.vy = vy;
            this.texAnchorX = tx; this.texAnchorY = ty;
        }
    }
}