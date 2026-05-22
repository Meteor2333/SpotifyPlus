import path from 'path';
import { Logger } from '../core/logger';
import { Packet, parsePacket, stringify } from '../core/protocol';
import EventEmitter from 'events';
import { PlatformData, SpotifyTrack } from '../core/models';
import { MutationOp } from '../ui/renderer';

type NativeStorageRead = {
    type: 'text' | 'json' | 'binary';
    value?: string;
    data?: string;
};

interface NativeBridge {
    sendToJava(json: string): void;
    pollFromJava(): string | undefined;

    setEventHandler(callback: (type: string, payload: string) => void): void;
    loadDex(scriptId: string, dexPath: string, pluginClass: string): void;

    getPlatformData(): PlatformData;
    getAccessToken(): string;
    log(message: string): void;

    getCurrentTrack(): SpotifyTrack;
    getTrack(uri: string): SpotifyTrack | undefined;
    getPlaybackPosition(): number;
    seek(position: number): void;
    play(): void;
    pause(): void;
    togglePlay(): void;
    skipNext(): void;
    skipPrevious(): void;

    toast(text: string, longLength?: boolean): void;
    openUri(uri: string): void;

    storageSet(scriptId: string, key: string, value: string): void;
    storageGet(scriptId: string, key: string): string | undefined;
    storageRemove(scriptId: string, key: string): void;
    storageWriteText(scriptId: string, path: string, value: string): void;
    storageWriteJson(scriptId: string, path: string, value: string): void;
    storageWriteBinary(scriptId: string, path: string, data: string): void;
    storageRead(scriptId: string, path: string): NativeStorageRead | undefined;

    registerContextMenu(id: string, scriptId: string, title: string): void;
    registerSideDrawer(id: string, scriptId: string, title: string): void;

    registerSurface(surfaceId: string): void;
    unregisterSurface(surfaceId: string): void;
    commitSurface(surfaceId: string, opsJson: string): void;
}

export class Bridge extends EventEmitter {
    private readonly addon: NativeBridge;
    private pollingHandle: NodeJS.Timeout | null = null;

    constructor(private readonly logger: Logger) {
        super();
        const addonPath = path.join(__dirname, '..', 'spotifyplus_bridge.node');
        this.logger.info(`Loading addon from ${addonPath}`);
        this.addon = require(addonPath) as NativeBridge;

        this.addon.setEventHandler((type, payload) => {
            this.emit(type, JSON.parse(payload));
        });
    }

    send(packet: Packet): void {
        const json = stringify(packet);
        this.logger.info(`Sending packet ${packet.type}:${packet.name}`);
        this.addon.sendToJava(json);
    }

    startPolling(onPacket: (packet: Packet) => void, intervalMs = 8): void {
        // if (this.pollingHandle) return;
        // this.pollingHandle = setInterval(() => {
        //     const json = this.addon.pollFromJava();
        //     if (!json) return;
        //     try {
        //         const packet = parsePacket(json);
        //         onPacket(packet);
        //     } catch (error) {
        //         this.logger.error('Failed to parse packet from Java', error);
        //     }
        // }, intervalMs);
    }

    stopPolling(): void {
        // if (!this.pollingHandle) return;
        // clearInterval(this.pollingHandle);
        // this.pollingHandle = null;
    }

    loadDex(scriptId: string, dexPath: string, pluginClass: string): void {
        this.addon.loadDex(scriptId, dexPath, pluginClass);
    }

    getPlatformData(): PlatformData {
        return this.addon.getPlatformData();
    }

    getAccessToken(): string {
        return this.addon.getAccessToken();
    }

    log(message: string): void {
        this.addon.log(message);
    }

    getCurrentTrack(): SpotifyTrack {
        return this.addon.getCurrentTrack();
    }

    getTrack(uri: string): SpotifyTrack | null {
        return this.addon.getTrack(uri) ?? null;
    }

    getPlaybackPosition(): number {
        return this.addon.getPlaybackPosition();
    }

    seek(position: number): void {
        this.addon.seek(position);
    }

    play(): void {
        this.addon.play();
    }

    pause(): void {
        this.addon.pause();
    }

    togglePlay(): void {
        this.addon.togglePlay();
    }

    skipNext(): void {
        this.addon.skipNext();
    }

    skipPrevious(): void {
        this.addon.skipPrevious();
    }

    toast(text: string, length: 'short' | 'long' = 'short'): void {
        this.addon.toast(text, length === 'long');
    }

    openUri(uri: string): void {
        this.addon.openUri(uri);
    }

    storageSet(scriptId: string, key: string, value: unknown): void {
        this.addon.storageSet(scriptId, key, JSON.stringify(value));
    }

    storageGet<T = any>(scriptId: string, key: string): T | null {
        const value = this.addon.storageGet(scriptId, key);
        if (value == null) return null;

        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    storageRemove(scriptId: string, key: string): void {
        this.addon.storageRemove(scriptId, key);
    }

    storageWriteText(scriptId: string, path: string, value: string): void {
        this.addon.storageWriteText(scriptId, path, value);
    }

    storageWriteJson(scriptId: string, path: string, value: unknown): void {
        this.addon.storageWriteJson(scriptId, path, JSON.stringify(value));
    }

    storageWriteBinary(scriptId: string, path: string, data: string): void {
        this.addon.storageWriteBinary(scriptId, path, data);
    }

    storageRead<T = any>(scriptId: string, path: string): { type?: 'text' | 'json' | 'binary'; value?: T | string | null; data?: string | null } | null {
        const payload = this.addon.storageRead(scriptId, path);
        if (!payload) return null;

        if (payload.type === 'json') {
            try {
                return {
                    type: 'json',
                    value: payload.value ? JSON.parse(payload.value) as T : null,
                    data: null
                };
            } catch {
                return {
                    type: 'json',
                    value: null,
                    data: null
                };
            }
        }

        if (payload.type === 'text') {
            return {
                type: 'text',
                value: payload.value ?? null,
                data: null
            };
        }

        return {
            type: 'binary',
            value: null,
            data: payload.data ?? null
        };
    }

    registerContextMenu(id: string, scriptId: string, title: string): void {
        this.addon.registerContextMenu(id, scriptId, title);
    }

    registerSideDrawer(id: string, scriptId: string, title: string): void {
        this.addon.registerSideDrawer(id, scriptId, title);
    }

    registerSurface(surfaceId: string): void {
        this.addon.registerSurface(surfaceId);
    }

    unregisterSurface(surfaceId: string): void {
        this.addon.unregisterSurface(surfaceId);
    }

    commitSurface(surfaceId: string, ops: MutationOp[]): void {
        this.addon.commitSurface(surfaceId, JSON.stringify(ops));
    }
}
