package com.lenerd46.spotifyplus;

import android.content.Context;
import android.content.res.Resources;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;

import androidx.recyclerview.widget.RecyclerView;
import de.robv.android.xposed.XposedBridge;

import java.util.Locale;

public final class ViewTreeDumper {
    private static final String TAG = "SpotifyPlusDumper";

    private ViewTreeDumper() {}

    public static void dump(View root, int maxDepth) {
        try {
            StringBuilder sb = new StringBuilder(16_384);
            sb.append("===== VIEW TREE DUMP START =====\n");
            dumpInternal(root, sb, 0, maxDepth);
            sb.append("===== VIEW TREE DUMP END =====\n");
            XposedBridge.log("[SpotifyPlus] " + sb.toString());
        } catch (Throwable t) {
            XposedBridge.log("[SpotifyPlus] Dump failed");
            XposedBridge.log(t);
        }
    }

    private static void dumpInternal(View v, StringBuilder out, int depth, int maxDepth) {
        if (v == null) return;
        if (depth > maxDepth) return;

        indent(out, depth);

        // Class
        out.append(v.getClass().getName());

        // id + id name
        int id = v.getId();
        out.append(" id=");
        out.append(id == View.NO_ID ? "NO_ID" : String.format(Locale.US, "0x%08X", id));
        String idName = safeIdName(v, id);
        if (idName != null) out.append(" (").append(idName).append(")");

        // size/pos + visibility
        out.append(" vis=").append(visToString(v.getVisibility()));
        out.append(" alpha=").append(trimFloat(v.getAlpha()));
        out.append(" shown=").append(v.isShown());
        out.append(" enabled=").append(v.isEnabled());
        out.append(" clickable=").append(v.isClickable());
        out.append(" longClickable=").append(v.isLongClickable());

        // bounds
        out.append(" bounds=[")
                .append(v.getLeft()).append(",").append(v.getTop())
                .append("-")
                .append(v.getRight()).append(",").append(v.getBottom())
                .append("]");

        // Special flags / hints
        out.append(" ");
        out.append(typeHints(v));

        out.append("\n");

        if (v instanceof ViewGroup) {
            ViewGroup vg = (ViewGroup) v;
            int count = vg.getChildCount();
            for (int i = 0; i < count; i++) {
                View child = vg.getChildAt(i);
                dumpInternal(child, out, depth + 1, maxDepth);
            }
        }
    }

    private static String typeHints(View v) {
        String n = v.getClass().getName();

        // Keep these as string contains so it works even if you don't compile against Spotify classes.
        if (n.contains("com.spotify.encoreconsumermobile.elements.artwork.ArtworkView")) return "[ARTWORK_VIEW]";
        if (n.contains("com.spotify.encore.image.EncoreImageView")) return "[ENCORE_IMAGE]";
        if (n.contains("android.widget.ImageView") || n.contains("AppCompatImageView")) return "[IMAGE]";
        if (n.contains("androidx.compose.ui.platform.ComposeView")) return "[COMPOSE]";
        if (v instanceof RecyclerView) return "[RECYCLER_VIEW]";
        if (n.contains("com.spotify.nowplaying.carousel.CarouselView")) return "[CAROUSEL_VIEW]";
        if (n.contains("com.spotify.nowplaying.scroll.view.PeekScrollView")) return "[PEEK_SCROLL]";
        if (n.contains("RoundedConstraintLayout")) return "[ROUNDED_LAYOUT]";
        return "";
    }

    private static void indent(StringBuilder out, int depth) {
        for (int i = 0; i < depth; i++) out.append("  ");
    }

    private static String safeIdName(View v, int id) {
        if (id == View.NO_ID) return null;
        try {
            Context c = v.getContext();
            if (c == null) return null;
            Resources r = c.getResources();
            if (r == null) return null;
            return r.getResourceName(id);
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static String visToString(int vis) {
        switch(vis) {
            case View.VISIBLE:
                return "V";
            case View.INVISIBLE:
                return "I";
            case View.GONE:
                return "G";
            default:
                return String.valueOf(vis);
        }
    }

    private static String trimFloat(float f) {
        // Keep logs readable
        if (Math.abs(f - Math.round(f)) < 0.0001f) return Integer.toString(Math.round(f));
        return String.format(Locale.US, "%.3f", f);
    }
}
