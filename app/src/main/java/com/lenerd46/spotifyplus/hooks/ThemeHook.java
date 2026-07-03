package com.lenerd46.spotifyplus.hooks;

<<<<<<< Updated upstream
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
=======
import android.content.Context;
import android.content.res.ColorStateList;
import android.content.res.Resources;
import android.graphics.Color;
import android.view.View;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;

import java.util.Locale;
>>>>>>> Stashed changes

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class ThemeHook extends SpotifyHook {
<<<<<<< Updated upstream

    private static final String TAG = "[SpotifyPlus][ComposePaletteOverride]";

    // AMOLED-ish replacements
    private static final int COLOR_BLACK = 0xFF000000;
    private static final int COLOR_NEAR_BLACK = 0xFF000000;

    @Override
    protected void hook() {
        try {
            Class<?> rjoClass = XposedHelpers.findClass("p.rjo", lpparm.classLoader);

            int hooked = 0;
            for (Method method : rjoClass.getDeclaredMethods()) {
                if (!method.getName().equals("a")) continue;
                if (!Modifier.isStatic(method.getModifiers())) continue;
                if (method.getParameterTypes().length != 1) continue;

                XposedBridge.hookMethod(method, new XC_MethodHook() {
                    @Override
                    protected void afterHookedMethod(MethodHookParam param) {
                        try {
                            if (param.hasThrowable()) return;

                            Object paletteRoot = param.getResult();
                            if (paletteRoot == null) return;

                            applyPaletteOverrides(paletteRoot);
                        } catch (Throwable t) {
                            XposedBridge.log(TAG + " Error overriding palette: " + t);
                        }
                    }
                });

                hooked++;
                XposedBridge.log(TAG + " Hooked p.rjo.a overload: " + method);
            }

            XposedBridge.log(TAG + " Total hooked rjo.a overloads: " + hooked);
        } catch (Throwable t) {
            XposedBridge.log(TAG + " Failed to hook rjo.a: " + t);
        }
    }

    private void applyPaletteOverrides(Object bno) {
        if (bno == null) return;

        /*
         * From your logs:
         *
         * p.bno
         *   .a = p.vko
         *      .a = p.j1o  -> dark surface group
         *      .b = p.j1o  -> white alpha ramp, leave alone
         *      .c = #121212
         *      .d = #1F1F1F
         *      .e = #000000
         *   .d = p.qoo
         *      .b = #292929
         *
         * We only touch the dark neutral colors for now.
         */

        Object vko = getFieldValue(bno, "a");
        if (vko != null) {
            // Direct dark neutral fields on p.vko
            replacePackedColorField(vko, "c", 0xFF121212, COLOR_BLACK);
            replacePackedColorField(vko, "d", 0xFF1F1F1F, COLOR_BLACK);
            replacePackedColorField(vko, "e", 0xFF000000, COLOR_BLACK);

            // Nested p.j1o dark ramp inside p.vko.a
            Object darkRamp = getFieldValue(vko, "a");
            if (darkRamp != null) {
                replacePackedColorField(darkRamp, "a", 0xFF1F1F1F, COLOR_BLACK);
                replacePackedColorField(darkRamp, "b", 0xFF2A2A2A, COLOR_NEAR_BLACK);
                replacePackedColorField(darkRamp, "c", 0xFF191919, COLOR_BLACK);
            }
        }

        Object qoo = getFieldValue(bno, "d");
        if (qoo != null) {
            replacePackedColorField(qoo, "b", 0xFF292929, COLOR_NEAR_BLACK);
        }
    }

    private void replacePackedColorField(Object target, String fieldName, int fromArgb, int toArgb) {
        try {
            Field field = findField(target.getClass(), fieldName);
            if (field == null) {
                XposedBridge.log(TAG + " Missing field " + target.getClass().getName() + "." + fieldName);
                return;
            }

            field.setAccessible(true);

            if (field.getType() != long.class && field.getType() != Long.TYPE) {
                XposedBridge.log(TAG + " Field is not long: " + target.getClass().getName() + "." + fieldName
                        + " type=" + field.getType().getName());
                return;
            }

            long currentPacked = field.getLong(target);
            int currentArgb = packedToArgb(currentPacked);

            if (currentArgb != fromArgb) {
                return;
            }

            long newPacked = argbToPacked(toArgb);
            if (currentPacked == newPacked) {
                return;
            }

            field.setLong(target, newPacked);

            XposedBridge.log(
                    TAG + " Replaced "
                            + target.getClass().getName() + "." + fieldName
                            + " " + toHexArgb(currentArgb)
                            + " -> " + toHexArgb(toArgb)
            );
        } catch (Throwable t) {
            XposedBridge.log(TAG + " Failed replacing field "
                    + target.getClass().getName() + "." + fieldName + ": " + t);
        }
    }

    private Object getFieldValue(Object target, String fieldName) {
        try {
            Field field = findField(target.getClass(), fieldName);
            if (field == null) {
                XposedBridge.log(TAG + " Missing field " + target.getClass().getName() + "." + fieldName);
                return null;
            }

            field.setAccessible(true);
            return field.get(target);
        } catch (Throwable t) {
            XposedBridge.log(TAG + " Failed reading field "
                    + target.getClass().getName() + "." + fieldName + ": " + t);
=======
    private static final int BG = Color.rgb(214, 240, 251);
    private static final int SURFACE = Color.rgb(235, 248, 254);
    private static final int SURFACE_2 = Color.rgb(196, 231, 246);
    private static final int SURFACE_HOVER = Color.rgb(181, 223, 242);
    private static final int SURFACE_PRESS = Color.rgb(155, 207, 233);

    private static final int TEXT = Color.rgb(8, 34, 52);
    private static final int TEXT_SUBDUED = Color.rgb(73, 110, 130);

    private static final int ACCENT = Color.rgb(0, 119, 182);
    private static final int ACCENT_HOVER = Color.rgb(0, 150, 214);
    private static final int ACCENT_PRESS = Color.rgb(0, 92, 151);
    private static final int ON_ACCENT = Color.rgb(244, 251, 255);

    private static final int MEDIA_SURFACE = Color.rgb(5, 74, 116);
    private static final int MEDIA_SURFACE_2 = Color.rgb(7, 55, 86);
    private static final int OVER_MEDIA = MEDIA_SURFACE;

    private static boolean loggedViewBg;

    @Override
    protected void hook() {
        ClassLoader cl = lpparm.classLoader;

        try {
            Class<?> c7z0 = XposedHelpers.findClass("p.c7z0", cl);

            XposedHelpers.findAndHookMethod(c7z0, "k", Context.class, int.class, int.class, new XC_MethodHook() {
                @Override protected void afterHookedMethod(MethodHookParam param) {
                    Integer color = colorForAttr((Context) param.args[0], (int) param.args[1]);
                    if (color != null) param.setResult(color);
                }
            });

            XposedHelpers.findAndHookMethod(c7z0, "l", View.class, int.class, new XC_MethodHook() {
                @Override protected void afterHookedMethod(MethodHookParam param) {
                    View view = (View) param.args[0];
                    Integer color = colorForAttr(view.getContext(), (int) param.args[1]);
                    if (color != null) param.setResult(color);
                }
            });
        } catch (Throwable t) {
            XposedBridge.log("SpotifyPlus ThemeHook: semantic attr hooks failed: " + t);
        }

        hookResourceColors();
        hookComposeTheme(cl);
        hookAndroidBackgrounds();
        hookHubsGlueBackgrounds(cl);
    }

    private void hookResourceColors() {
        XC_MethodHook resColorHook = new XC_MethodHook() {
            @Override protected void afterHookedMethod(MethodHookParam param) {
                Resources res = (Resources) param.thisObject;
                Integer color = colorForResource(res, (int) param.args[0]);
                if (color != null) param.setResult(color);
            }
        };

        XC_MethodHook ctxColorHook = new XC_MethodHook() {
            @Override protected void afterHookedMethod(MethodHookParam param) {
                Context ctx = (Context) param.thisObject;
                Integer color = colorForResource(ctx.getResources(), (int) param.args[0]);
                if (color != null) param.setResult(color);
            }
        };

        XC_MethodHook stateListHook = new XC_MethodHook() {
            @Override protected void afterHookedMethod(MethodHookParam param) {
                Resources res = (Resources) param.thisObject;
                Integer color = colorForResource(res, (int) param.args[0]);
                if (color != null) param.setResult(ColorStateList.valueOf(color));
            }
        };

        safeHook(Resources.class, "getColor", new Object[]{int.class, resColorHook});
        safeHook(Resources.class, "getColor", new Object[]{int.class, Resources.Theme.class, resColorHook});
        safeHook(Context.class, "getColor", new Object[]{int.class, ctxColorHook});
        safeHook(Resources.class, "getColorStateList", new Object[]{int.class, stateListHook});
        safeHook(Resources.class, "getColorStateList", new Object[]{int.class, Resources.Theme.class, stateListHook});
    }

    private static void safeHook(Class<?> cls, String method, Object[] args) {
        try {
            XposedHelpers.findAndHookMethod(cls, method, args);
        } catch (Throwable ignored) {}
    }

    private Integer colorForAttr(Context ctx, int attrId) {
        try {
            return colorForName(ctx.getResources().getResourceEntryName(attrId));
        } catch (Throwable ignored) {
>>>>>>> Stashed changes
            return null;
        }
    }

<<<<<<< Updated upstream
    private Field findField(Class<?> cls, String name) {
        Class<?> current = cls;
        while (current != null) {
            try {
                return current.getDeclaredField(name);
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        return null;
    }

    private int packedToArgb(long packed) {
        return (int) (packed >>> 32);
    }

    private long argbToPacked(int argb) {
        return ((long) argb) << 32;
    }

    private String toHexArgb(int color) {
        return String.format("0x%08X", color);
=======
    private Integer colorForResource(Resources res, int resId) {
        try {
            if (!"color".equals(res.getResourceTypeName(resId))) return null;
            return colorForName(res.getResourceEntryName(resId));
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static Integer colorForName(String rawName) {
        String n = rawName.toLowerCase(Locale.US);

        if (n.contains("spotify_green") || n.equals("green") || n.equals("accent")) return ACCENT;
        if (n.contains("green_light") || n.contains("brightaccentbackgroundhighlight")) return ACCENT_HOVER;
        if (n.contains("green_dark") || n.contains("brightaccentbackgroundpress")) return ACCENT_PRESS;

        if (n.contains("brightaccent") || n.contains("essentialbrightaccent") ||
                n.contains("textbrightaccent") || n.contains("colorprimary") ||
                n.contains("colorsecondary") || n.contains("colortertiary") ||
                n.contains("positive")) {
            if (n.contains("textbase") || n.contains("decorativebase")) return ON_ACCENT;
            return ACCENT;
        }

        if (n.contains("overmedia") && n.contains("textsubdued")) return TEXT_SUBDUED;
        if (n.contains("overmedia") && n.contains("text")) return TEXT;
        if (n.contains("overmedia") && n.contains("background")) return OVER_MEDIA;

        if (n.equals("gray_24") || n.equals("gray_30") || n.equals("gray_35") ||
                n.contains("default_card_background")) return SURFACE;

        if (n.contains("backgroundelevated") || n.contains("background_elevated") ||
                n.contains("cardbackground") || n.contains("default_card_background") ||
                n.equals("gray_background")) return SURFACE;

        if (n.contains("backgroundhighlight") || n.contains("background_highlight")) return SURFACE_HOVER;
        if (n.contains("backgroundpress") || n.contains("background_press")) return SURFACE_PRESS;

        if (n.contains("basebackground") || n.contains("base_background") ||
                n.equals("backgroundbase") || n.equals("colorsurface") ||
                n.equals("colorbackground")) return BG;

        if (n.contains("textsubdued") || n.contains("text_subdued") ||
                n.contains("essentialsubdued") || n.contains("coloronsurfacevariant")) return TEXT_SUBDUED;

        if (n.contains("textbase") || n.contains("text_base") ||
                n.contains("essentialbase") || n.contains("decorativebase") ||
                n.equals("coloronbackground") || n.equals("coloronsurface")) return TEXT;

        if (n.equals("spotify_black_7") || n.equals("spotify_black") || n.equals("black") ||
                n.equals("gray_7") || n.equals("gray_10") || n.equals("gray_15") ||
                n.equals("gray_20") || n.equals("sidedrawer_background") ||
                n.equals("local_files_background")) return BG;

        return null;
    }

    private volatile Object themedComposeBno;

    private void hookComposeTheme(final ClassLoader cl) {
        try {
            final Class<?> qud = XposedHelpers.findClass("p.qud", cl);
            final Class<?> bno = XposedHelpers.findClass("p.bno", cl);
            final Class<?> jpc = XposedHelpers.findClass("p.jpc", cl);

            Class<?> rjo = XposedHelpers.findClass("p.rjo", cl);
            XposedHelpers.findAndHookMethod(rjo, "a", qud, new XC_MethodHook() {
                @Override protected void afterHookedMethod(MethodHookParam param) {
                    Object themed = themedBno(cl);
                    if (themed != null) param.setResult(themed);
                }
            });

            Class<?> hno = XposedHelpers.findClass("p.hno", cl);
            XC_MethodHook replaceBnoArg = new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    Object themed = themedBno(cl);
                    if (themed != null) param.args[0] = themed;
                }
            };

            XposedHelpers.findAndHookMethod(hno, "b", bno, jpc, qud, int.class, replaceBnoArg);
            XposedHelpers.findAndHookMethod(hno, "d", bno, jpc, qud, int.class, replaceBnoArg);

            XposedBridge.log("SpotifyPlus ThemeHook: Compose/Encore theme hooks installed");
        } catch (Throwable t) {
            XposedBridge.log("SpotifyPlus ThemeHook: Compose/Encore hooks failed: " + t);
        }
    }

    private Object themedBno(ClassLoader cl) {
        Object cached = themedComposeBno;
        if (cached != null) return cached;

        synchronized (this) {
            if (themedComposeBno != null) return themedComposeBno;

            try {
                Class<?> yoo = XposedHelpers.findClass("p.yoo", cl);

                // p.yoo.d(background, elevatedBackground, textBase, textSubdued, accent)
                themedComposeBno = XposedHelpers.callStaticMethod(
                        yoo,
                        "d",
                        composeColor(BG),
                        composeColor(SURFACE),
                        composeColor(TEXT),
                        composeColor(TEXT_SUBDUED),
                        composeColor(ACCENT)
                );
                return themedComposeBno;
            } catch (Throwable t) {
                XposedBridge.log("SpotifyPlus ThemeHook: failed to build Compose bno: " + t);
                return null;
            }
        }
    }

    private void hookComposeBackgrounds(ClassLoader cl) {
        try {
            Class<?> modifier = XposedHelpers.findClass("androidx.compose.ui.Modifier", cl);
            Class<?> shape = XposedHelpers.findClass("p.can0", cl);

            Class<?> qpe = XposedHelpers.findClass("p.qpe", cl);
            XposedHelpers.findAndHookMethod(qpe, "n", modifier, long.class, shape, new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    param.args[1] = remapComposeBackground((Long) param.args[1]);
                }
            });

            Class<?> e101 = XposedHelpers.findClass("p.e101", cl);
            XposedHelpers.findAndHookMethod(e101, "F", float.class, long.class, modifier, shape, new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    param.args[1] = remapComposeBackground((Long) param.args[1]);
                }
            });

            XposedBridge.log("SpotifyPlus ThemeHook: Compose background hooks installed");
        } catch (Throwable t) {
            XposedBridge.log("SpotifyPlus ThemeHook: Compose background hooks failed: " + t);
        }
    }

    private static long remapComposeBackground(long color) {
        if (color == 0L || color == 16L) return color;

        int argb = (int) (color >>> 32);
        int alpha = Color.alpha(argb);
        if (alpha < 240) return color;

        int r = Color.red(argb);
        int g = Color.green(argb);
        int b = Color.blue(argb);
        int max = Math.max(r, Math.max(g, b));
        int min = Math.min(r, Math.min(g, b));

        // Main page shell: #000000, #121212, #181818, etc.
        if (max <= 28 && max - min <= 8) {
            return composeColor(BG);
        }

        // Cards/chips/surfaces: #1f1f1f, #242424, #2a2a2a, #2c2c2c, etc.
        if (max <= 58 && max - min <= 12) {
            return composeColor(SURFACE);
        }

        return color;
    }

    private static long composeColor(int color) {
        return (((long) color) & 0xffffffffL) << 32;
    }

    private volatile boolean loggedComposeBgHit;

    private void hookComposeBackgroundNodes(ClassLoader cl) {
        try {
            Class<?> mj6 = XposedHelpers.findClass("p.mj6", cl);
            Class<?> nc8 = XposedHelpers.findClass("p.nc8", cl);
            Class<?> can0 = XposedHelpers.findClass("p.can0", cl);
            Class<?> zj6 = XposedHelpers.findClass("p.zj6", cl);
            Class<?> rze = XposedHelpers.findClass("p.rze", cl);
            final Class<?> p4q0 = XposedHelpers.findClass("p.p4q0", cl);

            XposedHelpers.findAndHookConstructor(mj6, long.class, nc8, can0, int.class, new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    int mask = (Integer) param.args[3];
                    if ((mask & 1) == 0) {
                        param.args[0] = remapComposeBackground((Long) param.args[0]);
                    }
                }
            });

            XposedHelpers.findAndHookMethod(zj6, "f", rze, new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    Object node = param.thisObject;

                    long color = XposedHelpers.getLongField(node, "L0");
                    long mapped = remapComposeBackground(color);
                    if (mapped != color) {
                        XposedHelpers.setLongField(node, "L0", mapped);
                        logComposeBgHit();
                    }

                    Object brush = XposedHelpers.getObjectField(node, "M0");
                    if (brush != null && p4q0.isInstance(brush)) {
                        long brushColor = XposedHelpers.getLongField(brush, "a");
                        long mappedBrush = remapComposeBackground(brushColor);
                        if (mappedBrush != brushColor) {
                            XposedHelpers.setObjectField(node, "M0", XposedHelpers.newInstance(p4q0, mappedBrush));
                            logComposeBgHit();
                        }
                    }
                }
            });

            XposedBridge.log("[SpotifyPlus] ThemeHook: Compose background node hooks installed");
        } catch (Throwable t) {
            XposedBridge.log("[SpotifyPlus] ThemeHook: Compose background node hooks failed: " + t);
        }
    }

    private void hookAndroidBackgrounds() {
        XposedBridge.log("SpotifyPlus ThemeHook: installing Android background hooks");

        XposedHelpers.findAndHookMethod(View.class, "setBackgroundColor", int.class, new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) {
                int oldColor = (int) param.args[0];
                int newColor = remapDarkBackground(oldColor);

                if (newColor != oldColor) {
                    param.args[0] = newColor;

                    if (!loggedViewBg) {
                        loggedViewBg = true;
                        View view = (View) param.thisObject;
                        XposedBridge.log(
                                "SpotifyPlus ThemeHook: View.setBackgroundColor hit "
                                        + view.getClass().getName()
                                        + " "
                                        + colorHex(oldColor)
                                        + " -> "
                                        + colorHex(newColor)
                        );
                    }
                }
            }
        });

        XposedHelpers.findAndHookConstructor(
                GradientDrawable.class,
                GradientDrawable.Orientation.class,
                int[].class,
                new XC_MethodHook() {
                    @Override
                    protected void beforeHookedMethod(MethodHookParam param) {
                        int[] colors = (int[]) param.args[1];
                        if (colors == null) return;

                        int[] mapped = colors.clone();
                        boolean changed = false;

                        for (int i = 0; i < mapped.length; i++) {
                            int newColor = remapHubsBackground(mapped[i]);
                            if (newColor != mapped[i]) {
                                mapped[i] = newColor;
                                changed = true;
                            }
                        }

                        if (changed) param.args[1] = mapped;
                    }
                }
        );

        XposedHelpers.findAndHookConstructor(ColorDrawable.class, int.class, new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) {
                int oldColor = (int) param.args[0];
                param.args[0] = remapDarkBackground(oldColor);
            }
        });

        XposedHelpers.findAndHookMethod(ColorDrawable.class, "setColor", int.class, new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) {
                int oldColor = (int) param.args[0];
                param.args[0] = remapDarkBackground(oldColor);
            }
        });

        XposedHelpers.findAndHookMethod(GradientDrawable.class, "setColor", int.class, new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) {
                int oldColor = (int) param.args[0];
                param.args[0] = remapDarkBackground(oldColor);
            }
        });

        XposedHelpers.findAndHookMethod(GradientDrawable.class, "setColors", int[].class, new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) {
                int[] colors = (int[]) param.args[0];
                if (colors == null) return;

                int[] mapped = colors.clone();
                boolean changed = false;

                for (int i = 0; i < mapped.length; i++) {
                    int newColor = remapDarkBackground(mapped[i]);
                    if (newColor != mapped[i]) {
                        mapped[i] = newColor;
                        changed = true;
                    }
                }

                if (changed) {
                    param.args[0] = mapped;
                }
            }
        });
    }

    private static int remapDarkBackground(int color) {
        int alpha = Color.alpha(color);
        if (alpha == 0) return color;

        int r = Color.red(color);
        int g = Color.green(color);
        int b = Color.blue(color);

        int max = Math.max(r, Math.max(g, b));
        int min = Math.min(r, Math.min(g, b));
        int luma = (r * 299 + g * 587 + b * 114) / 1000;
        boolean neutral = max - min <= 18;

        if (alpha >= 240) {
            if (neutral) {
                if (max <= 24) return BG;
                if (max <= 56) return SURFACE;
                if (max <= 92) return SURFACE_2;
            }

            // Spotify often uses album-art extracted colors for the mini-player/cards.
            // Keep those themed instead of letting red/brown/purple clash with the blue UI.
            if (luma <= 72) return MEDIA_SURFACE;
            if (luma <= 104 && max - min > 28) return MEDIA_SURFACE_2;
        }

        if (alpha >= 120 && neutral && max <= 24) {
            return withAlpha(MEDIA_SURFACE, alpha);
        }

        return color;
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    private static String colorHex(int color) {
        return "#" + String.format("%08X", color);
    }

    private void logComposeBgHit() {
        if (!loggedComposeBgHit) {
            loggedComposeBgHit = true;
            XposedBridge.log("[SpotifyPlus] ThemeHook: remapped at least one Compose background node");
        }
    }

    private volatile boolean loggedHubsBg;

    private void hookHubsGlueBackgrounds(final ClassLoader cl) {
        try {
            Class<?> hqu = XposedHelpers.findClass("p.hqu", cl);
            Class<?> hmv = XposedHelpers.findClass("p.hmv", cl);
            Class<?> dgw = XposedHelpers.findClass("p.dgw", cl);

            XC_MethodHook remapIntArg = new XC_MethodHook() {
                @Override
                protected void beforeHookedMethod(MethodHookParam param) {
                    int oldColor = (int) param.args[0];
                    int newColor = remapHubsBackground(oldColor);
                    if (newColor != oldColor) {
                        param.args[0] = newColor;
                        if (!loggedHubsBg) {
                            loggedHubsBg = true;
                            XposedBridge.log("SpotifyPlus ThemeHook: Hubs bg hit "
                                    + param.method
                                    + " "
                                    + colorHex(oldColor)
                                    + " -> "
                                    + colorHex(newColor));
                        }
                    }
                }
            };

            XposedHelpers.findAndHookMethod(hqu, "setColor", int.class, remapIntArg);
            XposedHelpers.findAndHookMethod(hmv, "setColor", int.class, remapIntArg);
            XposedHelpers.findAndHookMethod(hmv, "setSolidColor", int.class, remapIntArg);
            XposedHelpers.findAndHookMethod(dgw, "Y2", int.class, remapIntArg);

            XposedBridge.log("SpotifyPlus ThemeHook: Hubs/Glue background hooks installed");
        } catch (Throwable t) {
            XposedBridge.log("SpotifyPlus ThemeHook: Hubs/Glue background hooks failed: " + t);
        }
    }

    private static int remapHubsBackground(int color) {
        if (color == 0) return SURFACE_2;

        int alpha = Color.alpha(color);
        if (alpha == 0) return color;

        int r = Color.red(color);
        int g = Color.green(color);
        int b = Color.blue(color);

        int max = Math.max(r, Math.max(g, b));
        int min = Math.min(r, Math.min(g, b));
        int luma = (r * 299 + g * 587 + b * 114) / 1000;

        if (alpha >= 220) {
            if (max - min <= 20 && max <= 100) return SURFACE_2;

            // Server/album-derived preview backgrounds: black, red, purple, brown, etc.
            if (luma <= 130) return MEDIA_SURFACE;
        }

        return color;
>>>>>>> Stashed changes
    }
}