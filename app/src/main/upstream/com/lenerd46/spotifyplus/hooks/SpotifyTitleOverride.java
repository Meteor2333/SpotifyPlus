package com.lenerd46.spotifyplus.hooks;

import android.app.AndroidAppHelper;
import android.content.res.Resources;

import com.lenerd46.spotifyplus.References;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;

public class SpotifyTitleOverride {
    private static final ThreadLocal<Override> tl = new ThreadLocal<>();
    private static volatile boolean installed = false;

    public static void overrideSpotifyStringById(int resId, String newValue) {
        try {
            Resources res = AndroidAppHelper.currentApplication().getResources();
            final String entry = res.getResourceEntryName(resId);

            References.xresources.setReplacement("com.spotify.music", "string", entry, newValue);
        } catch (Throwable t) {

        }
    }

    private static final class Override {
        final String targetPkg;
        final int resId;
        final String title;

        Override(String targetPkg, int resId, String title) {
            this.targetPkg = targetPkg;
            this.resId = resId;
            this.title = title;
        }
    }

    public static synchronized void install() {
        if (installed)
            return;
        installed = true;

        XposedBridge.hookAllMethods(Resources.class, "getString", new XC_MethodHook() {
            @java.lang.Override
            protected void beforeHookedMethod(MethodHookParam param) {

                if (param.args.length < 1 || !(param.args[0] instanceof Integer))
                    return;

                Override ov = tl.get();
                if (ov == null)
                    return;

                final int id = (Integer) param.args[0];
                XposedBridge.log("[SpotifyPlus] LOOK A THING: " + id);
                if (!idMatchesPackage(param, id, ov.targetPkg))
                    return;

                if (id == ov.resId) {
                    param.setResult(ov.title);
                }
            }
        });

        XposedBridge.hookAllMethods(Resources.class, "getText", new XC_MethodHook() {
            @java.lang.Override
            protected void beforeHookedMethod(MethodHookParam param) {
                if (param.args.length < 1 || !(param.args[0] instanceof Integer))
                    return;

                Override ov = tl.get();
                if (ov == null)
                    return;

                final int id = (Integer) param.args[0];
                if (!idMatchesPackage(param, id, ov.targetPkg))
                    return;

                if (id == ov.resId) {
                    param.setResult(ov.title);
                }
            }
        });
    }

    private static boolean idMatchesPackage(XC_MethodHook.MethodHookParam param, int id, String targetPkg) {
        try {
            Resources res = (Resources) param.thisObject;
            String pkg = res.getResourcePackageName(id);

            return targetPkg.equals(pkg);
        } catch (Resources.NotFoundException e) {
            return false;
        } catch (Throwable t) {
            XposedBridge.log(t);
            return false;
        }
    }
}
