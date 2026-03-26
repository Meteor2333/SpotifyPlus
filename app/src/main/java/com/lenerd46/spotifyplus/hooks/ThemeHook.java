package com.lenerd46.spotifyplus.hooks;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class ThemeHook extends SpotifyHook {

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
            return null;
        }
    }

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
    }
}