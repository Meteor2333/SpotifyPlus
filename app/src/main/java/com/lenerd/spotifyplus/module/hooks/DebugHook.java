package com.lenerd.spotifyplus.module.hooks;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import com.lenerd.spotifyplus.manager.bridge.BridgeClient;
import com.lenerd.spotifyplus.module.SpotifyCallback;
import com.lenerd.spotifyplus.module.SpotifyHook;
import com.lenerd.spotifyplus.module.Utils;
import com.lenerd.spotifyplus.module.scripting.ScriptManager;
import com.lenerd.spotifyplus.module.scripting.SpotifyNativeBridge;
import org.json.JSONObject;

public class DebugHook extends SpotifyHook {
    @Override
    protected void hookSetup() throws NoSuchMethodException, ClassNotFoundException, NoSuchFieldException {
        SpotifyNativeBridge.registerHandler("ui", this);
        SpotifyNativeBridge.registerHandler("system", this);
    }

    @Override
    protected void beforeHook(SpotifyCallback callback) { }

    @Override
    protected void afterHook(SpotifyCallback callback) { }

    @Override
    public Object handle(String command, Object[] args) {
        try {
            if (command.equals("toast")) {
                String text = (String) args[0];
                boolean longToast = (boolean) args[1];

                if (currentActivity == null) return null;

                Handler handler = new Handler(Looper.getMainLooper());
                handler.post(() -> Toast.makeText(currentActivity, text, longToast ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT).show());
            } else if(command.equals("openUri")) {
                String uri = (String) args[0];
                if(currentActivity == null) return null;

                currentActivity.startActivity(new Intent(Intent.ACTION_VIEW).setData(Uri.parse(uri)));
            }
        } catch (Exception e) {
            logError(e);
        }

        return null;
    }
}
