package com.lenerd46.spotifyplus.hooks;

import java.lang.reflect.Method;

import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

public class ThemeTest extends SpotifyHook {

    private static final String TAG = "[SpotifyPlus][ComposeColorReplace]";
    private static final long GREEN = 0xFF1ED76000000000L;
    private static final long BLACK = 0xFF00000000000000L;

    @Override
    protected void hook() {
        hookLongArgMethods("p.xa9", "X");
        hookLongArgMethods("p.vqz", "X");
    }

    private void hookLongArgMethods(String className, String methodName) {
        try {
            Class<?> cls = XposedHelpers.findClass(className, lpparm.classLoader);

            for (Method method : cls.getDeclaredMethods()) {
                if (!method.getName().equals(methodName)) continue;

                Class<?>[] params = method.getParameterTypes();
                int longIndex = -1;

                for (int i = 0; i < params.length; i++) {
                    if (params[i] == long.class) {
                        longIndex = i;
                        break;
                    }
                }

                if (longIndex == -1) continue;

                final int finalLongIndex = longIndex;

                XposedBridge.hookMethod(method, new XC_MethodHook() {
                    @Override
                    protected void beforeHookedMethod(MethodHookParam param) {
                        try {
                            long color = (Long) param.args[finalLongIndex];

                            if (color == GREEN) {
                                XposedBridge.log(TAG + " Replacing in " + method
                                        + " arg[" + finalLongIndex + "] "
                                        + longHex(color) + " -> " + longHex(BLACK));

                                param.args[finalLongIndex] = BLACK;
                            }
                        } catch (Throwable t) {
                            XposedBridge.log(TAG + " before error in " + method + ": " + t);
                        }
                    }

                    @Override
                    protected void afterHookedMethod(MethodHookParam param) {
                        try {
                            XposedBridge.log(TAG + " AFTER " + method.getDeclaringClass().getName()
                                    + "." + method.getName()
                                    + " args=" + formatArgs(param.args)
                                    + " result=" + shortObj(param.getResult()));
                        } catch (Throwable t) {
                            XposedBridge.log(TAG + " after error in " + method + ": " + t);
                        }
                    }
                });

                XposedBridge.log(TAG + " Hooked " + method);
            }
        } catch (Throwable t) {
            XposedBridge.log(TAG + " Failed hooking " + className + "." + methodName + ": " + t);
        }
    }

    private String formatArgs(Object[] args) {
        if (args == null) return "null";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < args.length; i++) {
            if (i > 0) sb.append(", ");
            Object arg = args[i];
            if (arg instanceof Long) {
                sb.append(longHex((Long) arg));
            } else {
                sb.append(shortObj(arg));
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private String shortObj(Object obj) {
        if (obj == null) return "null";
        return obj.getClass().getName() + "@"
                + Integer.toHexString(System.identityHashCode(obj))
                + " {" + obj + "}";
    }

    private String longHex(long value) {
        return String.format("0x%016X (topARGB=0x%08X)", value, (int) (value >>> 32));
    }
}