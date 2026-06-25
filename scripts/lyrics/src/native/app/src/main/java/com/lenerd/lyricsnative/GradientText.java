package com.lenerd.lyricsnative;

import android.content.Context;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import com.lenerd.spotifyplus.sdk.SpotifyPlusComponent;
import com.lenerd.spotifyplus.sdk.spotify.SpotifyPlusContext;
import org.json.JSONException;
import org.json.JSONObject;

public class GradientText extends SpotifyPlusComponent<GradientTextView> {
    private SpotifyPlusContext context;
    public GradientTextView textView;

    @Override
    public String getName() {
        return "GradientText";
    }

    @Override
    public GradientTextView createView(Context context, SpotifyPlusContext spotifyPlusContext) {
        this.context = spotifyPlusContext;
        textView = new GradientTextView(context);
        return textView;
    }

    @Override
    public void updateProps(GradientTextView view, JSONObject oldProps, JSONObject newProps) {
        String text = newProps.optString("text", "nullText");
        int fontSize = newProps.optInt("fontSizee", 12);
        double startTime = newProps.optDouble("startTime", -1);
        double duration = newProps.optDouble("duration", -1);
        double startScale = newProps.optDouble("startScale", -1);
        double durationScale = newProps.optDouble("durationScale", -1);
        double progress = newProps.optDouble("progress");

        Log.d("BeautifulLyrics", text);

        if(!text.equals("nullText")) view.setText(text);
        if(fontSize != 12) view.setTextSize(fontSize);
        if(startTime != -1) view.startTime = startTime;
        if(duration != -1) view.duration = duration;
        if(startScale != -1)  view.startScale = startScale;
        if(durationScale != -1)  view.durationScale = durationScale;
        if(!Double.isNaN(progress)) view.setProgress((float)progress);
    }

    public enum LyricState {
        IDLE,
        ACTIVE,
        SUNG
    }
}