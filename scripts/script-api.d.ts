import { EventHandler, SurfaceRenderer } from "./script-registry";
import { ContextMenu, OnClickCallback, PlatformData, Session, ShouldAddCallback, SideDrawerItem, SideOnClickCallback, SpotifyTrack } from "../core/models";
import { Logger } from "../core/logger";
import { HostRuntime } from "./host-runtime";
export interface ScriptConsole {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}
export interface ContextMenuConstructor {
    new (name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, disabled?: boolean): ContextMenu;
}
export interface SideDrawerConstructor {
    new (name: string, onClick: SideOnClickCallback): SideDrawerItem;
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
        };
    };
    Player: {
        getCurrentTrack(): Promise<SpotifyTrack | null>;
        seek(position: number): void;
        play(): void;
        pause(): void;
        togglePlay(): void;
        skipNext(): void;
        skipPrevious(): void;
    };
    Surfaces: {
        register(surfaceType: string, renderer: SurfaceRenderer<any>): void;
    };
    ContextMenu: ContextMenuConstructor;
    SideDrawer: SideDrawerConstructor;
}
export declare class ScriptApiFactory {
    private readonly runtime;
    private readonly logger;
    constructor(runtime: HostRuntime, logger: Logger);
    create(scriptId: string): ScriptGlobals;
}
export declare const SpotifyPlus: SpotifyPlusApi;
