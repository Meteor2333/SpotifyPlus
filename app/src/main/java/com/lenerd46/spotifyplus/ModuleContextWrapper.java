package com.lenerd46.spotifyplus;

import android.content.Context;
import android.content.res.AssetManager;
import android.content.res.Resources;

public class ModuleContextWrapper extends android.view.ContextThemeWrapper {
    private final Resources res;
    private final AssetManager am;
    private final ClassLoader cl;

    public ModuleContextWrapper(Context base, int themeResId, Resources moduleRes, ClassLoader moduleCl) {
        super(base, themeResId);

        this.res = moduleRes;
        this.am = moduleRes.getAssets();
        this.cl = moduleCl;
    }

    @Override public Resources getResources() { return res; }
    @Override public AssetManager getAssets() { return am; }
    @Override public ClassLoader getClassLoader() { return cl; }
}
