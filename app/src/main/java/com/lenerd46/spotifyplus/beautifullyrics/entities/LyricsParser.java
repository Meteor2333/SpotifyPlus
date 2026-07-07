package com.lenerd46.spotifyplus.beautifullyrics.entities;

import android.util.Log;

import com.lenerd46.spotifyplus.beautifullyrics.entities.lyrics.ProviderLyrics;
import com.lenerd46.spotifyplus.beautifullyrics.entities.lyrics.SyllableMetadata;
import com.lenerd46.spotifyplus.beautifullyrics.entities.lyrics.SyllableSyncedLyrics;
import com.lenerd46.spotifyplus.beautifullyrics.entities.lyrics.SyllableVocal;
import com.lenerd46.spotifyplus.beautifullyrics.entities.lyrics.SyllableVocalSet;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import de.robv.android.xposed.XposedBridge;

public class LyricsParser {
    public ProviderLyrics parseLyrics(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setValidating(false);
            factory.setIgnoringElementContentWhitespace(false);
            DocumentBuilder builder = factory.newDocumentBuilder();

            InputStream stream = new ByteArrayInputStream(xml.replaceAll("\\\\", "").getBytes(StandardCharsets.UTF_8));
            Document doc = builder.parse(stream);
            Element ttml = doc.getDocumentElement();

            String ns = "http://www.w3.org/ns/ttml";
            String ttm = "http://www.w3.org/ns/ttml#metadata";
            String itunes = "http://music.apple.com/lyric-ttml-internal";

            String type = ttml.getAttributeNS(itunes, "timing");
            XposedBridge.log("[SpotifyPlus] " + ttml);

            if (type.equals("Word")) {
                List<Object> parsedLines = new ArrayList<>();
                NodeList lines = ttml.getElementsByTagNameNS(ns, "p");

                for (int i = 0; i < lines.getLength(); i++) {
                    Element line = (Element) lines.item(i);

                    SyllableVocalSet parsedLine =  new SyllableVocalSet();
                    parsedLine.oppositeAligned = line.getAttributeNS(ns, "agent").equals("v2");
                    parsedLine.type = "Vocal";
                    parsedLine.lead = new SyllableVocal();
                    parsedLine.background = new ArrayList<>();
                    parsedLine.background.add(new SyllableVocal());
                    parsedLine.lead.startTime = parseTimestamp(line.getAttribute("begin"));
                    parsedLine.lead.endTime = parseTimestamp(line.getAttribute("end"));

                    NodeList spans = line.getElementsByTagNameNS(ns, "span");

                    for(int j = 0; j < spans.getLength(); j++) {
                        Element word = (Element) spans.item(j);

                        boolean isBackground = isBackground(word, ttm);

                        SyllableMetadata metadata = new SyllableMetadata();
                        metadata.startTime = parseTimestamp(word.getAttribute("begin"));
                        metadata.endTime = parseTimestamp(word.getAttribute("end"));
                        metadata.isPartOfWord = word.getNextSibling() != null && word.getNextSibling().getNodeType() != Node.TEXT_NODE;

                        if(!isBackground) {
                            metadata.text = word.getTextContent().trim().isEmpty() ? "" : word.getTextContent();
                            parsedLine.lead.syllables.add(metadata);
                        } else {
                            if(parsedLine.background.get(0).startTime == 0) {
                                parsedLine.background.get(0).startTime = parseTimestamp(word.getAttribute("begin"));
                            } else if(parsedLine.background.get(0).endTime == 0) {
                                parsedLine.background.get(0).endTime = parseTimestamp(word.getAttribute("end"));
                            }

                            metadata.text = word.getTextContent().trim().isEmpty() ? "" : removeParentheses(word.getTextContent());
                            parsedLine.background.get(0).syllables.add(metadata);
                        }
                    }

                    parsedLines.add(parsedLine);
                }

                SyllableSyncedLyrics lyrics = new  SyllableSyncedLyrics();
                lyrics.startTime = ((SyllableVocalSet)parsedLines.get(0)).lead.startTime;
                lyrics.endTime = ((SyllableVocalSet)parsedLines.get(parsedLines.size() - 1)).lead.endTime;
                lyrics.content = parsedLines;

                ProviderLyrics providerLyrics = new ProviderLyrics();
                providerLyrics.syllableLyrics = lyrics;
                providerLyrics.lineLyrics = null;
                providerLyrics.staticLyrics = null;

                return providerLyrics;
            }
        } catch (Exception e) {
            Log.e("SpotifyPlus", e.getMessage(), e);
        }

        return null;
    }

    private boolean isBackground(Node node, String ttmNamespace) {
        Node parent = node.getParentNode();

        while (parent != null) {
            if (parent instanceof Element) {
                Element element = (Element) parent;
                if ("x-bg".equals(element.getAttributeNS(ttmNamespace, "role"))) return true;
            }

            parent = parent.getParentNode();
        }

        return false;
    }

    private double parseTimestamp(String input) {
        if (input == null || input.trim().isEmpty() || (!input.contains(".") && !input.contains(":"))) {
            return 0;
        }

        double[] multipliers = { 36e5, 6e4, 1e3, 1 };

        String normalized = input.contains(".") ? input : input + ".0";

        String[] rawParts = normalized.split("[:.]");
        int[] parts = new int[rawParts.length];

        for (int i = 0; i < rawParts.length; i++) {
            try {
                parts[i] = Integer.parseInt(rawParts[i]);
            } catch (NumberFormatException e) {
                parts[i] = 0;
            }
        }

        int[] finalParts = new int[4];

        if (parts.length > 4) {
            System.arraycopy(parts, parts.length - 4, finalParts, 0, 4);
        } else {
            int offset = 4 - parts.length;
            System.arraycopy(parts, 0, finalParts, offset, parts.length);
        }

        double totalMilliseconds = 0;
        for (int i = 0; i < 4; i++) {
            totalMilliseconds += finalParts[i] * multipliers[i];
        }

        return totalMilliseconds / 1000.0;
    }

    private String removeParentheses(String input) {
        if(input.contains("(") && input.contains(")")) {
            input = input.replace("(", "");
            return input.replace(")", "");
        }

        if(input.contains("(")) {
            return input.replace("(", "");
        }

        if(input.contains(")")) {
            return input.replace(")", "");
        }

        return input;
    }
}
