package com.lenerd.spotifyplus.module.scripting.nativestuff;

import android.util.Log;
import com.lenerd.spotifyplus.sdk.SpotifyPlusComponent;
import com.lenerd.spotifyplus.sdk.SpotifyPlusRegistry;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;

import java.util.HashMap;
import java.util.Map;

public class NativeComponentRegistry implements SpotifyPlusRegistry {
    private SpotifyPlusContext context;
    private final Map<String, NativeComponentEntry> components = new HashMap<>();

    public void setContext(SpotifyPlusContext context) {
        this.context = context;
    }

    @Override
    public void registerComponent(SpotifyPlusComponent<?> component) {
        components.put(component.getName(), new  NativeComponentEntry(component, context));
        Log.d("DexLoader", "Registered " + component.getName());
    }

    public NativeComponentEntry getComponent(String name) {
        return components.get(name);
    }

    public boolean hasComponent(String name) {
        return components.containsKey(name);
    }
}
