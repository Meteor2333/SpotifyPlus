package com.lenerd46.spotifyplus.hooks;

import android.app.Activity;
import android.app.AndroidAppHelper;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.lenerd46.spotifyplus.R;
import com.lenerd46.spotifyplus.References;

import org.luckypray.dexkit.query.FindClass;
import org.luckypray.dexkit.query.FindField;
import org.luckypray.dexkit.query.FindMethod;
import org.luckypray.dexkit.query.matchers.ClassMatcher;
import org.luckypray.dexkit.query.matchers.FieldMatcher;
import org.luckypray.dexkit.query.matchers.FieldsMatcher;
import org.luckypray.dexkit.query.matchers.MethodMatcher;
import org.luckypray.dexkit.query.matchers.MethodsMatcher;
import org.luckypray.dexkit.query.matchers.ParametersMatcher;

import java.lang.ref.WeakReference;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;
import kotlin.jvm.functions.Function0;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

// Spotify changed their context menu to use jetpack compose in newer versions
// So the method of adding a new button in this hook is quite different from the recycle view version
public class NewContextMenuHook extends SpotifyHook {
    private static volatile Object cachedOriginalViewModel = null;
    private static volatile Object cachedViewModel = null;

    private static String trackTitle = "";
    private static String trackArtist = "";

    private static final ThreadLocal<Integer> spotifyPlusRenderDepth = ThreadLocal.withInitial(() -> 0);
    private static volatile Object cachedSpotifyPlusTrf = null;

    private static Class<?> interfaceClass;

    @Override
    protected void hook() {
        try {
            // We have to do it here as well as down there somewhere, otherwise Spotify won't show it in the now playing context menu for some reason?
            SpotifyTitleOverride.install();
            SpotifyTitleOverride.overrideSpotifyStringById(0x7f131428, "Open in Last.fm");

            // Header
            var classesThing = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().className("com.spotify.localfiles.mediastoreimpl.LocalFilesProperties$dataProps$2")));

            Class<?> kyx0 = classesThing.get(0).getInstance(lpparm.classLoader).getInterfaces()[0];

//            Class<?> gff = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().methods(MethodsMatcher.create().count(4)
//                    .add(MethodMatcher.create().returnType(boolean.class).name("equals").paramCount(1))
//                    .add(MethodMatcher.create().returnType(int.class).name("hashCode").paramCount(0).usingNumbers(31, 0))
//            ).fields(FieldsMatcher.create().count(3)
//                    .add(FieldMatcher.create().type(String.class))
//                    .add(FieldMatcher.create().type(String.class))
//                    .add(FieldMatcher.create().type(kyx0))
//            ))).get(0).getInstance(lpparm.classLoader);
            boolean newContextMenu;

            var jffClasses = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().methods(MethodsMatcher.create().count(3)
                    .add(MethodMatcher.create().returnType(boolean.class).name("equals").paramCount(1))
                    .add(MethodMatcher.create().returnType(int.class).name("hashCode").paramCount(0).usingNumbers(31, 0))
                    .add(MethodMatcher.create().name("<init>").paramCount(4))
            ).fields(FieldsMatcher.create().count(3)
                    .add(FieldMatcher.create().type(String.class))
                    .add(FieldMatcher.create().type(kyx0))
            )));

            if (jffClasses.isEmpty()) {
                jffClasses = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().methods(MethodsMatcher.create().count(3)
                        .add(MethodMatcher.create().returnType(boolean.class).name("equals").paramCount(1))
                        .add(MethodMatcher.create().returnType(int.class).name("hashCode").paramCount(0).usingNumbers(31, 0))
                        .add(MethodMatcher.create().name("<init>").paramCount(3))
                ).fields(FieldsMatcher.create().count(2)
                        .add(FieldMatcher.create().type(Function0.class))
                )));

                newContextMenu = true;
            } else {
                newContextMenu = false;
            }

            Class<?> jffClass = jffClasses.get(0).getInstance(lpparm.classLoader);

            var c8fClasses = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().usingStrings("mute_playback", "resume_pause_button", "hit", "item_to_be_resumed", "seek_bar")));

            if (newContextMenu) {
                c8fClasses = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().usingStrings("block_confirmation_dialog", "request_received_view", "ui_reveal", "reject_confirmation_dialog")));
            }

            final Class<?> c8f = c8fClasses.get(0).getInstance(lpparm.classLoader);

