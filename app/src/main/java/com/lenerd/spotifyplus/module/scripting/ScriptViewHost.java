package com.lenerd.spotifyplus.module.scripting;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.TimeInterpolator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.BounceInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.view.animation.OvershootInterpolator;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.*;

import com.facebook.soloader.SoLoader;
import com.facebook.yoga.YogaAlign;
import com.facebook.yoga.YogaConfig;
import com.facebook.yoga.YogaConfigFactory;
import com.facebook.yoga.YogaConstants;
import com.facebook.yoga.YogaDirection;
import com.facebook.yoga.YogaDisplay;
import com.facebook.yoga.YogaEdge;
import com.facebook.yoga.YogaErrata;
import com.facebook.yoga.YogaFlexDirection;
import com.facebook.yoga.YogaGutter;
import com.facebook.yoga.YogaJustify;
import com.facebook.yoga.YogaMeasureFunction;
import com.facebook.yoga.YogaMeasureMode;
import com.facebook.yoga.YogaMeasureOutput;
import com.facebook.yoga.YogaNode;
import com.facebook.yoga.YogaNodeFactory;
import com.facebook.yoga.YogaOverflow;
import com.facebook.yoga.YogaPositionType;
import com.facebook.yoga.YogaWrap;
import com.lenerd.spotifyplus.manager.bridge.BridgeClient;

