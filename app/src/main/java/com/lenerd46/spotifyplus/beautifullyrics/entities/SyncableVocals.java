package com.lenerd46.spotifyplus.beautifullyrics.entities;

public interface SyncableVocals {
    void animate(double songTimestamp, double deltaTime, boolean isImmediate);
    boolean isActive();
}
