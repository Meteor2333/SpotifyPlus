package com.lenerd.spotifyplus.module.hooks;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.util.Log;
import com.lenerd.spotifyplus.manager.bridge.BridgeClient;
import com.lenerd.spotifyplus.module.SpotifyCallback;
import com.lenerd.spotifyplus.module.SpotifyHook;
import com.lenerd.spotifyplus.module.scripting.ScriptManager;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

public class StorageHook extends SpotifyHook {
    @Override
    protected void hookSetup() throws NoSuchMethodException, ClassNotFoundException, NoSuchFieldException {
        ScriptManager.registerHandler("storage", this);
    }

    @Override
    protected void beforeHook(SpotifyCallback callback) {
    }

    @Override
    protected void afterHook(SpotifyCallback callback) {
    }

    @Override
    public void handle(String id, String command, JSONObject json) {
        if (command.equals("set")) {
            try {
                if(currentActivity == null) return;

                String scriptId = json.getString("scriptId");
                String key = json.getString("key");
                Object value = json.get("value");

                SharedPreferences prefs = currentActivity.getSharedPreferences(scriptId, Context.MODE_PRIVATE);

                switch (value) {
                    case String s -> prefs.edit().putString(key, s).apply();
                    case Boolean b -> prefs.edit().putBoolean(key, b).apply();
                    case Integer i -> prefs.edit().putInt(key, i).apply();
                    case Long l -> prefs.edit().putLong(key, l).apply();
                    case Float v -> prefs.edit().putFloat(key, v).apply();
                    default -> prefs.edit().putString(key, value.toString()).apply();
                }
            } catch(Exception e) {
                logError(e);
            }
        } else if(command.equals("get")) {
            try {
                String scriptId = json.getString("scriptId");
                String key = json.getString("key");

                SharedPreferences prefs = currentActivity.getSharedPreferences(scriptId, Context.MODE_PRIVATE);
                Object value = prefs.getAll().get(key);

                if (value == null) {
                    BridgeClient.send(id, "response", "storage.get", new JSONObject());
                } else {
                    BridgeClient.send(id, "response", "storage.get", new JSONObject().put("value", value));
                }
            } catch (Exception e) {
                logError(e);
                BridgeClient.send(id, "response", "storage.get", new JSONObject());
            }
        } else if(command.equals("remove")) {
            try {
                String scriptId = json.getString("scriptId");
                String key = json.getString("key");

                SharedPreferences prefs = currentActivity.getSharedPreferences(scriptId, Context.MODE_PRIVATE);
                prefs.edit().remove(key).apply();
            } catch(Exception e) {
                logError(e);
            }
        } else if(command.equals("write")) {
            try {
                String scriptId = json.getString("scriptId");
                String scriptPath = json.getString("path");
                if(currentActivity == null) return;
                File scriptPathReal = new File(currentActivity.getFilesDir(), scriptId);
                File path = new File(scriptPathReal, scriptPath);

                File parent = path.getParentFile();
                if(parent != null && !parent.exists()) parent.mkdirs();;

                if(json.has("value")) {
                    String value = json.getString("value");
                    Files.write(path.toPath(), value.getBytes());
                } else if(json.has("data")) {
                    String data = json.getString("data");
                    byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
                    Files.write(path.toPath(), bytes);
                } else {
                    Log.w("SpotifyPlus", "Script " + scriptId + " write command did not have either value or data");
                }
            } catch(Exception e) {
                logError(e);
            }
        } else if(command.equals("read")) {
            try {
                String scriptId = json.getString("scriptId");
                String scriptPath = json.getString("path");

                if(currentActivity == null) return;
                File scriptPathReal = new File(currentActivity.getFilesDir(), scriptId);
                File file = resolveScriptFile(scriptPathReal, scriptPath);

                if(!file.exists()) {
                    BridgeClient.send(id, "response", "storage.read", null);
                    return;
                }
            } catch(Exception e) {
                logError(e);
                BridgeClient.send(id, "response", "storage.read", null);
            }
        }
    }

    private File resolveScriptFile(File scriptDir, String relativePath) throws IOException {
        File target = new File(scriptDir, relativePath);

        String root = scriptDir.getCanonicalPath();
        String path = target.getCanonicalPath();

        if (!path.startsWith(root + File.separator) && !path.equals(root)) {
            throw new SecurityException("Path escapes script sandbox");
        }

        return target;
    }
}