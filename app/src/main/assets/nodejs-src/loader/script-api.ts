import { EventHandler, SurfaceRenderer } from "./script-registry";
import { ContextMenu, OnClickCallback, PlatformData, Session, ShouldAddCallback, SideDrawerItem, SideOnClickCallback, SpotifyTrack } from "../core/models";
import { Logger, formatLogArgs } from "../core/logger";
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
        getCurrentTrack(): SpotifyTrack;
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
                    runtime.registerContextMenu(id, scriptId, menu.name);
                    // runtime.sendCommand("menu.register", { id, scriptId, title: menu.name, disabled: menu.disabled });
                });
            }
        };

        const ScriptSideDrawer = class extends SideDrawerItem {
            constructor(name: string, onClick: SideOnClickCallback) {
                super(name, onClick, (drawer: SideDrawerItem) => {
                    const id = `${scriptId}:${drawer.name}`;
                    runtime.registry.registerSideDrawer(scriptId, id, drawer);
                    runtime.registerSideDrawer(id, scriptId, drawer.name);
                    // runtime.sendCommand("side.register", { id, scriptId, title: drawer.name });
                });
            }
        };

        const api: SpotifyPlusApi = {
            scriptId,
            version: 1,
            log: (...args) => this.runtime.log(formatLogArgs(args)),
            warn: (...args) => this.runtime.log(formatLogArgs(args)),
            error: (...args) => this.runtime.log(formatLogArgs(args)),
            on: (eventName, handler) => this.runtime.registry.on(scriptId, eventName, handler),
            off: (eventName, handler) => this.runtime.registry.off(scriptId, eventName, handler),
            request: (name, payload = {}) => this.runtime.request(name, payload),
            toast: (text, length = 'short') => this.runtime.toast(text, length),
            openUri: uri => this.runtime.openUri(uri),
            emit: (eventName, payload = {}) => this.runtime.sendEvent(eventName, payload),
            Platform: {
                PlatformData: this.runtime.platformData,
                Session: this.runtime.session,
                Storage: {
                    set: (key, value) => this.runtime.storageSet(scriptId, key, value),
                    get: async <T = any>(key: string): Promise<T | null> => this.runtime.storageGet<T>(scriptId, key),
                    remove: key => this.runtime.storageRemove(scriptId, key),
                    write: <T = any>(path: string, value: T): void => {
                        if (isBinaryLike(value)) {
                            this.runtime.storageWriteBinary(scriptId, path, toBase64(value));
                            return;
                        }

                        if (typeof value === 'string') {
                            this.runtime.storageWriteText(scriptId, path, value);
                            return;
                        }

                        this.runtime.storageWriteJson(scriptId, path, value);
                    },
                    read: async <T = any>(path: string): Promise<T | string | Uint8Array | null> => {
                        const payload = await this.runtime.storageRead<T>(scriptId, path);
                        if (!payload) return null;

                        if (payload.type === 'binary') return payload.data ? fromBase64(payload.data) : null;
                        if (payload.type === 'json' || payload.type === 'text') return payload.value ?? null;
                        if (typeof payload.data === 'string') return fromBase64(payload.data);
                        return payload.value ?? null;
                    }
                }
            },
            Internal: {
                getTrack: async (uri: string) => this.runtime.getTrack(uri)
            },
            Player: {
                getCurrentTrack: () => this.runtime.getCurrentTrack(),
                getProgress: () => this.runtime.getProgress(),
                seek: position => this.runtime.seek(position),
                play: () => this.runtime.play(),
                pause: () => this.runtime.pause(),
                togglePlay: () => this.runtime.togglePlay(),
                skipNext: () => this.runtime.skipNext(),
                skipPrevious: () => this.runtime.skipPrevious()
            },
            Surfaces: {
                register: (surfaceType, renderer) => {
                    this.runtime.registry.registerSurfaceRenderer(scriptId, surfaceType, renderer)
                }
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
