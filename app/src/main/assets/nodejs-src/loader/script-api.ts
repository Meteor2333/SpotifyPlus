import { EventHandler, SurfaceRenderer } from "./script-registry";
import { ContextMenu, MenuItemDefinition, OnClickCallback, PlatformData, Session, ShouldAddCallback, SideDrawerItem, SideOnClickCallback, SpotifyTrack, Surface } from "../core/models";
import { Logger } from "../core/logger";
import { HostRuntime } from "./host-runtime";
import React from "react";

export interface ScriptConsole {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export interface ContextMenuConstructor {
    new(name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, disabled?: boolean): ContextMenu;
}

export interface SideDrawerConstructor {
    new(name: string, onClick: SideOnClickCallback): SideDrawerItem;
}

export interface ScriptGlobals {
    SpotifyPlus: SpotifyPlusApi;
    console: ScriptConsole;
    setTimeout: typeof setTimeout;
    setInterval: typeof setInterval;
    clearTimeout: typeof clearTimeout;
    clearInterval: typeof clearInterval;
    global: unknown;
    globalThis: unknown;
}

export interface SpotifyPlusApi {
    readonly scriptId: string;
    readonly version: number;

    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;

    on(eventName: string, handler: EventHandler): void;
    off(eventName: string, handler: EventHandler): void;

    request<TPayload = unknown>(name: string, payload?: unknown): Promise<TPayload>;
    toast(text: string, length?: 'short' | 'long'): void;
    openUrl(url: string): void;
    emit(eventName: string, payload?: unknown): void;

    Platform: {
        PlatformData: PlatformData;
        Session: Session;
        Storage: {
            set(key: string, value: any): void;
            get(key: string): any;
            remove(key: string): void;
            write<T = any>(path: string, value: T): void;
            write<T = Uint8Array>(path: string, data: Uint8Array): void;
            read<T = any>(path: string): Promise<T | Uint8Array | null>;
        }
    }

    Player: {
        getCurrentTrack(): Promise<SpotifyTrack | null>;
        seek(position: number): void;
        play(): void;
        pause(): void;
        togglePlay(): void;
        skipNext(): void;
        skipPrevious(): void;
    }

    Surfaces: {
        register(surfaceType: string, renderer: SurfaceRenderer<any>): void;
    }

    ContextMenu: ContextMenuConstructor;
    SideDrawer: SideDrawerConstructor;
}

export class ScriptApiFactory {
    constructor(private readonly runtime: HostRuntime, private readonly logger: Logger) { }

    create(scriptId: string): ScriptGlobals {
        const scriptLogger = this.logger.child(scriptId);
        const runtime = this.runtime;

        const ScriptContextMenu = class extends ContextMenu {
            constructor(name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, disabled?: boolean) {
                super(name, onClick, shouldAdd, disabled, (menu: ContextMenu) => {
                    const id = `${scriptId}:${menu.name}`;

                    runtime.registry.registerContextMenu(scriptId, id, menu);

                    runtime.sendCommand("menu.register", {
                        id,
                        scriptId,
                        title: menu.name,
                        disabled: menu.disabled
                    });
                });
            }
        }

        const ScriptSideDrawer = class extends SideDrawerItem {
            constructor(name: string, onClick: SideOnClickCallback) {
                super(name, onClick, (drawer: SideDrawerItem) => {
                    const id = `${scriptId}:${drawer.name}`;

                    runtime.registry.registerSideDrawer(scriptId, id, drawer);

                    runtime.sendCommand("side.register", {
                        id,
                        scriptId,
                        title: drawer.name
                    });
                });
            }
        }

        const api: SpotifyPlusApi = {
            scriptId,
            version: 1,
            log: (...args) => scriptLogger.info(formatLogArgs(args)),
            warn: (...args) => scriptLogger.warn(formatLogArgs(args)),
            error: (...args) => scriptLogger.error(formatLogArgs(args)),
            on: (eventName, handler) => this.runtime.registry.on(scriptId, eventName, handler),
            off: (eventName, handler) => this.runtime.registry.off(scriptId, eventName, handler),
            request: (name, payload = {}) => this.runtime.request(name, payload),
            toast: (text, length = 'short') => this.runtime.sendCommand('ui.toast', { text, length }),
            openUrl: url => this.runtime.sendCommand('system.openUrl', { url }),
            emit: (eventName, payload = {}) => this.runtime.sendEvent(eventName, payload),
            Platform: {
                PlatformData: this.runtime.platformData,
                Session: this.runtime.session,
                Storage: {
                    set: (key, value) => this.runtime.sendCommand('storage.set', { scriptId, key, value }),
                    get: async (key) => {
                        const payload = await this.runtime.request('storage.get', { scriptId, key });
                        return payload ? payload : null;
                    },
                    remove: (key) => this.runtime.sendCommand('storage.remove', { scriptId, key }),
                    write: <T = any>(path: string, value: T): void => {
                        this.runtime.sendCommand('storage.write', { scriptId, path, value });
                    },
                    // write: <T = Uint8Array>(path: string, data: Uint8Array): void => {
                    //     const bytes = Buffer.from(data).toString('base64');
                    //     this.runtime.sendCommand('storage.writeBinary', { scriptId, path, data: bytes });
                    // },
                    read: async <T = any>(path: string): Promise<T | Uint8Array | null> => {
                        const payload = await this.runtime.request('storage.read', { scriptId, path }) as { data: T | string | null };
                        if (!payload.data) return null;

                        if (typeof payload.data === 'string') {
                            //@ts-ignore
                            return Uint8Array.from(Buffer.from(payload.data, 'base64'));
                        } else if (typeof payload.data === 'object') {
                            return payload.data as T;
                        }

                        return null;
                    }
                }
            },
            Player: {
                getCurrentTrack: () => this.runtime.getCurrentTrack(),
                seek: (position) => this.runtime.seek(position),
                play: () => this.runtime.togglePlay(true),
                pause: () => this.runtime.togglePlay(false),
                togglePlay: () => this.runtime.togglePlay(),
                skipNext: () => this.runtime.sendCommand('player.skipNext', {}),
                skipPrevious: () => this.runtime.sendCommand('player.skipPrevious', {})
            },
            Surfaces: {
                register: (surfaceType, renderer) => this.runtime.registry.registerSurfaceRenderer(scriptId, surfaceType, renderer)
            },
            ContextMenu: ScriptContextMenu,
            SideDrawer: ScriptSideDrawer
        };

        const scriptConsole: ScriptConsole = {
            log: (...args) => api.log(...args),
            warn: (...args) => api.warn(...args),
            error: (...args) => api.error(...args)
        };

        const globals: ScriptGlobals = {
            SpotifyPlus: api,
            console: scriptConsole,
            setTimeout,
            setInterval,
            clearTimeout,
            clearInterval,
            global: undefined,
            globalThis: undefined
        };

        globals.global = globals;
        globals.globalThis = globals;

        return globals;
    }
}

function formatLogArgs(args: unknown[]): string {
    return args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }).join(' ');
}

export declare const SpotifyPlus: SpotifyPlusApi;