//            XposedBridge.log("[SpotifyPlus] Found " + jffClasses.size() + " classes");
//            jffClasses.forEach(x -> XposedBridge.log("[SpotifyPlus] " + x.getName()));

            org.luckypray.dexkit.result.ClassDataList finalC8fClasses = c8fClasses;
            XposedBridge.log("[SpotifyPlus] c8f: " + c8f.getName());
            XposedBridge.hookAllMethods(c8f, "invoke", new XC_MethodHook() {
                        @Override
                        protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                            int branch = bridge.findField(FindField.create().searchInClass(finalC8fClasses).matcher(FieldMatcher.create().type(int.class))).get(0).getFieldInstance(lpparm.classLoader).getInt(param.thisObject);
//                            if (branch != 19) return;

                            // These variable names are the class names in version 9.1.24.1739
                            Object jff = param.args[0];
                            if (jff == null || jff.getClass() != jffClass) return;

                            SharedPreferences ref = References.getPreferences();
                            String username = ref.getString("last_fm_username", "null");
                            if (username.equals("null")) return;

                            Object gff = XposedHelpers.getObjectField(jff, newContextMenu ? "a" : "b"); // It will probably stay as b, right? (I guess not sadly)
                            if (gff == null) {
                                XposedBridge.log("[SpotifyPlus] It did not stay as b :(");
                            }

                            String title = (String) XposedHelpers.getObjectField(gff, "a");
                            String subtitleTextFull = (String) XposedHelpers.getObjectField(gff, "c");

                            if (subtitleTextFull.contains("scrobbles")) {
                                return;
                            }

                            String artist = subtitleTextFull.split(" • ")[0];

                            trackTitle = title;
                            trackArtist = artist;

                            WeakReference<String> oldSubtitle = new WeakReference<>(subtitleTextFull);
                            WeakReference<Object> subtitleObject = new WeakReference<>(gff);

                            Activity activity = References.currentActivity;
                            OkHttpClient client = new OkHttpClient();
                            Request request;

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {                                      //  Yeah I know this is bad, but whatever
                                request = new Request.Builder().url("https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=3713c2e0b7493e945555b7f52dc4232e&artist=" + URLEncoder.encode(artist, StandardCharsets.UTF_8) + "&track=" + URLEncoder.encode(title, StandardCharsets.UTF_8) + "&format=json&user=" + URLEncoder.encode(username, StandardCharsets.UTF_8)).build();
                            } else {
                                request = new Request.Builder().url("https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=3713c2e0b7493e945555b7f52dc4232e&artist=" + URLEncoder.encode(artist) + "&track=" + URLEncoder.encode(title) + "&format=json&user=" + URLEncoder.encode(username)).build();
                            }

                            // Probably not the best way to do this, but you know what, it works
                            // We're blocking the main UI thread here, which Android explicitly asks you not to do
                            CountDownLatch latch = new CountDownLatch(1);
                            AtomicReference<String> resultRef = new AtomicReference<>();
                            AtomicReference<Exception> exceptionRef = new AtomicReference<>();

                            new Thread(() -> {
                                try (Response response = client.newCall(request).execute()) {
                                    ResponseBody body = response.body();
                                    resultRef.set(body != null ? body.string() : null);
                                } catch (Exception e) {
                                    exceptionRef.set(e);
                                } finally {
                                    latch.countDown();
                                }
                            }).start();
                            try {
                                latch.await();

                                if (exceptionRef.get() != null) {
                                    throw new RuntimeException(exceptionRef.get());
                                }
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                            }

                            if (resultRef.get() != null) {
                                try {
                                    JsonObject root = JsonParser.parseString(resultRef.get()).getAsJsonObject();
                                    String scrobbles = root.getAsJsonObject("track").get("userplaycount").getAsString();

                                    Object subtitle = subtitleObject.get();
                                    String oldSubtitleText = oldSubtitle.get();

                                    XposedHelpers.setObjectField(subtitle, "c", oldSubtitleText + " • " + scrobbles + " scrobbles");
                                } catch (Exception e) {
                                    XposedBridge.log("[SpotifyPlus] Failed to fetch scrobbles");
                                    XposedBridge.log("[SpotifyPlus] " + e);

                                    Handler handler = new Handler(Looper.getMainLooper());
                                    handler.post(() -> Toast.makeText(activity, "Failed to fetch scrobbles", Toast.LENGTH_SHORT).show());
                                }
                            } else {
                                XposedBridge.log("[SpotifyPlus] Failed to fetch scrobbles");

                                Handler handler = new Handler(Looper.getMainLooper());
                                handler.post(() -> Toast.makeText(activity, "Failed to fetch scrobbles", Toast.LENGTH_SHORT).show());
                            }
                        }
                    }
            );

            // Buttons

            Class<?> headerObject = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().usingStrings("ContextMenuViewModel cannot contain items with duplicate itemResId. id="))).get(0).getInstance(lpparm.classLoader);
            Class<?> radioButtonClass = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().usingStrings("audiobook_supplementary_content"))).get(0).getInstance(lpparm.classLoader);
            XposedBridge.hookAllConstructors(headerObject, new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    try {
                        List<?> list = (List<?>) param.args[1];
                        if (list == null) return;

                        if (cachedOriginalViewModel == null && list.size() >= 3) {
                            Object probablyAddToPlaylist = list.get(3);
                            cachedOriginalViewModel = probablyAddToPlaylist.getClass().getMethod("getViewModel").invoke(probablyAddToPlaylist);

                            interfaceClass = Arrays.stream(cachedOriginalViewModel.getClass().getDeclaredFields()).filter(x -> x.getName().equals("d")).collect(Collectors.toList()).get(0).get(cachedOriginalViewModel).getClass().getInterfaces()[0];

//                            Object trfObject = XposedHelpers.getObjectField(list.get(1).getClass().getMethod("getViewModel").invoke(list.get(1)), "d");
//                            trfClass = trfObject.getClass();
//                            rsfClass = XposedHelpers.getObjectField(trfObject, "a").getClass();
//
//                            for(int i = 0; i < list.size() - 1; i++) {
//                                XposedBridge.log("[SpotifyPlus] Thing " + i + ": " + XposedHelpers.getObjectField(list.get(i).getClass().getMethod("getViewModel").invoke(list.get(i)), "d").getClass().getName());
//                            }
                        }

                        if (list.stream().anyMatch(item -> {
                            if (item == null || item.getClass() != radioButtonClass) return false;
                            Object markerValue = XposedHelpers.getObjectField(item, "c");
                            return markerValue.equals("spotifyplus_open_last_fm");
                        })) return;

                        Context context = AndroidAppHelper.currentApplication();
                        if (context == null) return;

                        Object radioButton = XposedHelpers.newInstance(radioButtonClass, context, "spotifyplus_open_last_fm");

                        ArrayList<Object> newList = new ArrayList<>(list.size() + 1);
                        newList.add(radioButton);
                        newList.addAll(list);
                        param.args[1] = newList;
                    } catch (Exception e) {
                        XposedBridge.log(e);
                    }
                }
            });

            XposedBridge.hookAllMethods(radioButtonClass, "getViewModel", new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    String marker = XposedHelpers.getObjectField(param.thisObject, "c").toString();
                    if (!marker.equals("spotifyplus_open_last_fm")) return;

                    Object viewModel = null;

                    if (cachedViewModel != null) {
                        viewModel = cachedViewModel;
                    } else {
                        if (cachedOriginalViewModel == null) return;
                        Class<?> pgf = cachedOriginalViewModel.getClass();

//                        Class<?> pgf = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().fields(FieldsMatcher.create().count(11)
//                                .add(FieldMatcher.create().type(String.class))
//                                .add(FieldMatcher.create().type(boolean.class))
//                                .add(FieldMatcher.create().type(boolean.class))
//                                .add(FieldMatcher.create().type(boolean.class))
//                                .add(FieldMatcher.create().type(boolean.class))
//                                .add(FieldMatcher.create().type(boolean.class))
//                        ).methods(MethodsMatcher.create().countMin(4)
//                                .add(MethodMatcher.create().name("hashCode").returnType(int.class).usingNumbers(31, 0, 1237))
//                        ))).get(0).getInstance(lpparm.classLoader);

                        SpotifyTitleOverride.install();
                        SpotifyTitleOverride.overrideSpotifyStringById(0x7f131428, "Open in Last.fm");

                        Object oldTitleObject = XposedHelpers.getObjectField(cachedOriginalViewModel, "b");
                        if (oldTitleObject == null) return;

                        Object title = XposedHelpers.newInstance(oldTitleObject.getClass(), 0x7f131428);
                        Object template = cachedOriginalViewModel;
                        if (template == null) return;

                        Constructor<?> ctor = Arrays.stream(pgf.getDeclaredConstructors()).filter(x -> x.getParameterCount() == 10 && x.getParameterTypes()[x.getParameterCount() - 1] == int.class).collect(Collectors.toList()).get(0);
                        Class<?>[] parameters = ctor.getParameterTypes();

                        // I don't know what button we cached for sure, so we look for these fields reflectively
                        Object hgf = getField(template, parameters[3]);
                        Object y6y0 = getField(template, parameters[4]);
                        Object h0y0 = getField(template, parameters[8]);

                        Boolean[] booleans = getFirstBooleans(template);

                        viewModel = ctor.newInstance("spotifyplus_open_last_fm", title, null, hgf, y6y0, booleans[0], booleans[1], booleans[2], h0y0, 1988);

                        cachedViewModel = viewModel;
                    }

                    param.setResult(viewModel);
                }
            });

            // Click Handler
            XposedHelpers.findAndHookMethod(ContextWrapper.class, "startService", Intent.class, new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    try {
                        Intent intent = (Intent) param.args[0];

                        if (intent.getComponent().getClassName().equals("com.spotify.radio.radio.formatlist.RadioFormatListService") && intent.hasExtra(".seed_uri")) {
                            String seed = intent.getStringExtra(".seed_uri");

                            if (seed.equals("spotifyplus_open_last_fm")) {
                                Context context = (Context) param.thisObject;

                                Intent newIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.last.fm/music/" + URLEncoder.encode(trackArtist) + "/_/" + URLEncoder.encode(trackTitle)));
                                newIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                context.startActivity(newIntent);

                                param.setResult(null);
                            }
                        }
                    } catch (Exception e) {
                        XposedBridge.log(e);
                    }
                }
            });

            // Icon
            Class<?> iconClass = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().usingEqStrings("ContextMenuItem"))).get(0).getInstance(lpparm.classLoader);
            var methods = bridge.findMethod(FindMethod.create().searchInClass(Collections.singletonList(bridge.getClassData(iconClass))).matcher(MethodMatcher.create().params(ParametersMatcher.create().count(6))));
            Method method = methods.get(0).getMethodInstance(lpparm.classLoader);

            XposedBridge.hookMethod(method, new XC_MethodHook() {
                        @Override
                        protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                            if (!isRenderingSpotifyPlusRow()) return;

                            try {
                                Object customTrf = getLastfmIcon();
                                if (customTrf == null) return;

                                param.args[1] = customTrf;
                            } catch (Throwable t) {
                                XposedBridge.log("[SpotifyPlus] Failed swapping gc0.c icon: " + t);
                            }
                        }
                    }
            );

            var uweClasses = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().fields(FieldsMatcher.create().count(2).add(FieldMatcher.create().type(int.class))).usingStrings("CreateMenuItemElement")));
            Class<?> uweClass = uweClasses.get(0).getInstance(lpparm.classLoader);

            XposedBridge.hookAllMethods(uweClass, "invoke", new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                    try {
                        int branch = bridge.findField(FindField.create().searchInClass(uweClasses).matcher(FieldMatcher.create().type(int.class))).get(0).getFieldInstance(lpparm.classLoader).getInt(param.thisObject);
                        if (branch != 10) return;

                        if (param.args.length < 2) return;
                        Object obj2 = param.args[1]; // psf in case 10
                        if (!isSpotifyPlusRow(obj2)) return;

                        pushSpotifyPlusRender();
                        param.setObjectExtra("spotifyplus_row_render", Boolean.TRUE);
                    } catch (Throwable t) {
                        XposedBridge.log("[SpotifyPlus] uwe invoke before failed: " + t);
                    }
                }

                @Override
                protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                    try {
                        if (Boolean.TRUE.equals(param.getObjectExtra("spotifyplus_row_render"))) {
                            popSpotifyPlusRender();
                        }
                    } catch (Throwable t) {
                        XposedBridge.log("[SpotifyPlus] uwe invoke after failed: " + t);
                    }
                }
            });
        } catch (Exception e) {
            XposedBridge.log(e);
        }
    }

    private Object getLastfmIcon() {
        try {
            if (cachedSpotifyPlusTrf != null) return cachedSpotifyPlusTrf;

            Context appContext = AndroidAppHelper.currentApplication();
            if (appContext == null) {
                XposedBridge.log("[SpotifyPlus] appContext was null");
                return null;
            }

            Drawable drawable = References.modResources.getDrawable(R.drawable.lastfm);

            if (drawable == null) {
                XposedBridge.log("[SpotifyPlus] module drawable was null");
                return null;
            }

            LayerDrawable layerDrawable;
            if (drawable instanceof LayerDrawable) {
                layerDrawable = (LayerDrawable) drawable;
            } else {
                layerDrawable = new LayerDrawable(new android.graphics.drawable.Drawable[]{drawable});
            }

            var classes = bridge.findClass(FindClass.create().matcher(ClassMatcher.create().addInterface(interfaceClass.getName())));

            // I see no obvious way to differentiate the two, so why not try both? One of them should work
            Class<?> firstClass = classes.get(0).getInstance(lpparm.classLoader);
            Class<?> secondClass = firstClass.getFields()[0].getType();

            for (var clazz : classes) {
                Class<?> tryClass = clazz.getInstance(lpparm.classLoader);
                Class<?> a = tryClass.getFields()[0].getType();

                if (a.getFields()[0].getDeclaringClass() == LayerDrawable.class) {
                    firstClass = tryClass;
                    secondClass = a;
                }
            }

            Object rsf = XposedHelpers.newInstance(secondClass, layerDrawable);
            Object trf = XposedHelpers.newInstance(firstClass, rsf);

            cachedSpotifyPlusTrf = trf;
            return trf;
        } catch (Throwable t) {
            XposedBridge.log("[SpotifyPlus] Failed to create custom trf: " + t);
            return null;
        }
    }

    private static void pushSpotifyPlusRender() {
        spotifyPlusRenderDepth.set(spotifyPlusRenderDepth.get() + 1);
    }

    private static void popSpotifyPlusRender() {
        int depth = spotifyPlusRenderDepth.get() - 1;
        if (depth <= 0) {
            spotifyPlusRenderDepth.remove();
        } else {
            spotifyPlusRenderDepth.set(depth);
        }
    }

    private static boolean isRenderingSpotifyPlusRow() {
        Integer depth = spotifyPlusRenderDepth.get();
        return depth != null && depth > 0;
    }

    private static boolean isSpotifyPlusRow(Object obj) {
        if (obj == null) return false;
        try {
            Object dsf = XposedHelpers.getObjectField(obj, "a"); // psf.a
            if (dsf == null) return false;
            Object key = XposedHelpers.getObjectField(dsf, "a"); // dsf.a
            return "spotifyplus_open_last_fm".equals(key);
        } catch (Throwable ignored) {
            return false;
        }
    }

    private Object getField(Object obj, Class<?> wantType) {
        Class<?> c = obj.getClass();
        while (c != null && c != Object.class) {
            for (Field f : c.getDeclaredFields()) {
                try {
                    f.setAccessible(true);
                    Object v = f.get(obj);
                    if (v == null) continue;
                    if (wantType.isInstance(v)) return v;
                } catch (Throwable ignored) {
                }
            }
            c = c.getSuperclass();
        }
        return null;
    }

    private Boolean[] getFirstBooleans(Object obj) {
        try {
            ArrayList<Boolean> out = new ArrayList<>();
            for (Field f : obj.getClass().getDeclaredFields()) {
                if (f.getType() == boolean.class) {
                    f.setAccessible(true);
                    out.add(f.getBoolean(obj));
                    if (out.size() == 3) break;
                }
            }
            if (out.size() < 3) return null;
            return out.toArray(new Boolean[0]);
        } catch (Throwable t) {
            return null;
        }
    }
}
