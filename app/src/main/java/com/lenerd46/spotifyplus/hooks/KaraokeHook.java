package com.lenerd46.spotifyplus.hooks;

import android.util.Log;
import de.robv.android.xposed.XC_MethodHook;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class KaraokeHook extends SpotifyHook {
    private static final Set<String> HOOKED_ONNEXT = Collections.synchronizedSet(new HashSet<>());
    private static volatile Object lastToggleObservable;

    @Override
    protected void hook() {
        XposedHelpers.findAndHookMethod("p.nu2", lpparm.classLoader, "create", XposedHelpers.findClass("p.axb0", lpparm.classLoader), new XC_MethodHook() {
            @Override
            protected void beforeHookedMethod(MethodHookParam param) throws Throwable {
                int a = XposedHelpers.getIntField(param.thisObject, "a");

                if (a == 3) {
                    XposedBridge.log("[SpotifyPlus] Vocal removal thing triggered");

                    Class<?> su2 = XposedHelpers.findClass("p.su2", lpparm.classLoader);

                    Object su2Instance = XposedHelpers.newInstance(su2, true, null);
                    param.setResult(su2Instance);
                }
            }
        });

        XposedHelpers.findAndHookConstructor(
                "p.ihh0",
                lpparm.classLoader,
                boolean.class,
                XposedHelpers.findClass("p.zrq0", lpparm.classLoader),
                new XC_MethodHook() {
                    @Override
                    protected void afterHookedMethod(MethodHookParam param) {
                        boolean share = (boolean) param.args[0];
                        Object vocalState = param.args[1];
                        XposedBridge.log("[SpotifyPlus] ihh0 created: share=" + share + ", vocalState=" + vocalState);
                    }
                }
        );

        XposedHelpers.findAndHookMethod("p.dxq", lpparm.classLoader,
                "f", Object.class, Object.class,
                new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Object rxz = param.args[1];
                        if (rxz != null && rxz.getClass().getName().equals("p.lxz")) {
                            // Try common boolean field names first; if they’re obfuscated (like "a"), use that.
                            try {
//                                XposedHelpers.setBooleanField(rxz, "a", true); // force “supported” flag
//                                XposedBridge.log("[SpotifyPlus] Forced lxz.a=true");
                            } catch (Throwable t) {
//                                XposedBridge.log("[SpotifyPlus] Failed to force lxz.a: " + t);
                            }
                        }

                        String n = rxz.getClass().getName();

                        if (n.equals("p.mxz") || n.equals("p.oxz") || n.equals("p.pxz")) {
                            XposedBridge.log("[SpotifyPlus] dxq.f evt=" + n + " -> " + rxz);
                        }
                    }
                });


        XposedHelpers.findAndHookMethod("p.ijx", lpparm.classLoader, "apply",
                Object.class,
                new XC_MethodHook() {
                    @Override
                    protected void afterHookedMethod(MethodHookParam param) {
                        Object out = param.getResult();
                        if (out != null && out.getClass().getName().equals("p.lxz")) {
                            XposedHelpers.setBooleanField(out, "a", true);
                            boolean enabled = XposedHelpers.getBooleanField(out, "a");   // guess: “supported?” / “enabled?”
                            boolean share = XposedHelpers.getBooleanField(out, "b");     // or maybe shareAvailable; adjust if fields differ

                            XposedBridge.log("[SpotifyPlus] ijx -> lxz enabled=" + enabled + " share=" + share);
                        }
                    }
                });

        XposedHelpers.findAndHookMethod("p.xyh", lpparm.classLoader, "apply", Object.class, new XC_MethodHook() {
            @Override
            protected void afterHookedMethod(MethodHookParam param) throws Throwable {
                int a = XposedHelpers.getIntField(param.thisObject, "a");

                if(a == 22) {
                    Object result = param.getResult();

                    if(result != null) {
                        XposedBridge.log("[SpotifyPlus] Result: " + result.toString());
                    }
                }
            }
        });

        XposedBridge.hookAllConstructors(
                XposedHelpers.findClass("p.oxz", lpparm.classLoader),
                new XC_MethodHook() {
                    @Override protected void afterHookedMethod(MethodHookParam param) {
                        XposedBridge.log("[SpotifyPlus] oxz constructed -> " + param.thisObject);
                    }
                }
        );

        Class<?> handler = XposedHelpers.findClass("p.twz", lpparm.classLoader);
        XposedBridge.hookAllMethods(handler, "apply", new XC_MethodHook() {
            @Override protected void beforeHookedMethod(MethodHookParam param) {
                Object eff = param.args[0];
                if (eff != null && eff.getClass().getName().equals("p.rwz")) {
                    XposedBridge.log("[SpotifyPlus] rwz reached handler: " + eff);
                }
            }
        });

        XposedBridge.hookAllMethods(
                XposedHelpers.findClass("io.reactivex.rxjava3.internal.observers.LambdaObserver", lpparm.classLoader),
                "onNext",
                new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Object v = param.args[0];
                        if (v != null && v.getClass().getName().equals("p.oxz")) {
                            XposedBridge.log("[SpotifyPlus] Rx onNext oxz: " + v);
                        }
                    }
                }
        );

        XposedBridge.hookAllMethods(
                XposedHelpers.findClass("p.twz", lpparm.classLoader),
                "apply",
                new XC_MethodHook() {
                    @Override protected void afterHookedMethod(MethodHookParam param) {
                        Object eff = param.args[0];
                        if (eff != null && eff.getClass().getName().equals("p.rwz")) {
                            Object res = param.getResult();
                            XposedBridge.log("[SpotifyPlus] twz.apply(rwz) returned: " +
                                    (res == null ? "null" : res.getClass().getName() + " -> " + res));
                        }
                    }
                }
        );

        String[] swallowers = {
                "io.reactivex.rxjava3.internal.operators.observable.ObservableOnErrorReturn$OnErrorReturnObserver",
                "io.reactivex.rxjava3.internal.operators.observable.ObservableOnErrorReturn$OnErrorReturnObserverImpl"
        };

        for (String c : swallowers) {
            try {
                Class<?> k = XposedHelpers.findClass(c, lpparm.classLoader);

                XposedBridge.hookAllMethods(k, "onError", new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Throwable t = (Throwable) param.args[0];
                        XposedBridge.log("[SpotifyPlus] OnErrorReturn swallowed error: " + t);
                        XposedBridge.log("[SpotifyPlus] " + Log.getStackTraceString(t));
                    }
                });

                XposedBridge.hookAllMethods(k, "onNext", new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Object v = param.args[0];
                        // Log what value the fallback turns into (or success value)
                        XposedBridge.log("[SpotifyPlus] OnErrorReturn onNext: " + (v == null ? "null" : v.getClass().getName() + " " + v));
                    }
                });

                XposedBridge.log("[SpotifyPlus] Hooked " + c);
            } catch (Throwable ignored) {}
        }

        try {
            Class<?> inner = XposedHelpers.findClass(
                    "io.reactivex.rxjava3.internal.operators.observable.ObservableSwitchMap$SwitchMapInnerObserver",
                    lpparm.classLoader
            );

            XposedBridge.hookAllMethods(inner, "onError", new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    Throwable t = (Throwable) param.args[0];
                    XposedBridge.log("[SpotifyPlus] SwitchMapInnerObserver.onError: " + t);
                    XposedBridge.log("[SpotifyPlus] " + Log.getStackTraceString(t));
                }
            });

            XposedBridge.hookAllMethods(inner, "onComplete", new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    XposedBridge.log("[SpotifyPlus] SwitchMapInnerObserver.onComplete");
                }
            });

            XposedBridge.hookAllMethods(inner, "onNext", new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    Object v = param.args[0];
                    XposedBridge.log("[SpotifyPlus] SwitchMapInnerObserver.onNext: " +
                            (v == null ? "null" : v.getClass().getName() + " " + v));
                }
            });

            XposedBridge.log("[SpotifyPlus] Hooked SwitchMapInnerObserver");
        } catch (Throwable t) {
            XposedBridge.log("[SpotifyPlus] Failed to hook SwitchMapInnerObserver: " + t);
        }

        String[] outers = {
                "io.reactivex.rxjava3.internal.operators.observable.ObservableSwitchMap$SwitchMapObserver",
                "io.reactivex.rxjava3.internal.operators.observable.ObservableSwitchMap$SwitchMapMainObserver"
        };

        for (String c : outers) {
            try {
                Class<?> k = XposedHelpers.findClass(c, lpparm.classLoader);

                XposedBridge.hookAllMethods(k, "onError", new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Throwable t = (Throwable) param.args[0];
                        XposedBridge.log("[SpotifyPlus] SwitchMap OUTER onError: " + t);
                        XposedBridge.log("[SpotifyPlus] " + Log.getStackTraceString(t));
                    }
                });

                XposedBridge.hookAllMethods(k, "onComplete", new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        XposedBridge.log("[SpotifyPlus] SwitchMap OUTER onComplete");
                    }
                });

                XposedBridge.log("[SpotifyPlus] Hooked " + c);
            } catch (Throwable ignored) {}
        }

        XposedBridge.hookAllMethods(
                XposedHelpers.findClass("p.twz", lpparm.classLoader),
                "apply",
                new XC_MethodHook() {
                    @Override protected void afterHookedMethod(MethodHookParam param) {
                        Object eff = param.args[0];
                        if (eff != null && eff.getClass().getName().equals("p.rwz")) {
                            Object out = param.getResult();
                            lastToggleObservable = out;
                            XposedBridge.log("[SpotifyPlus] twz.apply(rwz) -> " +
                                    (out == null ? "null" : out.getClass().getName() + "@" + System.identityHashCode(out)));

                            dumpObservableChain(param.getResult());
                        }
                    }
                }
        );

        // 2) Only trace subscribeActual for the toggle Observable instance
        XposedBridge.hookAllMethods(
                XposedHelpers.findClass("io.reactivex.rxjava3.internal.operators.observable.ObservableOnErrorReturn", lpparm.classLoader),
                "subscribeActual",
                new XC_MethodHook() {
                    @Override protected void beforeHookedMethod(MethodHookParam param) {
                        Object self = param.thisObject;
                        if (self != null && self == lastToggleObservable) {
                            Object observer = param.args[0];
                            XposedBridge.log("[SpotifyPlus] TOGGLE subscribeActual observer=" +
                                    (observer == null ? "null" : observer.getClass().getName()));
                            // optional: print a short stack to see who subscribed
                            XposedBridge.log("[SpotifyPlus] TOGGLE subscribe stack:\n" + Log.getStackTraceString(new Throwable()));
                        }
                    }
                }
        );
    }

    private static void dumpObservableChain(Object obs) {
        Object cur = obs;
        for (int i = 0; i < 25 && cur != null; i++) {
            XposedBridge.log("[SpotifyPlus] chain[" + i + "] " +
                    cur.getClass().getName() + "@" + System.identityHashCode(cur));

            Object next = null;
            try { next = XposedHelpers.getObjectField(cur, "source"); } catch (Throwable ignored) {}
            if (next == null) break;
            cur = next;
        }
    }

    private void hookObserverOnNextIfNeeded(ClassLoader cl, Object observerObj) {
        if (observerObj == null) return;
        String name = observerObj.getClass().getName();
        if (!HOOKED_ONNEXT.add(name)) return; // already hooked

        try {
            XposedBridge.log("[SpotifyPlus] Hooking onNext for observer: " + name);
            XposedBridge.hookAllMethods(observerObj.getClass(), "onNext", new XC_MethodHook() {
                @Override protected void beforeHookedMethod(MethodHookParam param) {
                    Object v = param.args[0];
                    if (v != null && v.getClass().getName().equals("p.oxz")) {
                        XposedBridge.log("[SpotifyPlus] Observer onNext oxz via " + name + ": " + v);
                    }
                }
            });
        } catch (Throwable t) {
            XposedBridge.log("[SpotifyPlus] Failed hooking observer onNext for " + name + ": " + t);
        }
    }
}
