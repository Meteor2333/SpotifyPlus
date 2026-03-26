package com.lenerd46.spotifyplus.hooks;

import android.content.Context;
import android.content.SharedPreferences;
import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class NetworkHook extends SpotifyHook {
    private final Context context;

    public NetworkHook(Context context) {
        this.context = context;
    }

    @Override
    protected void hook() {
        SharedPreferences prefs = context.getSharedPreferences("SpotifyPlus", Context.MODE_PRIVATE);

        if (prefs.getBoolean("block_ads", false)) {
            XposedBridge.hookAllConstructors(XposedHelpers.findClass("okhttp3.Request", lpparm.classLoader), new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    String url = param.args[0].toString();

                    //  || url.contains("gabo-receiver-service") || url.contains("net-fortune") || url.contains("darwin-experiments") || url.contains("speechless-sharing") || url.contains("pendragon")
                    if (url.contains("/ads")) {
                        param.args[0] = XposedHelpers.callMethod(XposedHelpers.getStaticObjectField(XposedHelpers.findClass("okhttp3.HttpUrl", lpparm.classLoader), "k"), "c", "http://127.0.0.1:404/");
                    }
                }
            });
        }
    }
}