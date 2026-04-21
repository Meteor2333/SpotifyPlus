import { EventHandler, SurfaceRenderer } from "./script-registry";
import { ContextMenu, MenuItemDefinition, OnClickCallback, PlatformData, Session, ShouldAddCallback, SideDrawerItem, SideOnClickCallback, SpotifyTrack, SpotifyTrackData, Surface } from "../core/models";
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
    openUri(uri: string): void;
    emit(eventName: string, payload?: unknown): void;

    Platform: {
        PlatformData: PlatformData;
        Session: Session;
        Storage: {
            set(key: string, value: any): void;
            get<T = any>(key: string): Promise<T | null>;
            remove(key: string): void;

            write(path: string, value: string): void;
            write<T = any>(path: string, value: T): void;
            write(path: string, data: Uint8Array | ArrayBuffer): void;

            read<T = any>(path: string): Promise<T | string | Uint8Array | null>;
        }
    }

    Internal: {
        getTrack(uri: string): Promise<SpotifyTrack | null>;
    }

    Player: {
        getCurrentTrack(): Promise<SpotifyTrack | null>;
        getProgress(): Promise<number | null>;
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
            openUri: uri => this.runtime.sendCommand('system.openUri', { uri }),
            emit: (eventName, payload = {}) => this.runtime.sendEvent(eventName, payload),
            Platform: {
                PlatformData: this.runtime.platformData,
                Session: this.runtime.session,
                Storage: {
                    set: (key, value) => this.runtime.sendCommand('storage.set', { scriptId, key, value }),

                    get: async <T = any>(key: string): Promise<T | null> => {
                        const payload = await this.runtime.request<{ value?: T }>('storage.get', { scriptId, key });
                        return payload && Object.prototype.hasOwnProperty.call(payload, 'value')
                            ? payload.value ?? null
                            : null;
                    },

                    remove: (key) => this.runtime.sendCommand('storage.remove', { scriptId, key }),

                    write: <T = any>(path: string, value: T): void => {
                        if (isBinaryLike(value)) {
                            this.runtime.sendCommand('storage.write', {
                                scriptId,
                                path,
                                type: 'binary',
                                data: toBase64(value)
                            });
                            return;
                        }

                        if (typeof value === 'string') {
                            this.runtime.sendCommand('storage.write', {
                                scriptId,
                                path,
                                type: 'text',
                                value
                            });
                            return;
                        }

                        this.runtime.sendCommand('storage.write', {
                            scriptId,
                            path,
                            type: 'json',
                            value
                        });
                    },

                    read: async <T = any>(path: string): Promise<T | string | Uint8Array | null> => {
                        const payload = await this.runtime.request<{
                            type?: 'text' | 'json' | 'binary';
                            value?: T | string | null;
                            data?: string | null;
                        }>('storage.read', { scriptId, path });

                        if (!payload) return null;

                        if (payload.type === 'binary') {
                            return payload.data ? fromBase64(payload.data) : null;
                        }

                        if (payload.type === 'json' || payload.type === 'text') {
                            return payload.value ?? null;
                        }

                        // fallback for older responses
                        if (typeof payload.data === 'string') return fromBase64(payload.data);
                        if (Object.prototype.hasOwnProperty.call(payload, 'value')) return payload.value ?? null;

                        return null;
                    }
                }
            },
            Internal: {
                getTrack: async (uri: string) => {
                    const payload = await this.runtime.request<SpotifyTrackData | null>('internal.getTrack', { uri });
                    return payload ? SpotifyTrack.from(payload) : null;
                }
            },
            Player: {
                getCurrentTrack: () => this.runtime.getCurrentTrack(),
                getProgress: () => this.runtime.getProgress(),
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

function isBinaryLike(value: unknown): value is Uint8Array | ArrayBuffer | ArrayBufferView {
    return value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

function toUint8Array(value: Uint8Array | ArrayBuffer | ArrayBufferView): Uint8Array {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function toBase64(value: Uint8Array | ArrayBuffer | ArrayBufferView): string {
    const bytes = toUint8Array(value);
    // @ts-ignore
    return Buffer.from(bytes).toString('base64');
}

function fromBase64(value: string): Uint8Array {
    // @ts-ignore
    return Uint8Array.from(Buffer.from(value, 'base64'));
}

export declare const SpotifyPlus: SpotifyPlusApi;