package com.lenerd46.spotifyplus.beautifullyrics.entities;

public class TrackAnalysis {
    public final float acousticness;
    public final float danceability;
    public final float energy;
    public final int key;
    public final float liveness;
    public final float loudness;
    public final float mode;
    public final float tempo;
    public final float valence;

    public static final TrackAnalysis defaultTrack = new TrackAnalysis(1, 1, 1, 1, 1, 1, 1, 1, 1);

    public TrackAnalysis(float acousticness, float danceability, float energy, int key, float liveness, float loudness, float mode, float tempo, float valence) {
        this.acousticness = acousticness;
        this.danceability = danceability;
        this.energy = energy;
        this.key = key;
        this.liveness = liveness;
        this.loudness = loudness;
        this.mode = mode;
        this.tempo = tempo;
        this.valence = valence;
    }
}
