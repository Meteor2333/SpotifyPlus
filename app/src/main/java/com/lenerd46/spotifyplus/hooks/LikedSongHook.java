package com.lenerd46.spotifyplus.hooks;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.lenerd46.spotifyplus.References;
import com.lenerd46.spotifyplus.SpotifyTrack;

import java.util.Collections;
import java.util.Set;
import java.util.WeakHashMap;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class LikedSongHook extends SpotifyHook {
    private static final Set<Class<?>> hookedInvoke = Collections.newSetFromMap(new WeakHashMap<>());

    private static final ThreadLocal<Long> ADD_CLICK_UNTIL_MS =
            ThreadLocal.withInitial(() -> 0L);

    private static boolean inAddClickWindow() {
        return System.currentTimeMillis() < ADD_CLICK_UNTIL_MS.get();
    }

    @Override
    protected void hook() {
        XposedBridge.hookAllMethods(LayoutInflater.class, "inflate", new XC_MethodHook() {
            @Override
            protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                // inflate(...) has multiple overloads; sometimes arg0 isn't an int.
                if (!(param.args[0] instanceof Integer)) return;

                LayoutInflater inflater = (LayoutInflater) param.thisObject;
                Context ctx = inflater.getContext();

                int layoutId = (Integer) param.args[0];
                String layoutName = "0x" + Integer.toHexString(layoutId);
                try {
                    layoutName = ctx.getResources().getResourceName(layoutId);
                } catch (Throwable ignored) {
                }

                if (!layoutName.endsWith("layout/peek_scroll_view")) return;

                // com.spotify.music:id/cwp_header_artwork_background
                View root = (View) param.getResult();

                root.post(() -> {
//                    View button = findByIdName(root, "com.spotify.music:id/add_to_button");
//                    button.setVisibility(View.INVISIBLE);

//                    XposedBridge.log("[SpotifyPlus] ==== DUMP square_cover_art_content root=" + root.getClass().getName() + " id=" + idName(root) + " layoutName= " + finalLayoutName + " ====");
//                    dumpTree(root, 0);
//                    XposedBridge.log("[SpotifyPlus] ==== END DUMP ====");
                });
            }
        });

        XposedHelpers.findAndHookMethod("com.spotify.player.model.AutoValue_ContextTrack$Builder", lpparm.classLoader, "build", new XC_MethodHook() {
            @Override
            protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                Object result = param.getResult();
                SpotifyTrack track = References.getTrackTitle(lpparm, bridge);

                if (track == null) return;

//                XposedBridge.log("[SpotifyPlus] " + track.title + " | " + track.saved);
            }
        });

        XposedBridge.hookAllConstructors(XposedHelpers.findClass("okhttp3.Request", lpparm.classLoader), new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                String url = param.args[0].toString();

                if(url.toLowerCase().contains("events")) {
                    param.setResult(null);
                }
            }
        });
    }

    private String idName(View v) {
        int id = v.getId();
        if (id == View.NO_ID) return "no-id";
        try {
            return v.getContext().getResources().getResourceName(id);
        } catch (Throwable t) {
            return "0x" + Integer.toHexString(id);
        }
    }

    private void dumpTree(View v, int depth) {
        StringBuilder indent = new StringBuilder();
        for (int i = 0; i < depth; i++) indent.append("  ");

        int w = v.getWidth();
        int h = v.getHeight();

        XposedBridge.log("[SpotifyPlus][tree] " + indent
                + v.getClass().getName()
                + " id=" + idName(v)
                + " wh=" + w + "x" + h
                + " vis=" + v.getVisibility());

        if (v instanceof ViewGroup) {
            ViewGroup vg = (ViewGroup) v;

            for (int i = 0; i < vg.getChildCount(); i++) {
                dumpTree(vg.getChildAt(i), depth + 1);
            }
        }
    }

    private View findByIdName(View root, String idName) {
        if (root == null) return null;
        int id = root.getId();
        if (id != View.NO_ID) {
            try {
                if (idName.equals(root.getContext().getResources().getResourceName(id))) return root;
            } catch (Throwable ignored) {
            }
        }
        if (root instanceof ViewGroup) {
            ViewGroup vg = (ViewGroup) root;

            for (int i = 0; i < vg.getChildCount(); i++) {
                View v = findByIdName(vg.getChildAt(i), idName);
                if (v != null) return v;
            }
        }
        return null;
    }
}
