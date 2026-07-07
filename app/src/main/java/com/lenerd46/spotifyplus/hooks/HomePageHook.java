package com.lenerd46.spotifyplus.hooks;

import android.view.View;
import android.view.ViewGroup;

import androidx.recyclerview.widget.RecyclerView;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;

public class HomePageHook extends SpotifyHook {
    @Override
    protected void hook() {
        XposedBridge.hookAllMethods(ViewGroup.class, "addView", new XC_MethodHook() {
            @Override
            protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                if (!(param.thisObject instanceof ViewGroup)) return;
                if (param.args.length == 0 || !(param.args[0] instanceof View)) return;

                ViewGroup parent = (ViewGroup) param.thisObject;
                View child = (View) param.args[0];

                tryHookHomeRecycler(parent, child);
            }
        });
    }

    private void tryHookHomeRecycler(ViewGroup parent, View child) {
        if (!(child instanceof androidx.recyclerview.widget.RecyclerView)) return;

        RecyclerView rv = (RecyclerView) child;

        int parentId = parent.getId();
        int rvId = rv.getId();

        if (parentId == View.NO_ID || rvId == View.NO_ID) return;

        try {
            String parentName = parent.getResources().getResourceName(parentId);
            String rvName = rv.getResources().getResourceName(rvId);

            // We only care about the Home feed recycler
            if (!"com.spotify.music:id/evo_swipe_refresh_layout".equals(parentName)) return;
            if (!"com.spotify.music:id/recycler_view".equals(rvName)) return;

            // Attach our listener ONCE
//            attachSectionHider(rv);

        } catch (Throwable ignored) {
            // resource lookup can fail, just ignore
        }
    }
}