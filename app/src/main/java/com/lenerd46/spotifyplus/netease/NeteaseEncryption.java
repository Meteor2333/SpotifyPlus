package com.lenerd46.spotifyplus.netease;

import java.security.MessageDigest;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;

import de.robv.android.xposed.XposedBridge;

public class NeteaseEncryption {
    private static final String API_KEY = "e82ckenh8dichen8";
    private static final String API_FORMAT = "%s-36cd479b6b5-%s-36cd479b6b5-%s";
    private static final String API_SALT = "nobody%suse%smd5forencrypt";

    public static Map<String, String> encrypt(String url, String json) {
        String modifiedUrl = url.replace("eapi", "api");

        var digest = hexDigest(String.format(API_SALT, modifiedUrl, json));
        String text = String.format(API_FORMAT, modifiedUrl, json, digest);

        var encryptedData = aesEncryptEcb(text, API_KEY);

        return Map.of("params", encryptedData.toUpperCase());
    }

    private static String hexDigest(String input) {
        try {
            var bytes = MessageDigest.getInstance("MD5").digest(input.getBytes());
            return bytesToHexStreams(bytes);
        } catch (Exception e) {
            XposedBridge.log(e);
            return null;
        }
    }

    private static String aesEncryptEcb(String text, String key) {
        try {
            var cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            var keySpec = new SecretKeySpec(key.getBytes(), "AES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);

            var encryptedBytes = cipher.doFinal(text.getBytes());
            return bytesToHexStreams(encryptedBytes);
        } catch(Exception e) {
            XposedBridge.log(e);
            return null;
        }
    }

    public static String bytesToHexStreams(byte[] bytes) {
        return IntStream.range(0, bytes.length).mapToObj(i -> String.format("%02x", bytes[i])).collect(Collectors.joining());
    }
}