import com.lenerd.spotifyplus.module.Utils;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.WeakHashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public class ScriptViewHost {
    private static final String TAG = "SpotifyPlus";
    private static final YogaMeasureFunction LEAF_MEASURE_FUNCTION = (node, width, widthMode, height, heightMode) -> {
        Object data = node.getData();
        if (!(data instanceof RenderNode renderNode) || renderNode.view == null) return YogaMeasureOutput.make(0, 0);
        return renderNode.host.measureLeaf(renderNode, width, widthMode, height, heightMode);
    };

    private final List<JSONArray> pendingBatches = new ArrayList<>();
    private boolean attached = false;
    private final Map<Integer, String> lastNativeEditTextValues = new HashMap<>();
    private final Map<Integer, Integer> lastNativeSeekBarValues = new HashMap<>();
    private final Set<Integer> activelyDraggingSeekBars = new HashSet<>();

    private final String surfaceId;
    private final ViewGroup hostRoot;
    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final YogaConfig yogaConfig;
    private final RenderNode surfaceNode;
    private final YogaRootLayout surfaceView;
    private final Map<Integer, RenderNode> nodes = new HashMap<>();
    private final Map<View, RenderNode> nodesByView = new IdentityHashMap<>();
    private final Map<Integer, TextWatcher> textWatchers = new HashMap<>();
    private final Set<Integer> suppressedEventNodes = new HashSet<>();
    private final Map<ImageView, String> appliedImageSources = new WeakHashMap<>();
    private final Map<ImageView, Integer> imageRequestIds = new WeakHashMap<>();
    private final Map<Integer, Animator> runningNativeAnimations = new HashMap<>();
    private final Map<Integer, Integer> nativeAnimationNodes = new HashMap<>();
    private int nextImageRequestId = 1;
    private static boolean initialized = false;

    public ScriptViewHost(String surfaceId, ViewGroup root) {
        Context context = root.getContext();

        if (!initialized) {
            try {
                File outDir = new File(context.getCodeCacheDir(), "spotifyplus-libs");
                if(!outDir.exists() && !outDir.mkdirs()) throw new IllegalStateException("Failed to create cache directory");

                extractAndLoad(Utils.MODULE_APK_PATH, outDir, "libc++_shared.so");
//                extractAndLoad(Utils.MODULE_APK_PATH, outDir, "libfbjni.so");
                extractAndLoad(Utils.MODULE_APK_PATH, outDir, "libyoga.so");
                Log.d("SpotifyPlus", "Loaded libraries!");

                SoLoader.init(root.getContext(), false);
                initialized = true;
            } catch(Exception e) {
                Log.e("SpotifyPlus", "Failed to get library", e);
            }

            markSoLoaderLibraryAsLoaded("yoga");
        }

        this.surfaceId = surfaceId;
        this.hostRoot = root;
        this.context = root.getContext();
        this.yogaConfig = YogaConfigFactory.create();
        try {
            this.yogaConfig.setErrata(YogaErrata.valueOf("NONE"));
        } catch (Throwable ignored) {
        }
        this.surfaceNode = new RenderNode(this, -1, "ROOT");
        this.surfaceNode.yogaNode = createYogaNode(this.surfaceNode);
        this.surfaceView = new YogaRootLayout(context, this, this.surfaceNode);
        this.surfaceView.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override
            public void onViewAttachedToWindow(View v) {
                attached = true;
                flushPendingBatches();
            }

            @Override
            public void onViewDetachedFromWindow(View v) {
                attached = false;
            }
        });

        this.hostRoot.addView(this.surfaceView, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        if (this.surfaceView.isAttachedToWindow()) {
            attached = true;
            flushPendingBatches();
        }
    }

    private static void markSoLoaderLibraryAsLoaded(String shortName) {
        try {
            Class<?> soLoaderClass = Class.forName("com.facebook.soloader.SoLoader");
            java.lang.reflect.Field loadedField = soLoaderClass.getDeclaredField("sLoadedLibraries");
            loadedField.setAccessible(true);

            @SuppressWarnings("unchecked")
            java.util.Set<String> loaded = (java.util.Set<String>) loadedField.get(null);

            String soName = System.mapLibraryName(shortName);
            loaded.add(soName);

            android.util.Log.d("SpotifyPlus", "Marked SoLoader library as loaded: " + soName);
        } catch (Throwable t) {
            throw new RuntimeException("Failed to mark SoLoader library as loaded: " + shortName, t);
        }
    }

    private static void extractAndLoad(String apkPath, File outDir, String libName) throws Exception {
        ZipEntry entry = findBestLibEntry(apkPath, libName);
        if (entry == null) {
            Log.d(TAG, "Library not found in APK, skipping: " + libName);
            return;
        }

        File outFile = new File(outDir, libName);
        extractEntry(apkPath, entry, outFile);
        Log.d(TAG, "Loading " + outFile.getAbsolutePath());
        System.load(outFile.getAbsolutePath());
    }

    private static ZipEntry findBestLibEntry(String apkPath, String libName) throws Exception {
        try (ZipFile zip = new ZipFile(apkPath)) {
            for (String abi : Build.SUPPORTED_ABIS) {
                ZipEntry entry = zip.getEntry("lib/" + abi + "/" + libName);
                if (entry != null) return entry;
            }

            ZipEntry fallback = zip.getEntry("lib/arm64-v8a/" + libName);
            if (fallback != null) return fallback;

            fallback = zip.getEntry("lib/armeabi-v7a/" + libName);
            if (fallback != null) return fallback;

            fallback = zip.getEntry("lib/x86_64/" + libName);
            if (fallback != null) return fallback;

            fallback = zip.getEntry("lib/x86/" + libName);
            return fallback;
        }
    }

    private static void extractEntry(String apkPath, ZipEntry entry, File outFile) throws Exception {
        try (ZipFile zip = new ZipFile(apkPath); InputStream in = zip.getInputStream(entry); FileOutputStream out = new FileOutputStream(outFile, false)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            out.flush();
        }
    }

    private void applyOpsNow(JSONArray ops) {
        try {
            boolean needsLayout = false;
            for (int i = 0; i < ops.length(); i++) {
                JSONObject item = ops.getJSONObject(i);
                try {
                    applyOp(item);
                    needsLayout = needsLayout || opRequiresLayout(item);
                } catch (Exception e) {
                    Log.e(TAG, "Failed applying op index=" + i + " op=" + item, e);
                }
            }

            if (needsLayout) forceLayoutNow();
            else {
                surfaceView.invalidate();
                hostRoot.invalidate();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed applying Yoga UI ops", e);
        }
    }

    private void flushPendingBatches() {
        if (!attached && !surfaceView.isAttachedToWindow()) return;
        if (pendingBatches.isEmpty()) return;

        List<JSONArray> batches = new ArrayList<>(pendingBatches);
        pendingBatches.clear();

        for (JSONArray batch : batches) applyOpsNow(batch);
    }

    public void applyOps(JSONArray ops) {
        try {
            if (!attached && !surfaceView.isAttachedToWindow()) {
                pendingBatches.add(new JSONArray(ops.toString()));
                return;
            }

            applyOpsNow(ops);
        } catch (Exception e) {
            Log.e(TAG, "Failed applying Yoga UI ops", e);
        }
    }

    private void applyOp(JSONObject op) throws Exception {
        String kind = op.getString("op");
        switch (kind) {
            case "createNode":
                createNode(op);
                break;
            case "createText":
                createText(op);
                break;
            case "appendChild":
                appendChild(op);
                break;
            case "appendToRoot":
                appendToRoot(op);
                break;
            case "removeChild":
                removeChild(op);
                break;
            case "removeFromRoot":
                removeFromRoot(op);
                break;
            case "updateProps":
                updateProps(op);
                break;
            case "updateText":
                updateText(op);
                break;
            case "destroyNode":
                destroyNode(op);
                break;
            case "insertBefore":
                insertBefore(op);
                break;
            case "insertInRootBefore":
                insertInRootBefore(op);
                break;
            case "startNativeAnimation":
                startNativeAnimation(op);
                break;
            case "stopNativeAnimation":
                stopNativeAnimation(op);
                break;
            default:
                Log.w(TAG, "Unknown op " + kind);
                break;
        }
    }

    private void createNode(JSONObject op) throws Exception {
        int id = op.getInt("id");
        String type = op.getString("type");
        JSONObject props = copyJson(op.optJSONObject("props"));
        RenderNode node = new RenderNode(this, id, type);
        node.props = props;
        node.view = createViewForType(node);
        node.yogaNode = createYogaNode(node);

        if (node.view != null) {
            node.view.setId(View.generateViewId());
            nodesByView.put(node.view, node);
            applyViewProps(node, node.view, node.props);
            applyEventProps(node, node.view, node.props);
        }

        nodes.put(id, node);
    }

    private void createText(JSONObject op) {
        int id = op.optInt("id");
        String text = op.optString("text", "");
        RenderNode node = new RenderNode(this, id, "#text");
        node.isRawText = true;
        node.text = text;
        nodes.put(id, node);
    }

    private void appendChild(JSONObject op) throws Exception {
        RenderNode parent = getNode(op.getInt("parentId"));
        RenderNode child = getNode(op.getInt("childId"));
        attachChild(parent, child, -1);
    }

    private void appendToRoot(JSONObject op) throws Exception {
        RenderNode child = getNode(op.getInt("childId"));
        attachChild(surfaceNode, child, -1);
    }

    private void removeChild(JSONObject op) throws Exception {
        RenderNode parent = getNode(op.getInt("parentId"));
        RenderNode child = getNode(op.getInt("childId"));
        detachChild(parent, child);
    }

    private void removeFromRoot(JSONObject op) throws Exception {
        RenderNode child = getNode(op.getInt("childId"));
        detachChild(surfaceNode, child);
    }

    private void updateProps(JSONObject op) throws Exception {
        RenderNode node = getNode(op.getInt("id"));
        if (node.isRawText) return;
        JSONObject patch = op.optJSONObject("props");
        boolean affectsLayout = propsAffectLayout(patch);
        node.props = mergeJson(node.props, patch);
        if (affectsLayout) rebuildYogaNode(node);
        if (node.view != null) {
            withSuppressedEvents(node.id, () -> applyViewProps(node, node.view, node.props));
            applyEventProps(node, node.view, node.props);

            if (node.type.equals("RadioGroup")) syncRadioGroup(node);
        }
    }

    private void updateText(JSONObject op) throws Exception {
        RenderNode node = getNode(op.getInt("id"));
        String text = op.optString("text", "");

        if (node.isRawText) {
            node.text = text;
            if (node.parent != null) {
                rebuildTextChildren(node.parent);
                dirtyIfNeeded(node.parent);
            }
            return;
        }

        if (node.view instanceof TextView textView) {
            textView.setText(text);
            dirtyIfNeeded(node);
        }
    }

    private void destroyNode(JSONObject op) throws Exception {
        RenderNode node = getNode(op.getInt("id"));
        if (node.parent != null) detachChild(node.parent, node);
        destroyNodeRecursive(node);
    }

    private void insertBefore(JSONObject op) throws Exception {
        RenderNode parent = getNode(op.getInt("parentId"));
        RenderNode child = getNode(op.getInt("childId"));
        RenderNode beforeChild = getNode(op.getInt("beforeChildId"));
        int index = parent.children.indexOf(beforeChild);
        attachChild(parent, child, index);
    }

    private void insertInRootBefore(JSONObject op) throws Exception {
        RenderNode child = getNode(op.getInt("childId"));
        RenderNode beforeChild = getNode(op.getInt("beforeChildId"));
        int index = surfaceNode.children.indexOf(beforeChild);
        attachChild(surfaceNode, child, index);
    }

    private boolean opRequiresLayout(JSONObject op) {
        String kind = op.optString("op", "");
        if ("updateProps".equals(kind)) return propsAffectLayout(op.optJSONObject("props"));
        if ("startNativeAnimation".equals(kind) || "stopNativeAnimation".equals(kind)) return false;
        return true;
    }

    private boolean propsAffectLayout(JSONObject props) {
        if (props == null) return false;
        String[] keys = {"display", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "flex", "flexGrow", "flexShrink", "flexBasis", "flexDirection", "justifyContent", "alignItems", "alignSelf", "alignContent", "flexWrap", "overflow", "position", "top", "bottom", "left", "right", "start", "end", "margin", "marginHorizontal", "marginVertical", "marginLeft", "marginTop", "marginRight", "marginBottom", "marginStart", "marginEnd", "padding", "paddingHorizontal", "paddingVertical", "paddingLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingStart", "paddingEnd", "borderWidth", "borderLeftWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderStartWidth", "borderEndWidth", "gap", "rowGap", "columnGap", "aspectRatio", "text", "textSizeSp", "maxLines", "minLines", "lines", "singleLine", "lineSpacingExtra", "lineSpacingMultiplier", "maxLength"};
        for (String key : keys) if (props.has(key)) return true;
        return false;
    }

    private void startNativeAnimation(JSONObject op) throws Exception {
        int animationId = op.getInt("animationId");
        stopNativeAnimation(animationId);
        RenderNode node = getNode(op.getInt("nodeId"));
        if (node.view == null) return;
        JSONArray tracks = op.optJSONArray("tracks");
        if (tracks == null || tracks.length() == 0) return;
        long duration = Math.max(0, op.optLong("duration", 300));
        long delay = Math.max(0, op.optLong("delay", 0));
        ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(duration);
        animator.setStartDelay(delay);
        animator.setInterpolator(parseAnimationInterpolator(op.optString("type", "timing"), op.optString("easing", "easeInOut")));
        animator.addUpdateListener(valueAnimator -> {
            float progress = (float) valueAnimator.getAnimatedValue();
            try {
                for (int i = 0; i < tracks.length(); i++) {
                    JSONObject track = tracks.getJSONObject(i);
                    String property = track.optString("property", "");
                    float from = (float) track.optDouble("from", 0);
                    float to = (float) track.optDouble("to", from);
                    applyNativeAnimatedValue(node.view, property, from + ((to - from) * progress));
                }
                node.view.invalidate();
            } catch (Exception e) {
                Log.e(TAG, "Failed applying native animation frame", e);
            }
        });
        animator.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                runningNativeAnimations.remove(animationId);
                nativeAnimationNodes.remove(animationId);
            }

            @Override
            public void onAnimationCancel(Animator animation) {
                runningNativeAnimations.remove(animationId);
                nativeAnimationNodes.remove(animationId);
            }
        });
        runningNativeAnimations.put(animationId, animator);
        nativeAnimationNodes.put(animationId, node.id);
        animator.start();
    }

    private void stopNativeAnimation(JSONObject op) {
        stopNativeAnimation(op.optInt("animationId", -1));
    }

    private void stopNativeAnimation(int animationId) {
        Animator animator = runningNativeAnimations.remove(animationId);
        nativeAnimationNodes.remove(animationId);
        if (animator != null) animator.cancel();
    }

    private void stopNativeAnimationsForNode(int nodeId) {
        List<Integer> ids = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : nativeAnimationNodes.entrySet()) if (entry.getValue() == nodeId) ids.add(entry.getKey());
        for (Integer id : ids) stopNativeAnimation(id);
    }

    private void applyNativeAnimatedValue(View view, String property, float value) {
        switch (property) {
            case "alpha":
            case "opacity":
                view.setAlpha(value);
                break;
            case "translationX":
            case "translateX":
                view.setTranslationX(value);
                break;
            case "translationY":
            case "translateY":
                view.setTranslationY(value);
                break;
            case "translationZ":
            case "translateZ":
                view.setTranslationZ(value);
                break;
            case "scale":
                view.setScaleX(value);
                view.setScaleY(value);
                break;
            case "scaleX":
                view.setScaleX(value);
                break;
            case "scaleY":
                view.setScaleY(value);
                break;
            case "rotation":
                view.setRotation(value);
                break;
            case "rotationX":
                view.setRotationX(value);
                break;
            case "rotationY":
                view.setRotationY(value);
                break;
            case "elevation":
                view.setElevation(value);
                break;
        }
    }

    private TimeInterpolator parseAnimationInterpolator(String type, String easing) {
        if ("spring".equalsIgnoreCase(type)) return new OvershootInterpolator(1.15f);
        if ("linear".equalsIgnoreCase(easing)) return new LinearInterpolator();
        if ("easein".equalsIgnoreCase(easing) || "ease_in".equalsIgnoreCase(easing)) return new AccelerateInterpolator();
        if ("easeout".equalsIgnoreCase(easing) || "ease_out".equalsIgnoreCase(easing)) return new DecelerateInterpolator();
        if ("bounce".equalsIgnoreCase(easing)) return new BounceInterpolator();
        return new AccelerateDecelerateInterpolator();
    }

    private RenderNode getNode(int id) {
        RenderNode node = nodes.get(id);
        if (node == null) throw new IllegalStateException("Missing node " + id);
        return node;
    }

    private void attachChild(RenderNode parent, RenderNode child, int requestedIndex) throws Exception {
        if (child.parent != null) detachChild(child.parent, child);
        int index = requestedIndex < 0 || requestedIndex > parent.children.size() ? parent.children.size() : requestedIndex;
        parent.children.add(index, child);
        child.parent = parent;
        if (child.isRawText) {
            rebuildTextChildren(parent);
            dirtyIfNeeded(parent);
            return;
        }
        if (parent.yogaNode != null && parent.yogaNode.isMeasureDefined()) rebuildYogaNode(parent);
        if (parent.yogaNode != null && child.yogaNode != null) parent.yogaNode.addChildAt(child.yogaNode, countYogaChildrenBefore(parent, index));
        addChildViewToAndroidParent(parent, child, countViewChildrenBefore(parent, index));
        if (child.view instanceof ImageView) maybeLoadImageForView(child);

        RenderNode radioGroup = findNearestRadioGroup(parent);
        if (radioGroup != null) syncRadioGroup(radioGroup);
    }

    private void detachChild(RenderNode parent, RenderNode child) {
        int index = parent.children.indexOf(child);
        if (index < 0) return;
        if (!child.isRawText && parent.yogaNode != null && child.yogaNode != null) {
            int yogaIndex = countYogaChildrenBefore(parent, index);
            if (yogaIndex >= 0 && yogaIndex < parent.yogaNode.getChildCount()) parent.yogaNode.removeChildAt(yogaIndex);
        }
        if (child.isRawText) {
            rebuildTextChildren(parent);
            dirtyIfNeeded(parent);
        } else if (child.view != null) {
            detachFromParent(child.view);
        }
        parent.children.remove(index);
        child.parent = null;

        RenderNode radioGroup = findNearestRadioGroup(parent);
        if (radioGroup != null) syncRadioGroup(radioGroup);
    }

    private int countYogaChildrenBefore(RenderNode parent, int childIndexExclusive) {
        int count = 0;
        for (int i = 0; i < childIndexExclusive; i++) if (!parent.children.get(i).isRawText) count++;
        return count;
    }

    private int countViewChildrenBefore(RenderNode parent, int childIndexExclusive) {
        int count = 0;
        for (int i = 0; i < childIndexExclusive; i++)
            if (!parent.children.get(i).isRawText && parent.children.get(i).view != null) count++;
        return count;
    }

    private void rebuildTextChildren(RenderNode parent) {
        if (!(parent.view instanceof TextView textView)) return;
        StringBuilder builder = new StringBuilder();
        for (RenderNode child : parent.children) if (child.isRawText && child.text != null) builder.append(child.text);
        String text = builder.toString();
        Log.d(TAG, "rebuildTextChildren parent=" + parent.id + " type=" + parent.type + " text=" + text);
        textView.setText(text);
        dirtyIfNeeded(parent);
    }

    private void addChildViewToAndroidParent(RenderNode parent, RenderNode child, int index) {
        if (child.view == null) return;
        ViewGroup androidParent = getAndroidChildrenHost(parent);
        if (androidParent == null) return;
        detachFromParent(child.view);
        int safeIndex = Math.max(0, Math.min(index, androidParent.getChildCount()));
        androidParent.addView(child.view, safeIndex, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
    }

    private ViewGroup getAndroidChildrenHost(RenderNode node) {
        if (node == surfaceNode) return surfaceView;
        if (node.view instanceof YogaLayoutView layoutView) return layoutView;
        if (node.view instanceof YogaScrollContainer scrollContainer) return scrollContainer.contentView;
        if (node.view instanceof YogaHorizontalScrollContainer scrollContainer) return scrollContainer.contentView;
        return null;
    }

    private YogaNode createYogaNode(RenderNode node) {
        YogaNode yogaNode = YogaNodeFactory.create(yogaConfig);
        yogaNode.setData(node);
        applyYogaStyle(yogaNode, node.props != null ? node.props : new JSONObject());
        if (shouldUseMeasureFunction(node)) yogaNode.setMeasureFunction(LEAF_MEASURE_FUNCTION);
        return yogaNode;
    }

    private void rebuildYogaNode(RenderNode node) {
        if (node.isRawText) return;

        YogaNode oldYogaNode = node.yogaNode;
        YogaNode newYogaNode = createYogaNode(node);

        if (oldYogaNode != null) {
            while (oldYogaNode.getChildCount() > 0) oldYogaNode.removeChildAt(oldYogaNode.getChildCount() - 1);
        }

        for (RenderNode child : node.children) {
            if (!child.isRawText && child.yogaNode != null) {
                newYogaNode.addChildAt(child.yogaNode, newYogaNode.getChildCount());
            }
        }

        node.yogaNode = newYogaNode;

        if (node.parent != null && node.parent.yogaNode != null && oldYogaNode != null) {
            int index = countYogaChildrenBefore(node.parent, node.parent.children.indexOf(node));
            if (index >= 0 && index < node.parent.yogaNode.getChildCount()) {
                node.parent.yogaNode.removeChildAt(index);
            }
            node.parent.yogaNode.addChildAt(newYogaNode, index);
        }
    }

    private boolean shouldUseMeasureFunction(RenderNode node) {
        if (node.isRawText || node.view == null) return false;
        if (node.view instanceof YogaLayoutView) return false;
        if (node.view instanceof YogaScrollContainer) return false;
        if (node.view instanceof YogaHorizontalScrollContainer) return false;
        if (hasNonRawTextChildren(node)) return false;
        return true;
    }

    private boolean hasNonRawTextChildren(RenderNode node) {
        for (RenderNode child : node.children) {
            if (!child.isRawText) return true;
        }
        return false;
    }

    private void dirtyIfNeeded(RenderNode node) {
        if (node == null || node.yogaNode == null) return;
        if (!node.yogaNode.isMeasureDefined()) return;
        node.yogaNode.dirty();
    }

    private View createViewForType(RenderNode node) {
        switch (node.type) {
            case "View":
            case "PlainView":
            case "FrameLayout":
            case "RelativeLayout":
            case "LinearLayout":
                return new YogaLayoutView(context, this, node);
            case "ScrollView":
                return new YogaScrollContainer(context, this, node);
            case "HorizontalScrollView":
                return new YogaHorizontalScrollContainer(context, this, node);
            case "Text":
            case "TextView":
                return new TextView(context);
            case "EditText":
                return new EditText(context);
            case "Button":
                return new Button(context);
            case "Image":
            case "ImageView":
                return new ImageView(context);
            case "ImageButton":
                return new ImageButton(context);
            case "ProgressBar":
                return new ProgressBar(context);
            case "ProgressBarHorizontal":
                return new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
            case "SeekBar":
                return new SeekBar(context);
            case "Switch":
                return new Switch(context);
            case "CheckBox":
                return new CheckBox(context);
            case "RadioButton":
                return new RadioButton(context);
            case "RadioGroup":
                return new YogaLayoutView(context, this, node);
            case "ToggleButton":
                return new ToggleButton(context);
            case "Space":
                return new Space(context);
            default:
                Log.w(TAG, "Unknown Yoga node type " + node.type);
                return new YogaLayoutView(context, this, node);
        }
    }

    private void requestLayoutPass() {
        surfaceView.requestLayout();
        surfaceView.invalidate();
        hostRoot.requestLayout();
        hostRoot.invalidate();

        mainHandler.post(() -> {
            surfaceView.requestLayout();
            surfaceView.invalidate();
            hostRoot.requestLayout();
            hostRoot.invalidate();
        });
    }

    private void calculateRootYogaLayout(int widthMeasureSpec, int heightMeasureSpec) {
        float availableWidth = toYogaAvailableSize(widthMeasureSpec);
        float availableHeight = toYogaAvailableSize(heightMeasureSpec);
        surfaceNode.yogaNode.calculateLayout(availableWidth, availableHeight);
    }

    private float toYogaAvailableSize(int measureSpec) {
        int mode = View.MeasureSpec.getMode(measureSpec);
        if (mode == View.MeasureSpec.UNSPECIFIED) return YogaConstants.UNDEFINED;
        return View.MeasureSpec.getSize(measureSpec);
    }

    private void measureChildrenForNode(RenderNode node) {
        for (RenderNode child : node.children) {
            if (child.isRawText || child.view == null || child.yogaNode == null) continue;
            int width = Math.max(0, Math.round(child.yogaNode.getLayoutWidth()));
            int height = Math.max(0, Math.round(child.yogaNode.getLayoutHeight()));
            child.view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY));
        }
    }

    private int computeContentWidth(RenderNode node) {
        int max = 0;
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, computeMaxRight(child));
        }
        return max;
    }

    private int computeContentHeight(RenderNode node) {
        int max = 0;
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, computeMaxBottom(child));
        }
        return max;
    }

    private int computeMaxRight(RenderNode node) {
        if (node.yogaNode == null) return 0;
        int max = Math.round(node.yogaNode.getLayoutX() + node.yogaNode.getLayoutWidth());
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, Math.round(node.yogaNode.getLayoutX()) + computeMaxRightRelative(child));
        }
        return max;
    }

    private int computeMaxBottom(RenderNode node) {
        if (node.yogaNode == null) return 0;
        int max = Math.round(node.yogaNode.getLayoutY() + node.yogaNode.getLayoutHeight());
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, Math.round(node.yogaNode.getLayoutY()) + computeMaxBottomRelative(child));
        }
        return max;
    }

    private int computeMaxRightRelative(RenderNode node) {
        if (node.yogaNode == null) return 0;
        int max = Math.round(node.yogaNode.getLayoutX() + node.yogaNode.getLayoutWidth());
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, Math.round(node.yogaNode.getLayoutX()) + computeMaxRightRelative(child));
        }
        return max;
    }

    private int computeMaxBottomRelative(RenderNode node) {
        if (node.yogaNode == null) return 0;
        int max = Math.round(node.yogaNode.getLayoutY() + node.yogaNode.getLayoutHeight());
        for (RenderNode child : node.children) {
            if (child.isRawText || child.yogaNode == null) continue;
            max = Math.max(max, Math.round(node.yogaNode.getLayoutY()) + computeMaxBottomRelative(child));
        }
        return max;
    }

    private void layoutChildrenForNode(RenderNode node) {
        for (RenderNode child : node.children) {
            if (child.isRawText || child.view == null || child.yogaNode == null) continue;
            int left = Math.round(child.yogaNode.getLayoutX());
            int top = Math.round(child.yogaNode.getLayoutY());
            int right = left + Math.round(child.yogaNode.getLayoutWidth());
            int bottom = top + Math.round(child.yogaNode.getLayoutHeight());
            child.view.layout(left, top, right, bottom);
            child.yogaNode.markLayoutSeen();
        }
    }

    private long measureLeaf(RenderNode node, float width, YogaMeasureMode widthMode, float height, YogaMeasureMode heightMode) {
        if (node.view == null) return YogaMeasureOutput.make(0, 0);
        int widthSpec = makeMeasureSpec(width, widthMode);
        int heightSpec = makeMeasureSpec(height, heightMode);
        node.view.measure(widthSpec, heightSpec);
        return YogaMeasureOutput.make(node.view.getMeasuredWidth(), node.view.getMeasuredHeight());
    }

    private int makeMeasureSpec(float size, YogaMeasureMode mode) {
        int rounded = YogaConstants.isUndefined(size) ? 0 : Math.max(0, Math.round(size));
        if (mode == YogaMeasureMode.EXACTLY) return View.MeasureSpec.makeMeasureSpec(rounded, View.MeasureSpec.EXACTLY);
        if (mode == YogaMeasureMode.AT_MOST) return View.MeasureSpec.makeMeasureSpec(rounded, View.MeasureSpec.AT_MOST);
        return View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED);
    }

    private void applyYogaStyle(YogaNode yogaNode, JSONObject props) {
        if (props == null) return;
        if (props.has("direction")) yogaNode.setDirection(parseYogaDirection(props.optString("direction", "")));
        if (props.has("display")) yogaNode.setDisplay(parseYogaDisplay(props.optString("display", "")));
        if (props.has("flexDirection"))
            yogaNode.setFlexDirection(parseYogaFlexDirection(props.optString("flexDirection", "")));
        if (props.has("justifyContent"))
            yogaNode.setJustifyContent(parseYogaJustify(props.optString("justifyContent", "")));
        if (props.has("alignItems")) yogaNode.setAlignItems(parseYogaAlign(props.optString("alignItems", "")));
        if (props.has("alignSelf")) yogaNode.setAlignSelf(parseYogaAlign(props.optString("alignSelf", "")));
        if (props.has("alignContent")) yogaNode.setAlignContent(parseYogaAlign(props.optString("alignContent", "")));
        if (props.has("flexWrap")) yogaNode.setWrap(parseYogaWrap(props.optString("flexWrap", "")));
        if (props.has("overflow")) yogaNode.setOverflow(parseYogaOverflow(props.optString("overflow", "")));
        if (props.has("position")) yogaNode.setPositionType(parseYogaPositionType(props.optString("position", "")));
        if (props.has("flex")) yogaNode.setFlex((float) parseDouble(props.opt("flex"), 0));
        if (props.has("flexGrow")) yogaNode.setFlexGrow((float) parseDouble(props.opt("flexGrow"), 0));
        if (props.has("flexShrink")) yogaNode.setFlexShrink((float) parseDouble(props.opt("flexShrink"), 0));
        if (props.has("aspectRatio")) yogaNode.setAspectRatio((float) parseDouble(props.opt("aspectRatio"), 0));
        if (props.has("gap")) yogaNode.setGap(YogaGutter.ALL, parseYogaPoint(props.opt("gap"), 0));
        if (props.has("rowGap")) yogaNode.setGap(YogaGutter.ROW, parseYogaPoint(props.opt("rowGap"), 0));
        if (props.has("columnGap")) yogaNode.setGap(YogaGutter.COLUMN, parseYogaPoint(props.opt("columnGap"), 0));
        applyYogaDimension(yogaNode, "width", props.opt("width"));
        applyYogaDimension(yogaNode, "height", props.opt("height"));
        applyYogaDimension(yogaNode, "minWidth", props.opt("minWidth"));
        applyYogaDimension(yogaNode, "minHeight", props.opt("minHeight"));
        applyYogaDimension(yogaNode, "maxWidth", props.opt("maxWidth"));
        applyYogaDimension(yogaNode, "maxHeight", props.opt("maxHeight"));
        applyYogaFlexBasis(yogaNode, props.opt("flexBasis"));
        applyYogaEdges(yogaNode, props, "margin", "marginHorizontal", "marginVertical", "marginLeft", "marginTop", "marginRight", "marginBottom", "marginStart", "marginEnd", EdgeSetter.MARGIN);
        applyYogaEdges(yogaNode, props, "padding", "paddingHorizontal", "paddingVertical", "paddingLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingStart", "paddingEnd", EdgeSetter.PADDING);
        applyYogaEdges(yogaNode, props, null, null, null, "left", "top", "right", "bottom", "start", "end", EdgeSetter.POSITION);
        if (props.has("borderWidth")) applyYogaBorderWidth(yogaNode, YogaEdge.ALL, props.opt("borderWidth"));
        if (props.has("borderLeftWidth")) applyYogaBorderWidth(yogaNode, YogaEdge.LEFT, props.opt("borderLeftWidth"));
        if (props.has("borderTopWidth")) applyYogaBorderWidth(yogaNode, YogaEdge.TOP, props.opt("borderTopWidth"));
        if (props.has("borderRightWidth"))
            applyYogaBorderWidth(yogaNode, YogaEdge.RIGHT, props.opt("borderRightWidth"));
        if (props.has("borderBottomWidth"))
            applyYogaBorderWidth(yogaNode, YogaEdge.BOTTOM, props.opt("borderBottomWidth"));
        if (props.has("borderStartWidth"))
            applyYogaBorderWidth(yogaNode, YogaEdge.START, props.opt("borderStartWidth"));
        if (props.has("borderEndWidth")) applyYogaBorderWidth(yogaNode, YogaEdge.END, props.opt("borderEndWidth"));
    }

    private void applyYogaDimension(YogaNode yogaNode, String key, Object raw) {
        if (raw == null || raw == JSONObject.NULL) return;
        YogaLength length = parseYogaLength(raw);
        switch (key) {
            case "width":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.WIDTH);
                break;
            case "height":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.HEIGHT);
                break;
            case "minWidth":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.MIN_WIDTH);
                break;
            case "minHeight":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.MIN_HEIGHT);
                break;
            case "maxWidth":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.MAX_WIDTH);
                break;
            case "maxHeight":
                applyYogaLengthToDimension(yogaNode, length, DimensionSetter.MAX_HEIGHT);
                break;
        }
    }

    private void applyYogaFlexBasis(YogaNode yogaNode, Object raw) {
        if (raw == null || raw == JSONObject.NULL) return;
        YogaLength length = parseYogaLength(raw);
        if (length.unit == YogaLengthUnit.AUTO) yogaNode.setFlexBasisAuto();
        else if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setFlexBasisPercent(length.value);
        else yogaNode.setFlexBasis(length.value);
    }

    private void applyYogaEdges(YogaNode yogaNode, JSONObject props, String allKey, String horizontalKey, String verticalKey, String leftKey, String topKey, String rightKey, String bottomKey, String startKey, String endKey, EdgeSetter setter) {
        if (allKey != null && props.has(allKey)) applyYogaEdge(yogaNode, YogaEdge.ALL, props.opt(allKey), setter);
        if (horizontalKey != null && props.has(horizontalKey)) {
            applyYogaEdge(yogaNode, YogaEdge.HORIZONTAL, props.opt(horizontalKey), setter);
        }
        if (verticalKey != null && props.has(verticalKey)) {
            applyYogaEdge(yogaNode, YogaEdge.VERTICAL, props.opt(verticalKey), setter);
        }
        if (leftKey != null && props.has(leftKey)) applyYogaEdge(yogaNode, YogaEdge.LEFT, props.opt(leftKey), setter);
        if (topKey != null && props.has(topKey)) applyYogaEdge(yogaNode, YogaEdge.TOP, props.opt(topKey), setter);
        if (rightKey != null && props.has(rightKey))
            applyYogaEdge(yogaNode, YogaEdge.RIGHT, props.opt(rightKey), setter);
        if (bottomKey != null && props.has(bottomKey))
            applyYogaEdge(yogaNode, YogaEdge.BOTTOM, props.opt(bottomKey), setter);
        if (startKey != null && props.has(startKey))
            applyYogaEdge(yogaNode, YogaEdge.START, props.opt(startKey), setter);
        if (endKey != null && props.has(endKey)) applyYogaEdge(yogaNode, YogaEdge.END, props.opt(endKey), setter);
    }

    private void applyYogaEdge(YogaNode yogaNode, YogaEdge edge, Object raw, EdgeSetter setter) {
        if (raw == null || raw == JSONObject.NULL) return;
        YogaLength length = parseYogaLength(raw);
        switch (setter) {
            case MARGIN:
                if (length.unit == YogaLengthUnit.AUTO) yogaNode.setMarginAuto(edge);
                else if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setMarginPercent(edge, length.value);
                else yogaNode.setMargin(edge, length.value);
                break;
            case PADDING:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setPaddingPercent(edge, length.value);
                else yogaNode.setPadding(edge, length.value);
                break;
            case POSITION:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setPositionPercent(edge, length.value);
                else if (length.unit == YogaLengthUnit.POINT) yogaNode.setPosition(edge, length.value);
                break;
        }
    }

    private void applyYogaBorderWidth(YogaNode yogaNode, YogaEdge edge, Object raw) {
        yogaNode.setBorder(edge, parseYogaPoint(raw, 0));
    }

    private void applyYogaLengthToDimension(YogaNode yogaNode, YogaLength length, DimensionSetter setter) {
        switch (setter) {
            case WIDTH:
                if (length.unit == YogaLengthUnit.AUTO) yogaNode.setWidthAuto();
                else if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setWidthPercent(length.value);
                else yogaNode.setWidth(length.value);
                break;
            case HEIGHT:
                if (length.unit == YogaLengthUnit.AUTO) yogaNode.setHeightAuto();
                else if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setHeightPercent(length.value);
                else yogaNode.setHeight(length.value);
                break;
            case MIN_WIDTH:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setMinWidthPercent(length.value);
                else yogaNode.setMinWidth(length.value);
                break;
            case MIN_HEIGHT:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setMinHeightPercent(length.value);
                else yogaNode.setMinHeight(length.value);
                break;
            case MAX_WIDTH:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setMaxWidthPercent(length.value);
                else yogaNode.setMaxWidth(length.value);
                break;
            case MAX_HEIGHT:
                if (length.unit == YogaLengthUnit.PERCENT) yogaNode.setMaxHeightPercent(length.value);
                else yogaNode.setMaxHeight(length.value);
                break;
        }
    }

    private void applyViewProps(RenderNode node, View view, JSONObject props) throws Exception {
        applyCommonProps(view, props);
        if (view instanceof ViewGroup) applyViewGroupProps((ViewGroup) view, props);
        if (view instanceof ImageView) applyImageViewProps(node, (ImageView) view, props);
        if (view instanceof TextView) applyTextViewProps(node, (TextView) view, props);
        if (view instanceof EditText) applyEditTextProps((EditText) view, props);
        if (view instanceof ProgressBar) applyProgressBarProps((ProgressBar) view, props);
        if (view instanceof SeekBar) applySeekBarProps((SeekBar) view, props);
        if (view instanceof CompoundButton) applyCompoundButtonProps((CompoundButton) view, props);
        if (view instanceof Switch) applySwitchProps((Switch) view, props);
        if (view instanceof RadioGroup) applyRadioGroupProps((RadioGroup) view, props);
        if (view instanceof ToggleButton) applyToggleButtonProps((ToggleButton) view, props);
        if (view instanceof ScrollView) applyScrollViewProps((ScrollView) view, props);
        if (view instanceof HorizontalScrollView) applyHorizontalScrollViewProps((HorizontalScrollView) view, props);
    }

    private void applyEventProps(RenderNode node, View view, JSONObject props) {
        applyCommonEventProps(node, view, props);
        if (view instanceof EditText) applyEditTextEventProps(node, (EditText) view, props);
        if (view instanceof CompoundButton) applyCompoundButtonEventProps(node, (CompoundButton) view, props);
        if (view instanceof SeekBar) applySeekBarEventProps(node, (SeekBar) view, props);
        if (view instanceof ScrollView || view instanceof HorizontalScrollView) applyScrollEventProps(node, view, props);
    }

    private void applyCommonEventProps(RenderNode node, View view, JSONObject props) {
        Integer onPressEventId = getEventId(props, "onPress");
        Integer onClickEventId = getEventId(props, "onClick");
        Integer clickEventId = onPressEventId != null ? onPressEventId : onClickEventId;
        String clickEventName = onPressEventId != null ? "onPress" : "onClick";
        if (clickEventId != null) {
            view.setOnClickListener(v -> {
                if (isDispatchSuppressed(node.id)) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("x", v.getX());
                    payload.put("y", v.getY());
                    sendEventToNode(node.id, clickEventName, clickEventId, payload);
                } catch (Exception ignored) { }
            });
            view.setClickable(true);
        } else {
            view.setOnClickListener(null);
            if (getEventId(props, "onPressIn") == null && getEventId(props, "onPressOut") == null) view.setClickable(false);
        }

        Integer onLongPressEventId = getEventId(props, "onLongPress");
        Integer onLongClickEventId = getEventId(props, "onLongClick");
        Integer longClickEventId = onLongPressEventId != null ? onLongPressEventId : onLongClickEventId;
        String longClickEventName = onLongPressEventId != null ? "onLongPress" : "onLongClick";
        if (longClickEventId != null) {
            view.setOnLongClickListener(v -> {
                if (isDispatchSuppressed(node.id)) return false;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("x", v.getX());
                    payload.put("y", v.getY());
                    sendEventToNode(node.id, longClickEventName, longClickEventId, payload);
                } catch (Exception ignored) { }
                return true;
            });
            view.setLongClickable(true);
        } else {
            view.setOnLongClickListener(null);
            view.setLongClickable(false);
        }

        Integer onPressInEventId = getEventId(props, "onPressIn");
        Integer onPressOutEventId = getEventId(props, "onPressOut");
        if (onPressInEventId != null || onPressOutEventId != null) {
            view.setClickable(true);
            view.setOnTouchListener(new View.OnTouchListener() {
                private boolean pressed = false;

                @Override
                public boolean onTouch(View v, android.view.MotionEvent event) {
                    if (isDispatchSuppressed(node.id)) return false;
                    try {
                        int action = event.getActionMasked();
                        if (action == android.view.MotionEvent.ACTION_DOWN) {
                            pressed = true;
                            if (onPressInEventId != null) {
                                JSONObject payload = basePayload(node.id);
                                payload.put("x", event.getX());
                                payload.put("y", event.getY());
                                payload.put("pageX", event.getRawX());
                                payload.put("pageY", event.getRawY());
                                sendEventToNode(node.id, "onPressIn", onPressInEventId, payload);
                            }
                        } else if (action == android.view.MotionEvent.ACTION_UP || action == android.view.MotionEvent.ACTION_CANCEL) {
                            if (pressed && onPressOutEventId != null) {
                                JSONObject payload = basePayload(node.id);
                                payload.put("x", event.getX());
                                payload.put("y", event.getY());
                                payload.put("pageX", event.getRawX());
                                payload.put("pageY", event.getRawY());
                                sendEventToNode(node.id, "onPressOut", onPressOutEventId, payload);
                            }
                            pressed = false;
                        }
                    } catch (Exception ignored) { }
                    return false;
                }
            });
        } else {
            view.setOnTouchListener(null);
        }

        Integer onFocusEventId = getEventId(props, "onFocus");
        Integer onBlurEventId = getEventId(props, "onBlur");
        if (onFocusEventId != null || onBlurEventId != null) {
            view.setOnFocusChangeListener((v, hasFocus) -> {
                if (isDispatchSuppressed(node.id)) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("hasFocus", hasFocus);
                    if (hasFocus && onFocusEventId != null) sendEventToNode(node.id, "onFocus", onFocusEventId, payload);
                    if (!hasFocus && onBlurEventId != null) sendEventToNode(node.id, "onBlur", onBlurEventId, payload);
                } catch (Exception ignored) { }
            });
        } else {
            view.setOnFocusChangeListener(null);
        }
    }

    private void applyEditTextEventProps(RenderNode node, EditText view, JSONObject props) {
        TextWatcher existingWatcher = textWatchers.remove(node.id);
        if (existingWatcher != null) view.removeTextChangedListener(existingWatcher);
        Integer onChangeTextEventId = getEventId(props, "onChangeText");
        if (onChangeTextEventId != null) {
            TextWatcher watcher = new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) { }

                @Override
                public void afterTextChanged(Editable s) { }

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    if (isDispatchSuppressed(node.id)) return;
                    try {
                        String text = String.valueOf(s);
                        lastNativeEditTextValues.put(node.id, text);
                        JSONObject payload = basePayload(node.id);
                        payload.put("text", text);
                        sendEventToNode(node.id, "onChangeText", onChangeTextEventId, payload);
                    } catch (Exception ignored) { }
                }
            };
            view.addTextChangedListener(watcher);
            textWatchers.put(node.id, watcher);
        }
        Integer onSubmitEditingEventId = getEventId(props, "onSubmitEditing");
        if (onSubmitEditingEventId != null) {
            view.setOnEditorActionListener((v, actionId, event) -> {
                if (isDispatchSuppressed(node.id)) return false;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("text", v.getText() != null ? v.getText().toString() : "");
                    payload.put("actionId", actionId);
                    sendEventToNode(node.id, "onSubmitEditing", onSubmitEditingEventId, payload);
                } catch (Exception ignored) { }
                return false;
            });
        } else {
            view.setOnEditorActionListener(null);
        }
    }

    private void applyCompoundButtonEventProps(RenderNode node, CompoundButton view, JSONObject props) {
        Integer onValueChangeEventId = getEventId(props, "onValueChange");
        if (onValueChangeEventId != null) {
            view.setOnCheckedChangeListener((buttonView, isChecked) -> {
                if (isDispatchSuppressed(node.id)) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("checked", isChecked);
                    payload.put("value", isChecked);
                    sendEventToNode(node.id, "onValueChange", onValueChangeEventId, payload);
                } catch (Exception ignored) {
                }
            });
        } else {
            view.setOnCheckedChangeListener(null);
        }
    }

    private void applySeekBarEventProps(RenderNode node, SeekBar view, JSONObject props) {
        Integer onValueChangeEventId = getEventId(props, "onValueChange");
        Integer onSlidingStartEventId = getEventId(props, "onSlidingStart");
        Integer onSlidingCompleteEventId = getEventId(props, "onSlidingComplete");
        if (onValueChangeEventId == null && onSlidingStartEventId == null && onSlidingCompleteEventId == null) {
            view.setOnSeekBarChangeListener(null);
            activelyDraggingSeekBars.remove(node.id);
            lastNativeSeekBarValues.remove(node.id);
            return;
        }
        view.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) lastNativeSeekBarValues.put(node.id, progress);
                if (isDispatchSuppressed(node.id) || onValueChangeEventId == null) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("value", progress);
                    payload.put("fromUser", fromUser);
                    sendEventToNode(node.id, "onValueChange", onValueChangeEventId, payload);
                } catch (Exception ignored) { }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
                activelyDraggingSeekBars.add(node.id);
                lastNativeSeekBarValues.put(node.id, seekBar.getProgress());
                if (isDispatchSuppressed(node.id) || onSlidingStartEventId == null) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("value", seekBar.getProgress());
                    sendEventToNode(node.id, "onSlidingStart", onSlidingStartEventId, payload);
                } catch (Exception ignored) { }
            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                activelyDraggingSeekBars.remove(node.id);
                lastNativeSeekBarValues.put(node.id, seekBar.getProgress());
                if (isDispatchSuppressed(node.id) || onSlidingCompleteEventId == null) return;
                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("value", seekBar.getProgress());
                    sendEventToNode(node.id, "onSlidingComplete", onSlidingCompleteEventId, payload);
                } catch (Exception ignored) { }
            }
        });
    }

    private void applyScrollEventProps(RenderNode node, View view, JSONObject props) {
        Integer onScrollEventId = getEventId(props, "onScroll");
        if (onScrollEventId != null) {
            view.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
                if (isDispatchSuppressed(node.id)) return;

                try {
                    JSONObject payload = basePayload(node.id);
                    payload.put("x", scrollX);
                    payload.put("y", scrollY);
                    payload.put("oldX", oldScrollX);
                    payload.put("oldY", oldScrollY);
                    sendEventToNode(node.id, "onScroll", onScrollEventId, payload);
                } catch (Exception ignored) {
                }
            });
        } else {
            view.setOnScrollChangeListener(null);
        }
    }

    private RenderNode findNearestRadioGroup(RenderNode node) {
        RenderNode current = node;
        while (current != null) {
            if ("RadioGroup".equals(current.type)) return current;
            current = current.parent;
        }
        return null;
    }

    private void collectRadioButtonNodes(RenderNode node, List<RenderNode> out) {
        for (RenderNode child : node.children) {
            if ("RadioButton".equals(child.type) && child.view instanceof RadioButton) out.add(child);
            collectRadioButtonNodes(child, out);
        }
    }

    private void syncRadioGroup(RenderNode groupNode) {
        if (groupNode == null) return;
        Integer onValueChangeEventId = getEventId(groupNode.props, "onValueChange");
        Object checkedRaw = groupNode.props.opt("checkedId");
        Integer checkedNodeId = checkedRaw instanceof Number ? ((Number) checkedRaw).intValue() : null;

        List<RenderNode> radios = new ArrayList<>();
        collectRadioButtonNodes(groupNode, radios);

        for (RenderNode radioNode : radios) {
            if (!(radioNode.view instanceof RadioButton radio)) continue;

            withSuppressedEventsQuietly(radioNode.id, () -> radio.setChecked(checkedNodeId != null && checkedNodeId == radioNode.id));

            radio.setOnClickListener(v -> {
                try {
                    for (RenderNode other : radios) {
                        if (other.view instanceof RadioButton otherRadio) withSuppressedEventsQuietly(other.id, () -> otherRadio.setChecked(other == radioNode));
                    }

                    if (onValueChangeEventId != null) {
                        JSONObject payload = basePayload(groupNode.id);
                        payload.put("checkedId", radioNode.id);
                        payload.put("value", radioNode.id);
                        sendEventToNode(groupNode.id, "onValueChange", onValueChangeEventId, payload);
                    }
                } catch (Exception ignored) { }
            });
        }
    }

    private void withSuppressedEventsQuietly(int nodeId, ThrowingRunnable runnable) {
        try {
            withSuppressedEvents(nodeId, runnable);
        } catch (Exception ignored) { }
    }

    private void applyCommonProps(View view, JSONObject props) {
        if (props.has("visibility")) view.setVisibility(parseVisibility(props.opt("visibility")));
        if (props.has("enabled")) view.setEnabled(parseBoolean(props.opt("enabled"), view.isEnabled()));
        if (props.has("clickable")) view.setClickable(parseBoolean(props.opt("clickable"), view.isClickable()));
        if (props.has("longClickable"))
            view.setLongClickable(parseBoolean(props.opt("longClickable"), view.isLongClickable()));
        if (props.has("focusable")) view.setFocusable(parseBoolean(props.opt("focusable"), view.isFocusable()));
        if (props.has("focusableInTouchMode"))
            view.setFocusableInTouchMode(parseBoolean(props.opt("focusableInTouchMode"), view.isFocusableInTouchMode()));
        if (props.has("selected")) view.setSelected(parseBoolean(props.opt("selected"), view.isSelected()));
        if (props.has("activated")) view.setActivated(parseBoolean(props.opt("activated"), view.isActivated()));
        if (props.has("duplicateParentStateEnabled"))
            view.setDuplicateParentStateEnabled(parseBoolean(props.opt("duplicateParentStateEnabled"), view.isDuplicateParentStateEnabled()));
        if (props.has("hapticFeedbackEnabled"))
            view.setHapticFeedbackEnabled(parseBoolean(props.opt("hapticFeedbackEnabled"), view.isHapticFeedbackEnabled()));
        if (props.has("soundEffectsEnabled"))
            view.setSoundEffectsEnabled(parseBoolean(props.opt("soundEffectsEnabled"), view.isSoundEffectsEnabled()));
        if (props.has("alpha")) view.setAlpha((float) parseDouble(props.opt("alpha"), view.getAlpha()));
        if (props.has("rotation")) view.setRotation((float) parseDouble(props.opt("rotation"), view.getRotation()));
        if (props.has("rotationX")) view.setRotationX((float) parseDouble(props.opt("rotationX"), view.getRotationX()));
        if (props.has("rotationY")) view.setRotationY((float) parseDouble(props.opt("rotationY"), view.getRotationY()));
        if (props.has("scaleX")) view.setScaleX((float) parseDouble(props.opt("scaleX"), view.getScaleX()));
        if (props.has("scaleY")) view.setScaleY((float) parseDouble(props.opt("scaleY"), view.getScaleY()));
        if (props.has("translationX"))
            view.setTranslationX(parseYogaPoint(props.opt("translationX"), Math.round(view.getTranslationX())));
        if (props.has("translationY"))
            view.setTranslationY(parseYogaPoint(props.opt("translationY"), Math.round(view.getTranslationY())));
        if (props.has("translationZ"))
            view.setTranslationZ(parseYogaPoint(props.opt("translationZ"), Math.round(view.getTranslationZ())));
        if (props.has("elevation"))
            view.setElevation(parseYogaPoint(props.opt("elevation"), Math.round(view.getElevation())));
        if (props.has("minimumWidth"))
            view.setMinimumWidth(parseYogaPoint(props.opt("minimumWidth"), view.getMinimumWidth()));
        if (props.has("minimumHeight"))
            view.setMinimumHeight(parseYogaPoint(props.opt("minimumHeight"), view.getMinimumHeight()));
        if (props.has("contentDescription")) view.setContentDescription(props.optString("contentDescription", null));
        if (props.has("keepScreenOn"))
            view.setKeepScreenOn(parseBoolean(props.opt("keepScreenOn"), view.getKeepScreenOn()));
        if (props.has("fitsSystemWindows"))
            view.setFitsSystemWindows(parseBoolean(props.opt("fitsSystemWindows"), view.getFitsSystemWindows()));
        if (props.has("clipToOutline"))
            view.setClipToOutline(parseBoolean(props.opt("clipToOutline"), view.getClipToOutline()));
        if (props.has("tag")) view.setTag(String.valueOf(props.opt("tag")));
        if (props.has("textAlignment")) view.setTextAlignment(parseTextAlignment(props.optString("textAlignment", "")));
        if (props.has("backgroundColor") || props.has("borderRadius") || props.has("borderWidth") || props.has("borderColor") || props.has("borderTopLeftRadius") || props.has("borderTopRightRadius") || props.has("borderBottomLeftRadius") || props.has("borderBottomRightRadius"))
            applyBackgroundProps(view, props);
        applyPadding(view, props);
    }

    private void applyBackgroundProps(View view, JSONObject props) {
        Integer color = props.has("backgroundColor") ? parseColor(props.opt("backgroundColor")) : null;
        Integer borderColor = props.has("borderColor") ? parseColor(props.opt("borderColor")) : null;
        int borderWidth = props.has("borderWidth") ? parseYogaPoint(props.opt("borderWidth"), 0) : 0;
        int radius = props.has("borderRadius") ? parseYogaPoint(props.opt("borderRadius"), 0) : 0;
        boolean hasPerCornerRadius = props.has("borderTopLeftRadius") || props.has("borderTopRightRadius") || props.has("borderBottomLeftRadius") || props.has("borderBottomRightRadius");
        if (color == null && radius <= 0 && borderWidth <= 0 && !hasPerCornerRadius) return;
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(color != null ? color : Color.TRANSPARENT);
        if (hasPerCornerRadius) {
            float topLeft = props.has("borderTopLeftRadius") ? parseYogaPoint(props.opt("borderTopLeftRadius"), radius) : radius;
            float topRight = props.has("borderTopRightRadius") ? parseYogaPoint(props.opt("borderTopRightRadius"), radius) : radius;
            float bottomRight = props.has("borderBottomRightRadius") ? parseYogaPoint(props.opt("borderBottomRightRadius"), radius) : radius;
            float bottomLeft = props.has("borderBottomLeftRadius") ? parseYogaPoint(props.opt("borderBottomLeftRadius"), radius) : radius;
            drawable.setCornerRadii(new float[]{topLeft, topLeft, topRight, topRight, bottomRight, bottomRight, bottomLeft, bottomLeft});
        } else if (radius > 0) {
            drawable.setCornerRadius(radius);
        }
        if (borderWidth > 0) drawable.setStroke(borderWidth, borderColor != null ? borderColor : Color.TRANSPARENT);
        view.setBackground(drawable);
    }

    private void applyPadding(View view, JSONObject props) {
        boolean hasAnyPadding = props.has("padding") || props.has("paddingHorizontal") || props.has("paddingVertical") || props.has("paddingLeft") || props.has("paddingTop") || props.has("paddingRight") || props.has("paddingBottom") || props.has("paddingStart") || props.has("paddingEnd");
        if (!hasAnyPadding) return;
        int all = parseYogaPoint(props.opt("padding"), -1);
        int horizontal = parseYogaPoint(props.opt("paddingHorizontal"), -1);
        int vertical = parseYogaPoint(props.opt("paddingVertical"), -1);
        int start = props.has("paddingStart") ? parseYogaPoint(props.opt("paddingStart"), view.getPaddingStart()) : (horizontal >= 0 ? horizontal : (all >= 0 ? all : view.getPaddingStart()));
        int top = props.has("paddingTop") ? parseYogaPoint(props.opt("paddingTop"), view.getPaddingTop()) : (vertical >= 0 ? vertical : (all >= 0 ? all : view.getPaddingTop()));
        int end = props.has("paddingEnd") ? parseYogaPoint(props.opt("paddingEnd"), view.getPaddingEnd()) : (horizontal >= 0 ? horizontal : (all >= 0 ? all : view.getPaddingEnd()));
        int bottom = props.has("paddingBottom") ? parseYogaPoint(props.opt("paddingBottom"), view.getPaddingBottom()) : (vertical >= 0 ? vertical : (all >= 0 ? all : view.getPaddingBottom()));
        int left = props.has("paddingLeft") ? parseYogaPoint(props.opt("paddingLeft"), view.getPaddingLeft()) : start;
        int right = props.has("paddingRight") ? parseYogaPoint(props.opt("paddingRight"), view.getPaddingRight()) : end;
        view.setPaddingRelative(start, top, end, bottom);
        if (props.has("paddingLeft") || props.has("paddingRight")) view.setPadding(left, top, right, bottom);
    }

    private void applyViewGroupProps(ViewGroup view, JSONObject props) {
        if (props.has("clipChildren"))
            view.setClipChildren(parseBoolean(props.opt("clipChildren"), view.getClipChildren()));
        if (props.has("clipToPadding"))
            view.setClipToPadding(parseBoolean(props.opt("clipToPadding"), view.getClipToPadding()));
    }

    private void applyTextViewProps(RenderNode node, TextView view, JSONObject props) {
        if (props.has("text") && node.children.isEmpty()) {
            String newText = String.valueOf(props.opt("text"));
            String currentText = view.getText() != null ? view.getText().toString() : "";

            if (view instanceof EditText editText) {
                String lastNativeText = lastNativeEditTextValues.get(node.id);
                boolean isFocused = editText.hasFocus();

                if (isFocused && lastNativeText != null && !Objects.equals(newText, currentText)) {
                    if (!Objects.equals(newText, lastNativeText)) {
                        return;
                    }
                }

                if (!Objects.equals(currentText, newText)) {
                    int selectionStart = -1;
                    int selectionEnd = -1;
                    try {
                        selectionStart = editText.getSelectionStart();
                        selectionEnd = editText.getSelectionEnd();
                    } catch (Exception ignored) { }

                    editText.setText(newText);

                    try {
                        int textLength = editText.getText() != null ? editText.getText().length() : 0;
                        int safeStart = Math.max(0, Math.min(selectionStart, textLength));
                        int safeEnd = Math.max(0, Math.min(selectionEnd, textLength));
                        editText.setSelection(safeStart, safeEnd);
                    } catch (Exception ignored) { }
                }

                if (Objects.equals(newText, lastNativeText)) {
                    lastNativeEditTextValues.remove(node.id);
                }
            } else {
                if (!Objects.equals(currentText, newText)) view.setText(newText);
            }
        }

        if (props.has("textColor")) {
            Integer color = parseColor(props.opt("textColor"));
            if (color != null) view.setTextColor(color);
        }
        if (props.has("hint")) view.setHint(String.valueOf(props.opt("hint")));
        if (props.has("hintColor")) {
            Integer color = parseColor(props.opt("hintColor"));
            if (color != null) view.setHintTextColor(color);
        }
        if (props.has("textSizeSp")) view.setTextSize(TypedValue.COMPLEX_UNIT_SP, (float) parseDouble(props.opt("textSizeSp"), 14));
        if (props.has("gravity")) view.setGravity(parseGravity(props.optString("gravity", "")));
        if (props.has("maxLines")) view.setMaxLines(props.optInt("maxLines", Integer.MAX_VALUE));
        if (props.has("minLines")) view.setMinLines(props.optInt("minLines", 1));
        if (props.has("lines")) view.setLines(props.optInt("lines", 1));
        if (props.has("singleLine")) view.setSingleLine(parseBoolean(props.opt("singleLine"), false));
        if (props.has("allCaps")) view.setAllCaps(parseBoolean(props.opt("allCaps"), false));
        if (props.has("includeFontPadding")) view.setIncludeFontPadding(parseBoolean(props.opt("includeFontPadding"), true));
        if (props.has("letterSpacing")) view.setLetterSpacing((float) parseDouble(props.opt("letterSpacing"), view.getLetterSpacing()));
        if (props.has("lineSpacingExtra") || props.has("lineSpacingMultiplier")) view.setLineSpacing((float) parseDouble(props.opt("lineSpacingExtra"), 0), (float) parseDouble(props.opt("lineSpacingMultiplier"), 1));
        if (props.has("textStyle")) view.setTypeface(view.getTypeface(), parseTextStyle(props.optString("textStyle", "")));
        if (props.has("ellipsize")) view.setEllipsize(parseEllipsize(props.optString("ellipsize", "")));
        if (props.has("textIsSelectable")) view.setTextIsSelectable(parseBoolean(props.opt("textIsSelectable"), false));
        if (props.has("maxLength")) view.setFilters(new InputFilter[]{new InputFilter.LengthFilter(props.optInt("maxLength", Integer.MAX_VALUE))});
        dirtyIfNeeded(node);
    }

    private void applyImageViewProps(RenderNode node, ImageView view, JSONObject props) {
        if (props.has("scaleType")) view.setScaleType(parseScaleType(props.optString("scaleType", "")));
        if (props.has("adjustViewBounds"))
            view.setAdjustViewBounds(parseBoolean(props.opt("adjustViewBounds"), view.getAdjustViewBounds()));
        if (props.has("cropToPadding"))
            view.setCropToPadding(parseBoolean(props.opt("cropToPadding"), view.getCropToPadding()));
        if (props.has("tintColor")) {
            Integer color = parseColor(props.opt("tintColor"));
            if (color != null) view.setImageTintList(ColorStateList.valueOf(color));
        }
        String src = props.has("src") ? props.optString("src", null) : null;
        String oldSrc = appliedImageSources.get(view);
        if (Objects.equals(oldSrc, src)) return;
        if (view.getParent() == null) return;
        appliedImageSources.put(view, src);
        loadImage(node, view, src);
    }

    private void maybeLoadImageForView(RenderNode node) {
        if (!(node.view instanceof ImageView imageView)) return;
        Runnable task = () -> {
            String src = node.props.has("src") ? node.props.optString("src", null) : null;
            String oldSrc = appliedImageSources.get(imageView);
            if (!Objects.equals(oldSrc, src)) {
                appliedImageSources.put(imageView, src);
                loadImage(node, imageView, src);
            }
        };
        if (imageView.isAttachedToWindow()) task.run();
        else imageView.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override
            public void onViewAttachedToWindow(View v) {
                v.removeOnAttachStateChangeListener(this);
                task.run();
            }

            @Override
            public void onViewDetachedFromWindow(View v) {
            }
        });
    }

    private void loadImage(RenderNode node, ImageView view, String src) {
        final int requestId = nextImageRequestId++;
        imageRequestIds.put(view, requestId);
        if (src == null || src.isEmpty()) {
            view.setImageDrawable(null);
            dirtyIfNeeded(node);
            requestLayoutPass();
            return;
        }
        if (src.startsWith("http://") || src.startsWith("https://")) {
            new Thread(() -> {
                try (InputStream stream = new URL(src).openConnection().getInputStream()) {
                    Bitmap bitmap = BitmapFactory.decodeStream(stream);
                    mainHandler.post(() -> {
                        Integer latestId = imageRequestIds.get(view);
                        if (latestId == null || latestId != requestId) return;
                        view.setImageBitmap(bitmap);
                        dirtyIfNeeded(node);
                        requestLayoutPass();
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Failed loading image: " + src, e);
                    mainHandler.post(() -> {
                        Integer latestId = imageRequestIds.get(view);
                        if (latestId == null || latestId != requestId) return;
                        view.setImageDrawable(null);
                        dirtyIfNeeded(node);
                        requestLayoutPass();
                    });
                }
            }).start();
            return;
        }
        try {
            if (src.startsWith("content://") || src.startsWith("file://") || src.startsWith("android.resource://"))
                view.setImageURI(Uri.parse(src));
            else view.setImageBitmap(BitmapFactory.decodeFile(src));
        } catch (Exception e) {
            Log.e(TAG, "Failed loading local image: " + src, e);
            view.setImageDrawable(null);
        }
        dirtyIfNeeded(node);
        requestLayoutPass();
    }

    private void applyEditTextProps(EditText view, JSONObject props) {
        if (props.has("inputType")) view.setInputType(parseInputType(props.opt("inputType")));
        if (props.has("imeOptions")) view.setImeOptions(parseImeOptions(props.opt("imeOptions")));
        if (props.has("selectAllOnFocus")) view.setSelectAllOnFocus(parseBoolean(props.opt("selectAllOnFocus"), false));
        if (props.has("cursorVisible")) view.setCursorVisible(parseBoolean(props.opt("cursorVisible"), true));
    }

    private void applyProgressBarProps(ProgressBar view, JSONObject props) {
        if (props.has("indeterminate"))
            view.setIndeterminate(parseBoolean(props.opt("indeterminate"), view.isIndeterminate()));
        if (props.has("min")) view.setMin(props.optInt("min", view.getMin()));
        if (props.has("max")) view.setMax(props.optInt("max", view.getMax()));
        if (props.has("progress")) view.setProgress(props.optInt("progress", view.getProgress()));
        if (props.has("secondaryProgress"))
            view.setSecondaryProgress(props.optInt("secondaryProgress", view.getSecondaryProgress()));
        if (props.has("progressTintColor")) {
            Integer color = parseColor(props.opt("progressTintColor"));
            if (color != null) view.setProgressTintList(ColorStateList.valueOf(color));
        }
        if (props.has("secondaryProgressTintColor")) {
            Integer color = parseColor(props.opt("secondaryProgressTintColor"));
            if (color != null) view.setSecondaryProgressTintList(ColorStateList.valueOf(color));
        }
        if (props.has("progressBackgroundTintColor")) {
            Integer color = parseColor(props.opt("progressBackgroundTintColor"));
            if (color != null) view.setProgressBackgroundTintList(ColorStateList.valueOf(color));
        }
        if (props.has("indeterminateTintColor")) {
            Integer color = parseColor(props.opt("indeterminateTintColor"));
            if (color != null) view.setIndeterminateTintList(ColorStateList.valueOf(color));
        }
    }

    private void applySeekBarProps(SeekBar view, JSONObject props) {
        Integer nodeId = null;
        RenderNode renderNode = nodesByView.get(view);
        if (renderNode != null) nodeId = renderNode.id;

        if (props.has("min")) view.setMin(props.optInt("min", view.getMin()));

        if (props.has("progress")) {
            int newProgress = props.optInt("progress", view.getProgress());
            int currentProgress = view.getProgress();

            if (nodeId != null) {
                Integer lastNativeProgress = lastNativeSeekBarValues.get(nodeId);
                boolean isDragging = activelyDraggingSeekBars.contains(nodeId);

                if (isDragging && lastNativeProgress != null && newProgress != currentProgress) {
                    if (newProgress != lastNativeProgress) return;
                }

                if (newProgress != currentProgress) view.setProgress(newProgress);

                if (lastNativeProgress != null && newProgress == lastNativeProgress) {
                    lastNativeSeekBarValues.remove(nodeId);
                }
            } else {
                if (newProgress != currentProgress) view.setProgress(newProgress);
            }
        }

        if (props.has("thumbTintColor")) {
            Integer color = parseColor(props.opt("thumbTintColor"));
            if (color != null) view.setThumbTintList(ColorStateList.valueOf(color));
        }
        if (props.has("tickMarkTintColor")) {
            Integer color = parseColor(props.opt("tickMarkTintColor"));
            if (color != null) view.setTickMarkTintList(ColorStateList.valueOf(color));
        }
        if (props.has("splitTrack")) view.setSplitTrack(parseBoolean(props.opt("splitTrack"), view.getSplitTrack()));
    }

    private void applyCompoundButtonProps(CompoundButton view, JSONObject props) {
        if (props.has("checked")) view.setChecked(parseBoolean(props.opt("checked"), view.isChecked()));
        if (props.has("buttonTintColor")) {
            Integer color = parseColor(props.opt("buttonTintColor"));
            if (color != null) view.setButtonTintList(ColorStateList.valueOf(color));
        }
    }

    private void applySwitchProps(Switch view, JSONObject props) {
        if (props.has("textOn")) view.setTextOn(String.valueOf(props.opt("textOn")));
        if (props.has("textOff")) view.setTextOff(String.valueOf(props.opt("textOff")));
        if (props.has("showText")) view.setShowText(parseBoolean(props.opt("showText"), view.getShowText()));
        if (props.has("thumbTintColor")) {
            Integer color = parseColor(props.opt("thumbTintColor"));
            if (color != null) view.setThumbTintList(ColorStateList.valueOf(color));
        }
        if (props.has("trackTintColor")) {
            Integer color = parseColor(props.opt("trackTintColor"));
            if (color != null) view.setTrackTintList(ColorStateList.valueOf(color));
        }
    }

    private void applyRadioGroupProps(RadioGroup view, JSONObject props) {
        if (props.has("checkedId")) {
            Object raw = props.opt("checkedId");
            if (raw == null || raw == JSONObject.NULL) {
                view.clearCheck();
            } else {
                RenderNode checkedNode = nodes.get(((Number) raw).intValue());
                if (checkedNode != null && checkedNode.view != null) view.check(checkedNode.view.getId());
                else view.clearCheck();
            }
        }
    }

    private void applyToggleButtonProps(ToggleButton view, JSONObject props) {
        if (props.has("textOn")) view.setTextOn(String.valueOf(props.opt("textOn")));
        if (props.has("textOff")) view.setTextOff(String.valueOf(props.opt("textOff")));
        if (props.has("disabledAlpha"))
            view.setAlpha((float) parseDouble(props.opt("disabledAlpha"), view.getDisabledAlpha()));
    }

    private void applyScrollViewProps(ScrollView view, JSONObject props) {
        if (props.has("fillViewport"))
            view.setFillViewport(parseBoolean(props.opt("fillViewport"), view.isFillViewport()));
        if (props.has("smoothScrollingEnabled"))
            view.setSmoothScrollingEnabled(parseBoolean(props.opt("smoothScrollingEnabled"), true));
        if (props.has("verticalScrollBarEnabled"))
            view.setVerticalScrollBarEnabled(parseBoolean(props.opt("verticalScrollBarEnabled"), view.isVerticalScrollBarEnabled()));
        if (props.has("horizontalScrollBarEnabled"))
            view.setHorizontalScrollBarEnabled(parseBoolean(props.opt("horizontalScrollBarEnabled"), view.isHorizontalScrollBarEnabled()));
        if (props.has("overScrollMode")) view.setOverScrollMode(parseOverScrollMode(props.opt("overScrollMode")));
    }

    private void applyHorizontalScrollViewProps(HorizontalScrollView view, JSONObject props) {
        if (props.has("fillViewport"))
            view.setFillViewport(parseBoolean(props.opt("fillViewport"), view.isFillViewport()));
        if (props.has("smoothScrollingEnabled"))
            view.setSmoothScrollingEnabled(parseBoolean(props.opt("smoothScrollingEnabled"), true));
        if (props.has("verticalScrollBarEnabled"))
            view.setVerticalScrollBarEnabled(parseBoolean(props.opt("verticalScrollBarEnabled"), view.isVerticalScrollBarEnabled()));
        if (props.has("horizontalScrollBarEnabled"))
            view.setHorizontalScrollBarEnabled(parseBoolean(props.opt("horizontalScrollBarEnabled"), view.isHorizontalScrollBarEnabled()));
        if (props.has("overScrollMode")) view.setOverScrollMode(parseOverScrollMode(props.opt("overScrollMode")));
    }

    private void detachFromParent(View view) {
        if (view.getParent() instanceof ViewGroup parent) parent.removeView(view);
    }

    private void destroyNodeRecursive(RenderNode node) {
        stopNativeAnimationsForNode(node.id);
        List<RenderNode> children = new ArrayList<>(node.children);
        for (RenderNode child : children) {
            child.parent = null;
            destroyNodeRecursive(child);
        }
        cleanupNodeListeners(node);
        if (node.view != null) {
            detachFromParent(node.view);
            nodesByView.remove(node.view);
        }
        nodes.remove(node.id);
    }

    private void cleanupNodeListeners(RenderNode node) {
        suppressedEventNodes.remove(node.id);
        lastNativeEditTextValues.remove(node.id);
        activelyDraggingSeekBars.remove(node.id);
        lastNativeSeekBarValues.remove(node.id);

        if (node.view != null) {
            node.view.setOnClickListener(null);
            node.view.setOnLongClickListener(null);
            node.view.setOnFocusChangeListener(null);
            node.view.setOnScrollChangeListener(null);
            node.view.setOnTouchListener(null);
        }
        if (node.view instanceof CompoundButton compoundButton) compoundButton.setOnCheckedChangeListener(null);
        if (node.view instanceof SeekBar seekBar) seekBar.setOnSeekBarChangeListener(null);
        if (node.view instanceof ImageView imageView) {
            appliedImageSources.remove(imageView);
            imageRequestIds.remove(imageView);
            imageView.setImageDrawable(null);
        }
        if (node.view instanceof EditText editText) {
            TextWatcher watcher = textWatchers.remove(node.id);
            if (watcher != null) editText.removeTextChangedListener(watcher);
            editText.setOnEditorActionListener(null);
        }
    }

    private void sendEventToNode(int targetId, String eventName, int eventId, JSONObject payload) {
        try {
            JSONObject json = new JSONObject();
            json.put("surfaceId", surfaceId);
            json.put("targetId", targetId);
            json.put("eventName", eventName);
            json.put("eventId", eventId);
            json.put("payload", payload != null ? payload : new JSONObject());
            BridgeClient.send("", "event", "react.event", json);
        } catch (Exception e) {
            Log.e(TAG, "Failed sending react event to node", e);
        }
    }

    private Integer getEventId(JSONObject props, String key) {
        try {
            if (!props.has(key)) return null;
            Object raw = props.opt(key);
            if (!(raw instanceof JSONObject obj)) return null;
            if (!"event_handler".equals(obj.optString("__type"))) return null;
            return obj.optInt("id");
        } catch (Exception ignored) {
            return null;
        }
    }

    private void withSuppressedEvents(int nodeId, ThrowingRunnable runnable) throws Exception {
        suppressedEventNodes.add(nodeId);
        try {
            runnable.run();
        } finally {
            suppressedEventNodes.remove(nodeId);
        }
    }

    private boolean isDispatchSuppressed(int nodeId) {
        return suppressedEventNodes.contains(nodeId);
    }

    private JSONObject basePayload(int targetId) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("targetId", targetId);
        return payload;
    }

    private JSONObject copyJson(JSONObject json) throws Exception {
        return json != null ? new JSONObject(json.toString()) : new JSONObject();
    }

    private JSONObject mergeJson(JSONObject base, JSONObject update) throws Exception {
        JSONObject merged = copyJson(base);
        if (update == null) return merged;
        Iterator<String> keys = update.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = update.get(key);
            if (value == JSONObject.NULL) merged.remove(key);
            else merged.put(key, value);
        }
        return merged;
    }

    private boolean parseBoolean(Object value, boolean fallback) {
        if (value == null || value == JSONObject.NULL) return fallback;
        if (value instanceof Boolean bool) return bool;
        return "true".equalsIgnoreCase(String.valueOf(value));
    }

    private double parseDouble(Object value, double fallback) {
        try {
            if (value == null || value == JSONObject.NULL) return fallback;
            if (value instanceof Number number) return number.doubleValue();
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private Integer parseColor(Object value) {
        try {
            if (value == null || value == JSONObject.NULL) return null;
            if (value instanceof Number number) return number.intValue();
            return Color.parseColor(String.valueOf(value));
        } catch (Exception e) {
            Log.w(TAG, "Failed to parse color " + value);
            return null;
        }
    }

    private int parseVisibility(Object value) {
        String text = String.valueOf(value).toLowerCase();
        if ("gone".equals(text)) return View.GONE;
        if ("invisible".equals(text)) return View.INVISIBLE;
        return View.VISIBLE;
    }

    private int parseOverScrollMode(Object value) {
        String text = String.valueOf(value).toLowerCase();
        if ("always".equals(text)) return View.OVER_SCROLL_ALWAYS;
        if ("never".equals(text)) return View.OVER_SCROLL_NEVER;
        return View.OVER_SCROLL_IF_CONTENT_SCROLLS;
    }

    private int parseTextAlignment(String value) {
        switch (value.toLowerCase()) {
            case "center":
                return View.TEXT_ALIGNMENT_CENTER;
            case "textstart":
            case "start":
                return View.TEXT_ALIGNMENT_TEXT_START;
            case "textend":
            case "end":
                return View.TEXT_ALIGNMENT_TEXT_END;
            case "viewstart":
                return View.TEXT_ALIGNMENT_VIEW_START;
            case "viewend":
                return View.TEXT_ALIGNMENT_VIEW_END;
            default:
                return View.TEXT_ALIGNMENT_INHERIT;
        }
    }

    private int parseGravity(String value) {
        if (value == null || value.isEmpty()) return Gravity.NO_GRAVITY;
        int gravity = 0;
        for (String rawPart : value.toLowerCase().split("\\|")) {
            switch (rawPart.trim()) {
                case "center":
                    gravity |= Gravity.CENTER;
                    break;
                case "center_horizontal":
                case "centerhorizontal":
                    gravity |= Gravity.CENTER_HORIZONTAL;
                    break;
                case "center_vertical":
                case "centervertical":
                    gravity |= Gravity.CENTER_VERTICAL;
                    break;
                case "start":
                    gravity |= Gravity.START;
                    break;
                case "end":
                    gravity |= Gravity.END;
                    break;
                case "left":
                    gravity |= Gravity.LEFT;
                    break;
                case "right":
                    gravity |= Gravity.RIGHT;
                    break;
                case "top":
                    gravity |= Gravity.TOP;
                    break;
                case "bottom":
                    gravity |= Gravity.BOTTOM;
                    break;
            }
        }
        return gravity;
    }

    private int parseTextStyle(String value) {
        if (value == null || value.isEmpty()) return android.graphics.Typeface.NORMAL;
        int style = android.graphics.Typeface.NORMAL;
        for (String rawPart : value.toLowerCase().split("\\|")) {
            String part = rawPart.trim();
            if ("bold".equals(part)) style |= android.graphics.Typeface.BOLD;
            if ("italic".equals(part)) style |= android.graphics.Typeface.ITALIC;
        }
        return style;
    }

    private TextUtils.TruncateAt parseEllipsize(String value) {
        switch (value.toLowerCase()) {
            case "start":
                return TextUtils.TruncateAt.START;
            case "middle":
                return TextUtils.TruncateAt.MIDDLE;
            case "marquee":
                return TextUtils.TruncateAt.MARQUEE;
            case "end":
            default:
                return TextUtils.TruncateAt.END;
        }
    }

    private int parseInputType(Object value) {
        if (value instanceof Number number) return number.intValue();
        if (value == null || value == JSONObject.NULL) return InputType.TYPE_CLASS_TEXT;
        int result = 0;
        for (String rawPart : String.valueOf(value).toLowerCase().split("\\|")) {
            switch (rawPart.trim()) {
                case "text":
                    result |= InputType.TYPE_CLASS_TEXT;
                    break;
                case "textmultiline":
                case "multiline":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE;
                    break;
                case "textpassword":
                case "password":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD;
                    break;
                case "email":
                    result |= InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
                    break;
                case "number":
                    result |= InputType.TYPE_CLASS_NUMBER;
                    break;
                case "decimal":
                    result |= InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL;
                    break;
                case "phone":
                    result |= InputType.TYPE_CLASS_PHONE;
                    break;
            }
        }
        return result != 0 ? result : InputType.TYPE_CLASS_TEXT;
    }

    private int parseImeOptions(Object value) {
        if (value instanceof Number number) return number.intValue();
        if (value == null || value == JSONObject.NULL) return 0;
        int result = 0;
        for (String rawPart : String.valueOf(value).toLowerCase().split("\\|")) {
            switch (rawPart.trim()) {
                case "actiondone":
                case "done":
                    result |= EditorInfo.IME_ACTION_DONE;
                    break;
                case "actiongo":
                case "go":
                    result |= EditorInfo.IME_ACTION_GO;
                    break;
                case "actionnext":
                case "next":
                    result |= EditorInfo.IME_ACTION_NEXT;
                    break;
                case "actionsearch":
                case "search":
                    result |= EditorInfo.IME_ACTION_SEARCH;
                    break;
                case "actionsend":
                case "send":
                    result |= EditorInfo.IME_ACTION_SEND;
                    break;
            }
        }
        return result;
    }

    private ImageView.ScaleType parseScaleType(String value) {
        switch (value.toLowerCase()) {
            case "centercrop":
            case "center_crop":
                return ImageView.ScaleType.CENTER_CROP;
            case "fitcenter":
            case "fit_center":
                return ImageView.ScaleType.FIT_CENTER;
            case "fitxy":
            case "fit_xy":
                return ImageView.ScaleType.FIT_XY;
            case "center":
                return ImageView.ScaleType.CENTER;
            case "centerinside":
            case "center_inside":
                return ImageView.ScaleType.CENTER_INSIDE;
            case "fitstart":
            case "fit_start":
                return ImageView.ScaleType.FIT_START;
            case "fitend":
            case "fit_end":
                return ImageView.ScaleType.FIT_END;
            case "matrix":
                return ImageView.ScaleType.MATRIX;
            default:
                return ImageView.ScaleType.FIT_CENTER;
        }
    }

    private YogaFlexDirection parseYogaFlexDirection(String value) {
        switch (value.toLowerCase()) {
            case "row":
                return YogaFlexDirection.ROW;
            case "row_reverse":
            case "row-reverse":
            case "rowreverse":
                return YogaFlexDirection.ROW_REVERSE;
            case "column_reverse":
            case "column-reverse":
            case "columnreverse":
                return YogaFlexDirection.COLUMN_REVERSE;
            case "column":
            default:
                return YogaFlexDirection.COLUMN;
        }
    }

    private YogaJustify parseYogaJustify(String value) {
        switch (value.toLowerCase()) {
            case "center":
                return YogaJustify.CENTER;
            case "flex_end":
            case "flex-end":
            case "end":
                return YogaJustify.FLEX_END;
            case "space_between":
            case "space-between":
                return YogaJustify.SPACE_BETWEEN;
            case "space_around":
            case "space-around":
                return YogaJustify.SPACE_AROUND;
            case "space_evenly":
            case "space-evenly":
                return YogaJustify.SPACE_EVENLY;
            case "flex_start":
            case "flex-start":
            default:
                return YogaJustify.FLEX_START;
        }
    }

    private YogaAlign parseYogaAlign(String value) {
        switch (value.toLowerCase()) {
            case "auto":
                return YogaAlign.AUTO;
            case "center":
                return YogaAlign.CENTER;
            case "flex_end":
            case "flex-end":
            case "end":
                return YogaAlign.FLEX_END;
            case "stretch":
                return YogaAlign.STRETCH;
            case "baseline":
                return YogaAlign.BASELINE;
            case "space_between":
            case "space-between":
                return YogaAlign.SPACE_BETWEEN;
            case "space_around":
            case "space-around":
                return YogaAlign.SPACE_AROUND;
            case "space_evenly":
            case "space-evenly":
                return YogaAlign.SPACE_EVENLY;
            case "flex_start":
            case "flex-start":
            case "start":
            default:
                return YogaAlign.FLEX_START;
        }
    }

    private YogaWrap parseYogaWrap(String value) {
        switch (value.toLowerCase()) {
            case "wrap":
                return YogaWrap.WRAP;
            case "wrap_reverse":
            case "wrap-reverse":
                return YogaWrap.WRAP_REVERSE;
            case "nowrap":
            case "no_wrap":
            default:
                return YogaWrap.NO_WRAP;
        }
    }

    private YogaOverflow parseYogaOverflow(String value) {
        switch (value.toLowerCase()) {
            case "hidden":
                return YogaOverflow.HIDDEN;
            case "scroll":
                return YogaOverflow.SCROLL;
            case "visible":
            default:
                return YogaOverflow.VISIBLE;
        }
    }

    private YogaDisplay parseYogaDisplay(String value) {
        switch (value.toLowerCase()) {
            case "none":
                return YogaDisplay.NONE;
            case "flex":
            default:
                return YogaDisplay.FLEX;
        }
    }

    private YogaDirection parseYogaDirection(String value) {
        switch (value.toLowerCase()) {
            case "rtl":
                return YogaDirection.RTL;
            case "ltr":
                return YogaDirection.LTR;
            case "inherit":
            default:
                return YogaDirection.INHERIT;
        }
    }

    private YogaPositionType parseYogaPositionType(String value) {
        switch (value.toLowerCase()) {
            case "absolute":
                return YogaPositionType.ABSOLUTE;
            case "static":
                try {
                    return YogaPositionType.valueOf("STATIC");
                } catch (Throwable ignored) {
                    return YogaPositionType.RELATIVE;
                }
            case "relative":
            default:
                return YogaPositionType.RELATIVE;
        }
    }

    private int parseYogaPoint(Object value, int fallback) {
        YogaLength length = parseYogaLength(value);
        return length.unit == YogaLengthUnit.POINT ? Math.round(length.value) : fallback;
    }

    private YogaLength parseYogaLength(Object value) {
        if (value == null || value == JSONObject.NULL)
            return new YogaLength(YogaLengthUnit.UNDEFINED, YogaConstants.UNDEFINED);
        if (value instanceof Number number) return new YogaLength(YogaLengthUnit.POINT, dp(number.floatValue()));
        String text = String.valueOf(value).trim().toLowerCase();
        if (text.isEmpty() || "undefined".equals(text))
            return new YogaLength(YogaLengthUnit.UNDEFINED, YogaConstants.UNDEFINED);
        if ("auto".equals(text)) return new YogaLength(YogaLengthUnit.AUTO, YogaConstants.UNDEFINED);
        if (text.endsWith("%"))
            return new YogaLength(YogaLengthUnit.PERCENT, Float.parseFloat(text.substring(0, text.length() - 1)));
        if (text.endsWith("dp"))
            return new YogaLength(YogaLengthUnit.POINT, dp(Float.parseFloat(text.substring(0, text.length() - 2))));
        if (text.endsWith("sp"))
            return new YogaLength(YogaLengthUnit.POINT, sp(Float.parseFloat(text.substring(0, text.length() - 2))));
        if (text.endsWith("px"))
            return new YogaLength(YogaLengthUnit.POINT, Float.parseFloat(text.substring(0, text.length() - 2)));
        return new YogaLength(YogaLengthUnit.POINT, dp(Float.parseFloat(text)));
    }

    private int dp(float value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, context.getResources().getDisplayMetrics()));
    }

    private int sp(float value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, value, context.getResources().getDisplayMetrics()));
    }

    private enum DimensionSetter {WIDTH, HEIGHT, MIN_WIDTH, MIN_HEIGHT, MAX_WIDTH, MAX_HEIGHT}

    private enum EdgeSetter {MARGIN, PADDING, POSITION}

    private enum YogaLengthUnit {POINT, PERCENT, AUTO, UNDEFINED}

    private static class YogaLength {
        final YogaLengthUnit unit;
        final float value;

        YogaLength(YogaLengthUnit unit, float value) {
            this.unit = unit;
            this.value = value;
        }
    }

    private static class RenderNode {
        final ScriptViewHost host;
        final int id;
        final String type;
        JSONObject props = new JSONObject();
        RenderNode parent;
        final List<RenderNode> children = new ArrayList<>();
        YogaNode yogaNode;
        View view;
        boolean isRawText;
        String text = "";

        RenderNode(ScriptViewHost host, int id, String type) {
            this.host = host;
            this.id = id;
            this.type = type;
        }
    }

    private static class YogaRootLayout extends YogaLayoutView {
        YogaRootLayout(Context context, ScriptViewHost host, RenderNode node) {
            super(context, host, node);
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            host.calculateRootYogaLayout(widthMeasureSpec, heightMeasureSpec);
            host.measureChildrenForNode(node);
            int measuredWidth = View.MeasureSpec.getMode(widthMeasureSpec) == View.MeasureSpec.UNSPECIFIED ? host.computeContentWidth(node) : View.MeasureSpec.getSize(widthMeasureSpec);
            int measuredHeight = View.MeasureSpec.getMode(heightMeasureSpec) == View.MeasureSpec.UNSPECIFIED ? host.computeContentHeight(node) : View.MeasureSpec.getSize(heightMeasureSpec);
            setMeasuredDimension(measuredWidth, measuredHeight);
        }
    }

    private static class YogaLayoutView extends ViewGroup {
        final ScriptViewHost host;
        final RenderNode node;

        YogaLayoutView(Context context, ScriptViewHost host, RenderNode node) {
            super(context);
            this.host = host;
            this.node = node;
            setClipChildren(false);
            setClipChildren(false);
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            host.measureChildrenForNode(node);

            int measuredWidth = node.yogaNode != null ? Math.max(0, Math.round(node.yogaNode.getLayoutWidth())) : View.MeasureSpec.getSize(widthMeasureSpec);
            int measuredHeight = node.yogaNode != null ? Math.max(0, Math.round(node.yogaNode.getLayoutHeight())) : View.MeasureSpec.getSize(heightMeasureSpec);

            setMeasuredDimension(measuredWidth, measuredHeight);
        }

        @Override
        protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
            host.layoutChildrenForNode(node);
        }
    }

    private static class YogaScrollContentView extends ViewGroup {
        final ScriptViewHost host;
        final RenderNode ownerNode;

        YogaScrollContentView(Context context, ScriptViewHost host, RenderNode ownerNode) {
            super(context);
            this.host = host;
            this.ownerNode = ownerNode;
            setClipChildren(false);
            setClipToPadding(false);
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            host.measureChildrenForNode(ownerNode);
            setMeasuredDimension(host.computeContentWidth(ownerNode), host.computeContentHeight(ownerNode));
        }

        @Override
        protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
            host.layoutChildrenForNode(ownerNode);
        }
    }

    private static class YogaScrollContainer extends ScrollView {
        final ScriptViewHost host;
        final RenderNode node;
        final YogaScrollContentView contentView;

        YogaScrollContainer(Context context, ScriptViewHost host, RenderNode node) {
            super(context);
            this.host = host;
            this.node = node;
            this.contentView = new YogaScrollContentView(context, host, node);
            setClipChildren(false);
            setClipToPadding(false);
            addView(contentView, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            int viewportWidth = View.MeasureSpec.getSize(widthMeasureSpec);
            int viewportHeight = View.MeasureSpec.getSize(heightMeasureSpec);

            for (RenderNode child : node.children) {
                if (child.isRawText || child.yogaNode == null) continue;
                child.yogaNode.calculateLayout(viewportWidth, YogaConstants.UNDEFINED);
            }

            host.measureChildrenForNode(node);

            int contentWidth = Math.max(viewportWidth, host.computeContentWidth(node));
            int contentHeight = Math.max(viewportHeight, host.computeContentHeight(node));

            contentView.measure(View.MeasureSpec.makeMeasureSpec(contentWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(contentHeight, View.MeasureSpec.EXACTLY));
            setMeasuredDimension(viewportWidth, viewportHeight);
        }
    }

    private static class YogaHorizontalScrollContainer extends HorizontalScrollView {
        final ScriptViewHost host;
        final RenderNode node;
        final YogaScrollContentView contentView;

        YogaHorizontalScrollContainer(Context context, ScriptViewHost host, RenderNode node) {
            super(context);
            this.host = host;
            this.node = node;
            this.contentView = new YogaScrollContentView(context, host, node);
            setClipChildren(false);
            setClipToPadding(false);
            addView(contentView, new LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT));
        }

        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            int viewportWidth = View.MeasureSpec.getSize(widthMeasureSpec);
            int viewportHeight = View.MeasureSpec.getSize(heightMeasureSpec);

            for (RenderNode child : node.children) {
                if (child.isRawText || child.yogaNode == null) continue;
                child.yogaNode.calculateLayout(YogaConstants.UNDEFINED, viewportHeight);
            }

            host.measureChildrenForNode(node);

            int contentWidth = Math.max(viewportWidth, host.computeContentWidth(node));
            int contentHeight = Math.max(viewportHeight, host.computeContentHeight(node));

            contentView.measure(View.MeasureSpec.makeMeasureSpec(contentWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(contentHeight, View.MeasureSpec.EXACTLY));
            setMeasuredDimension(viewportWidth, viewportHeight);
        }

        @Override
        protected void onScrollChanged(int l, int t, int oldl, int oldt) {
            super.onScrollChanged(l, t, oldl, oldt);
            Log.d("SpotifyPlus", "HSV scrollX=" + l + " max=" + Math.max(0, contentView.getMeasuredWidth() - getWidth()) + " contentWidth=" + contentView.getMeasuredWidth() + " viewportWidth=" + getWidth());
        }
    }

    private interface ThrowingRunnable {
        void run() throws Exception;
    }

    private Integer findNodeIdByAndroidViewId(int androidViewId) {
        if (androidViewId == View.NO_ID) return null;
        for (Map.Entry<Integer, RenderNode> entry : nodes.entrySet()) {
            RenderNode node = entry.getValue();
            if (node.view != null && node.view.getId() == androidViewId) return entry.getKey();
        }
        return null;
    }

    private void forceLayoutNow() {
        int width = hostRoot.getWidth();
        int height = hostRoot.getHeight();

        if (width <= 0 || height <= 0) {
            hostRoot.post(this::forceLayoutNow);
            return;
        }

        int widthSpec = View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY);
        int heightSpec = View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY);

        surfaceView.measure(widthSpec, heightSpec);
        surfaceView.layout(0, 0, width, height);
        surfaceView.invalidate();
    }

    public void dispose() {
        if (surfaceView.getParent() instanceof ViewGroup parent) {
            parent.removeView(surfaceView);
        }

        for (Animator animator : new ArrayList<>(runningNativeAnimations.values())) animator.cancel();
        runningNativeAnimations.clear();
        nativeAnimationNodes.clear();
        nodes.clear();
        nodesByView.clear();
        textWatchers.clear();
        suppressedEventNodes.clear();
    }
}