package com.lenerd46.spotifyplus.netease;

import java.util.List;

public class NeteaseLine {
    public String agent;
    public int begin;
    public int duration;
    public int end;

    public String htmlLineText;
    public List<NeteaseWord> words;
    public String htmlTranslationLineText;

    public String htmlBackgroundVocalsLineText;
    public List<NeteaseWord> backgroundWords;

    public String htmlTranslatedBackgroundVocalsLineText;
    public String htmlPronunciationLineText;
    public String htmlPronunciationBackgroundVocalsLineText;
}
