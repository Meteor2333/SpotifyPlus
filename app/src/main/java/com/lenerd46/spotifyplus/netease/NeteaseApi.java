package com.lenerd46.spotifyplus.netease;

import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import okhttp3.FormBody;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public final class NeteaseApi {

    private static final String BASE_URL = "https://interface.music.163.com/eapi/";
    private static final OkHttpClient http = new OkHttpClient();

    private NeteaseApi() {
        // Utility class
    }

    private static String request(String endpoint, Map<String, Object> params) throws IOException {
        HttpUrl url = HttpUrl.get(BASE_URL + endpoint);
        String jsonParams = toJson(params);

        Map<String, String> encryptedData = NeteaseEncryption.encrypt(url.encodedPath(), jsonParams);

        FormBody.Builder bodyBuilder = new FormBody.Builder();
        for (Map.Entry<String, String> entry : encryptedData.entrySet()) {
            bodyBuilder.add(entry.getKey(), entry.getValue());
        }

        Request req = new Request.Builder()
                .url(url)
                .post(bodyBuilder.build())
                .build();

        try (Response resp = http.newCall(req).execute()) {
            if (!resp.isSuccessful()) {
                throw new IOException("Http Error: " + resp.code() + ", " + resp.message());
            }

            if (resp.body() == null) {
                throw new IOException("Response body is null");
            }

            return resp.body().string();
        }
    }

    public static String fetchLyric(long id) throws IOException {
        Map<String, Object> params = new HashMap<>();

        params.put("id", Long.toString(id));
        params.put("cp", false);
        params.put("lv", 0);
        params.put("tv", 0);
        params.put("rv", 0);
        params.put("yv", 0);
        params.put("ytv", 0);
        params.put("yrv", 0);

        return request("song/lyric/v1", params);
    }

    private static Pattern YRC_LINE_HEADER_REGEX = Pattern.compile("\\\\[(\\\\d+),(\\\\d+)]");
    private static Pattern YRC_SYLLABLE_REGEX = Pattern.compile("\\\\((\\\\d+),(\\\\d+),\\\\d+\\\\)([^(]*)");

    public static List<NeteaseLine> parse(String raw) {
        var entries = new ArrayList<NeteaseLine>();
        if(raw == null || raw.isBlank()) return entries;

        Arrays.stream(raw.split(System.lineSeparator())).collect(Collectors.toList()).forEach(fullLine -> {
            var line = fullLine.trim();
            if(line.isBlank() || line.startsWith("{")) return;

            var headerMatcher = YRC_LINE_HEADER_REGEX.matcher(line);
            if(headerMatcher.find()) {
                long lineStart = headerMatcher.group(1) == null ? 0L : Long.parseLong(headerMatcher.group(1));
                long lineDuration = headerMatcher.group(2) == null ? 0L : Long.parseLong(headerMatcher.group(2));
                long lineEnd = lineStart + lineDuration;

                List<NeteaseWord> words = new ArrayList<>();
                var contentPart = line.substring(headerMatcher.end());
                var wordMatcher = YRC_SYLLABLE_REGEX.matcher(contentPart);

                while(wordMatcher.find()) {
                    long start = wordMatcher.group(1) == null ? 0L : Long.parseLong(wordMatcher.group(1));
                    long duration = wordMatcher.group(2) == null ? 0L : Long.parseLong(wordMatcher.group(2));
                    String text = wordMatcher.group(3) == null ? "" : wordMatcher.group(3);

                    if(text.isEmpty()) continue;

                    NeteaseWord word = new NeteaseWord();
                    word.begin = start;
                    word.duration = duration;
                    word.end = start + duration;
                    word.text = text;

                    words.add(word);
                }

//                var sorted = words.sort()
            }
        });

        return entries;
    }

    private static String toJson(Map<String, Object> params) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        Iterator<Map.Entry<String, Object>> it = params.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Object> entry = it.next();

            sb.append("\"").append(escapeJson(entry.getKey())).append("\":");
            sb.append(toJsonValue(entry.getValue()));

            if (it.hasNext()) {
                sb.append(",");
            }
        }

        sb.append("}");
        return sb.toString();
    }

    private static String toJsonValue(Object value) {
        if (value == null) {
            return "null";
        }

        if (value instanceof String) {
            return "\"" + escapeJson((String) value) + "\"";
        }

        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }

        return "\"" + escapeJson(String.valueOf(value)) + "\"";
    }

    private static String escapeJson(String s) {
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);

            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }

        return sb.toString();
    }
}