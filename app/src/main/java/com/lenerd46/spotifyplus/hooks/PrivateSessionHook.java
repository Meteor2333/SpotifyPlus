package com.lenerd46.spotifyplus.hooks;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.lenerd46.spotifyplus.References;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class PrivateSessionHook extends SpotifyHook {
    private final long REFRESH_DELAY = 5L * 60L * 60L * 1000L + 45L * 60L * 1000L;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private Object privateSessionKey;
    private Object settingsRepository;
    private long lastAttempt;

    private Runnable refreshPrivateSession;

    @Override
    protected void hook() {
        try {
            privateSessionKey = XposedHelpers.getStaticObjectField(XposedHelpers.findClass("p.i4l0", lpparm.classLoader), "d");

            refreshPrivateSession = () -> {
                if (settingsRepository == null || privateSessionKey == null) return;
                if (!References.currentActivity.getSharedPreferences("SpotifyPlus", Context.MODE_PRIVATE).getBoolean("private_session", false))
                    return;

                long now = System.currentTimeMillis();
                if (now - lastAttempt < 10000L) return;

                lastAttempt = now;

                try {
                    XposedHelpers.callMethod(settingsRepository, "c", privateSessionKey, Boolean.TRUE);
                    handler.removeCallbacks(refreshPrivateSession);
                    handler.postDelayed(refreshPrivateSession, REFRESH_DELAY);
                } catch (Throwable t) {
                    XposedBridge.log(t);
                    handler.postDelayed(refreshPrivateSession, REFRESH_DELAY);
                }
            };

            XposedBridge.hookAllConstructors(XposedHelpers.findClass("p.n4l0", lpparm.classLoader), new XC_MethodHook() {
                @Override
                protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                    settingsRepository = param.thisObject;
                    handler.postDelayed(refreshPrivateSession, 1000L);
                }
            });

            XposedHelpers.findAndHookMethod(XposedHelpers.findClass("p.n4l0", lpparm.classLoader), "c", XposedHelpers.findClass("p.j4l0", lpparm.classLoader), Object.class, new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    if (param.args.length < 2) return;
                    if (param.args[0] != privateSessionKey) return;

                    if (!(param.args[1] instanceof Boolean)) return;
                    if ((Boolean) param.args[1]) return;
                    if (!References.currentActivity.getSharedPreferences("SpotifyPlus", Context.MODE_PRIVATE).getBoolean("private_session", false))
                        return;

                    param.args[1] = Boolean.TRUE;
                }

                @Override
                protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                    if (param.args.length < 2) return;
                    if (!param.args[0].equals(privateSessionKey)) return;
                    if (!param.args[1].equals(Boolean.TRUE)) ;
                    if (!References.currentActivity.getSharedPreferences("SpotifyPlus", Context.MODE_PRIVATE).getBoolean("private_session", false))
                        return;

                    lastAttempt = System.currentTimeMillis();
                    handler.removeCallbacks(refreshPrivateSession);
                    handler.postDelayed(refreshPrivateSession, REFRESH_DELAY);
                }
            });

            XposedHelpers.findAndHookMethod("com.spotify.settings.esperanto.proto.SettingsOuterClass$SettingsState", lpparm.classLoader, "K", new XC_MethodHook() {
                @Override
                protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                    if (param.getResult().equals(Boolean.FALSE)) {
                        handler.postDelayed(refreshPrivateSession, 750L);
                    }

                    param.setResult(Boolean.TRUE);
                }
            });

            XposedHelpers.findAndHookMethod("p.s7n0", lpparm.classLoader, "onIncognitoModeDisabledByTimer", new XC_MethodHook() {
                @Override
                protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                    handler.postDelayed(refreshPrivateSession, 250L);
                }
            });
        } catch (Exception e) {
            XposedBridge.log(e);
        }
    }
}