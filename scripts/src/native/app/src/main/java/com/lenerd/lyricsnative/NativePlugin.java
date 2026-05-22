package com.lenerd.lyricsnative;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.lenerd.spotifyplus.sdk.SpotifyPlusPlugin;
import com.lenerd.spotifyplus.sdk.SpotifyPlusRegistry;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class NativePlugin implements SpotifyPlusPlugin {
    private SpotifyPlusContext context;
    public static List<GradientTextView> texts = new ArrayList<>();

    @Override
    public void register(SpotifyPlusRegistry registry, SpotifyPlusContext context) {
        this.context = context;

        registry.registerComponent(new GradientText());
        updateTextViews();
    }

    private void updateTextViews() {
        new Thread(() -> {
            long endTime = context.getPlayer().getCurrentTrack().duration;
            double position = context.getPlayer().getPlaybackPosition();

            while (position < endTime) {
                position = context.getPlayer().getPlaybackPosition() / 1000;

                for (GradientTextView syllable : new ArrayList<>(texts)) {
                    double relativeTime = position - syllable.startTime;
                    double timeScale = Math.max(0, Math.min(relativeTime / syllable.duration, 1));
                    double syllableTimeScale = Math.max(0, Math.min((timeScale - syllable.startScale) / syllable.durationScale, 1));

//                    Log.d("BeautifulLyrics", syllable.getText() + " | " + timeScale + " | " + relativeTime + " | " + syllableTimeScale);

                    new Handler(Looper.getMainLooper()).post(() -> {
                        syllable.setProgress((float) syllableTimeScale);
                    });
                }

                try {
                    Thread.sleep(16);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            texts.clear();
        }).start();
    }
}
