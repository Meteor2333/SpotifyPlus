package com.lenerd.spotifyplus.module.scripting;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.ViewGroup;

import com.lenerd.spotifyplus.module.SpotifyHook;
import com.lenerd.spotifyplus.module.Utils;
import com.lenerd.spotifyplus.sdk.spotify.entities.SpotifyTrack;
import com.lenerd.spotifyplus.module.scripting.entities.PlatformData;

import com.lenerd.spotifyplus.module.scripting.nativestuff.NativeComponentRegistry;
import com.lenerd.spotifyplus.module.scripting.nativestuff.SpotifyPlusContextImplementation;
import com.lenerd.spotifyplus.sdk.SpotifyPlusPlugin;
import org.json.JSONArray;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class SpotifyNativeBridge {
    private static final String TAG = "SpotifyPlus:NativeBridge";
    private static final Map<String, SpotifyHook> handlers = new HashMap<>();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static final Map<String, ScriptViewHost> surfaceHosts = new ConcurrentHashMap<>();
    private static final Set<String> registeredSurfaces = ConcurrentHashMap.newKeySet();
    public static final NativeComponentRegistry scriptRegistry = new NativeComponentRegistry();

    private final ClassLoader classLoader;
    private final File scriptDirectory;
    private final File optimizedDirectory;
    private final Context context;

    public static class StorageReadResult {
        public boolean found;
        public String type;
        public String value;
        public String data;

        public StorageReadResult() {
            this(false, "", null, null);
        }

        public StorageReadResult(boolean found, String type, String value, String data) {
            this.found = found;
            this.type = type;
            this.value = value;
            this.data = data;
        }
    }

    public SpotifyNativeBridge(ClassLoader classLoader, File scriptDirectory, File optimizedDirectory, Context context) {
        this.classLoader = classLoader;
        this.scriptDirectory = scriptDirectory;
        this.optimizedDirectory = optimizedDirectory;
        this.context = context;
    }

    private static Object invokeHandler(String type, String id, Object... args) {
        SpotifyHook hook = handlers.get(type);
        if (hook == null) {
            Log.w(TAG, "Handler not registered for type: " + type);
            return null;
        }

        try {
            return hook.handle(id, args);
        } catch (Throwable e) {
            Log.e(TAG, "Failed to invoke handler " + type + ":" + id, e);
            return null;
        }
    }

    public void loadDex(String scriptId, String dexPath, String pluginClass) {
        try {
            Log.d("DexLoader", "Loading " + pluginClass);
            if (dexPath.endsWith(".apk")) dexPath = dexPath.substring(0, dexPath.length() - 4);
            File dexFile = new File(dexPath + ".apk");
            dexFile.setReadable(true, false);
            dexFile.setWritable(false, false);
            dexFile.setExecutable(false, false);
            Log.d("DexLoader", dexFile.getAbsolutePath());

            if (dexFile.exists()) {
                Log.d("DexLoader", "Dex File exists!");
                ScriptDexLoader loader = new ScriptDexLoader(context);
                ClassLoader scriptLoader = loader.loadDex(dexFile, optimizedDirectory, SpotifyPlusPlugin.class.getClassLoader());

                try {
                    dalvik.system.DexFile dex = new dalvik.system.DexFile(dexFile);
                    java.util.Enumeration<String> entries = dex.entries();

                    while (entries.hasMoreElements()) {
                        String name = entries.nextElement();
                        if (name.contains("lyrics")) Log.d("DexLoader", "Class in dex: " + name);
                    }

                    dex.close();
                } catch (Throwable t) {
                    Log.e("DexLoader", "Failed listing dex classes", t);
                }

//                SpotifyPlusPlugin plugin = loader.loadPluginFromDexFile(dexFile, optimizedDirectory, SpotifyPlusPlugin.class.getClassLoader(), pluginClass);
                SpotifyPlusPlugin plugin = loader.loadPlugin(scriptLoader, pluginClass);
                SpotifyPlusContextImplementation context = new SpotifyPlusContextImplementation(this);
                scriptRegistry.setContext(context);
                plugin.register(scriptRegistry, context);
            } else {
                Log.d("DexLoader", "Did not find " + dexFile.getAbsolutePath());
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to load dex file " + dexPath, e);
        }
    }

    public PlatformData getPlatformData() {
        return Utils.platformData;
    }

    public String getAccessToken() {
        return Utils.token;
    }

    public SpotifyTrack getCurrentTrack() {
        return Utils.getTrack(classLoader);
    }

    public SpotifyTrack getTrack(String uri) {
        return null;
    }

    public double getPlaybackPosition() {
        try {
            return Utils.getCurrentPlaybackPosition();
        } catch (Exception e) {
            Log.e(TAG, "Failed to get playback position", e);
            return 0.0;
        }
    }

    public void seek(long position) {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("seek", new Object[]{position});
        } catch (Exception e) {
            Log.e(TAG, "Failed to seek", e);
        }
    }

    public void play() {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("play", new Object[]{});
        } catch (Exception e) {
            Log.e(TAG, "Failed to play", e);
        }
    }

    public void pause() {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("pause", new Object[]{});
        } catch (Exception e) {
            Log.e(TAG, "Failed to pause", e);
        }
    }

    public void togglePlay() {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("togglePlay", new Object[]{});
        } catch (Exception e) {
            Log.e(TAG, "Failed to togglePlay", e);
        }
    }

    public void skipNext() {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("skipNext", new Object[]{});
        } catch (Exception e) {
            Log.e(TAG, "Failed to skipNext", e);
        }
    }

    public void skipPrevious() {
        try {
            SpotifyHook hook = handlers.get("player");
            if (hook == null) {
                Log.w(TAG, "Player hook not registered");
                return;
            }

            hook.handle("skipPrevious", new Object[]{});
        } catch (Exception e) {
            Log.e(TAG, "Failed to skipPrevious", e);
        }
    }

    public void toast(String text, boolean longLength) {
        try {
            invokeHandler("ui", "toast", text, longLength);
        } catch (Exception e) {
            Log.e(TAG, "Failed to show toast", e);
        }
    }

    public void openUri(String uri) {
        try {
            invokeHandler("system", "openUri", uri);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open uri", e);
        }
    }

    public void storageSet(String scriptId, String key, String value) {
        try {
            invokeHandler("storage", "set", scriptId, key, value);
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageSet", e);
        }
    }

    public String storageGet(String scriptId, String key) {
        try {
            Object result = invokeHandler("storage", "get", scriptId, key);
            return result instanceof String ? (String) result : null;
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageGet", e);
            return null;
        }
    }

    public void storageRemove(String scriptId, String key) {
        try {
            invokeHandler("storage", "remove", scriptId, key);
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageRemove", e);
        }
    }

    public void storageWriteText(String scriptId, String path, String value) {
        try {
            invokeHandler("storage", "writeText", scriptId, path, value);
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageWriteText", e);
        }
    }

    public void storageWriteJson(String scriptId, String path, String value) {
        try {
            invokeHandler("storage", "writeJson", scriptId, path, value);
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageWriteJson", e);
        }
    }

    public void storageWriteBinary(String scriptId, String path, String data) {
        try {
            invokeHandler("storage", "writeBinary", scriptId, path, data);
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageWriteBinary", e);
        }
    }

    public StorageReadResult storageRead(String scriptId, String path) {
        try {
            Object result = invokeHandler("storage", "read", scriptId, path);
            return result instanceof StorageReadResult ? (StorageReadResult) result : new StorageReadResult();
        } catch (Exception e) {
            Log.e(TAG, "Failed to storageRead", e);
            return new StorageReadResult();
        }
    }

    public void registerContextMenu(String id, String scriptId, String title) {
        try {
            invokeHandler("menu", "register", id, scriptId, title);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register context menu", e);
        }
    }

    public void registerSideDrawer(String id, String scriptId, String title) {
        try {
            invokeHandler("side", "register", id, scriptId, title);
        } catch (Exception e) {
            Log.e(TAG, "Failed to register side drawer", e);
        }
    }

    public void registerSurface(String surfaceId) {
        registeredSurfaces.add(surfaceId);
    }

    public void unregisterSurface(String surfaceId) {
        registeredSurfaces.remove(surfaceId);
    }

    public void commitSurface(String surfaceId, String opsJson) {
        if (!registeredSurfaces.contains(surfaceId)) return;

        mainHandler.post(() -> {
            ScriptViewHost host = surfaceHosts.get(surfaceId);
            if (host == null) {
                Log.w(TAG, "commitSurface ignored because host was missing for " + surfaceId);
                return;
            }

            try {
                host.applyOps(new JSONArray(opsJson));
            } catch (Exception e) {
                Log.e(TAG, "Failed to apply commit for surface " + surfaceId, e);
            }
        });
    }

    public static void attachSurfaceHost(String surfaceId, ViewGroup root) {
        Log.d(TAG, "Attaching surface!!!!!!  " + surfaceId);

        mainHandler.post(() -> {
            var existing = surfaceHosts.get(surfaceId);
            if (existing == null) {
                surfaceHosts.put(surfaceId, new ScriptViewHost(surfaceId, root));
            }
        });
    }

    public static void detachSurfaceHost(String surfaceId) {
        mainHandler.post(() -> {
            ScriptViewHost existing = surfaceHosts.remove(surfaceId);
            if (existing != null) existing.dispose();
        });
    }

    public static void registerHandler(String type, SpotifyHook hook) {
        handlers.put(type, hook);
    }

    public static native void sendEvent(String type, String payload);
}