package com.lenerd.spotifyplus.module.hooks;

import android.util.Log;
import android.view.ViewGroup;
import com.lenerd.spotifyplus.manager.bridge.BridgeClient;
import com.lenerd.spotifyplus.module.SpotifyCallback;
import com.lenerd.spotifyplus.module.SpotifyHook;
import com.lenerd.spotifyplus.module.scripting.ScriptManager;
import com.lenerd.spotifyplus.module.scripting.UiSurfaceHost;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class ReactManager extends SpotifyHook {
    private static final Map<String, UiSurfaceHost> surfaces = new HashMap<>();

    @Override
    protected void hookSetup() throws NoSuchMethodException, ClassNotFoundException, NoSuchFieldException {
        ScriptManager.registerHandler("react", this);
    }

    @Override
    protected void beforeHook(SpotifyCallback callback) {
    }

    @Override
    protected void afterHook(SpotifyCallback callback) {
    }

    @Override
    public void handle(String id, String command, JSONObject json) {
        if (command.equals("commit")) {
            try {
                String surfaceId = json.getString("surfaceId");
                applyCommit(surfaceId, json.getJSONArray("ops"));
            } catch (Exception e) {
                logError(e);
            }
        }
    }

    public static void registerSurface(String surfaceId, ViewGroup root) {
        try {
            surfaces.put(surfaceId, new UiSurfaceHost(surfaceId, root));
            JSONObject json = new JSONObject();
            json.put("id", surfaceId);
            json.put("surfaceType", surfaceId);

            BridgeClient.send("", "event", "react.surfaceEvent", json);
        } catch (Exception e) {
            logError(e);
        }
    }

    public static void registerSurfaceSilent(String surfaceId, ViewGroup root) {
        try {
            surfaces.put(surfaceId, new UiSurfaceHost(surfaceId, root));
        } catch (Exception e) {
            logError(e);
        }
    }

    public static void unregisterSurface(String surfaceId) {
        surfaces.remove(surfaceId);
    }

    private void applyCommit(String surfaceId, JSONArray ops) {
        UiSurfaceHost host = surfaces.get(surfaceId);
        if (host == null) {
            Log.w("SpotifyPlus", "No surface registered for " + surfaceId);
            return;
        }

        host.applyOps(ops);
    }
}
