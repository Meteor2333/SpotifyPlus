import { randomUUID } from 'crypto';
import { Logger } from '../core/logger';
import { Bridge } from '../bridge/bridge';
import { GetProgressData, PlatformData, Session, SpotifyTrack, SpotifyTrackData, Surface } from '../core/models';
import { ErrorPacket, Packet, ResponsePacket } from '../core/protocol';
import { ScriptRegistry } from './script-registry';
import { clearCommitListener, dispatchReactEvent, setCommitDispatcher, setCommitListener } from '../ui/renderer';
import React from 'react';

interface PendingRequest {
    resolve: (payload: unknown) => void;
    reject: (error: Error) => void;
    name: string;
}

export class HostRuntime {
    readonly registry: ScriptRegistry;
    private readonly bridge: Bridge;
    private readonly pendingRequests = new Map<string, PendingRequest>();

    private spotifyConnecting = false;
    private spotifyConnectingWaiters = new Set<(value: boolean) => void>();

    private spotifyReady = false;
    private spotifyReadyWaiters = new Set<(ready: boolean) => void>();

    public platformData: PlatformData;
    public session: Session;

    constructor(private readonly logger: Logger) {
        this.registry = new ScriptRegistry(logger.child('Registry'));
        this.bridge = new Bridge(logger.child('Bridge'));
        this.platformData = {
            clientVersion: 'unknown',
            osName: 'android',
            osVersion: 'unknown',
            sdkVersion: 0
        };
        this.session = {
            accessToken: ''
        };
    }

    start(): void {
        Object.assign(this.platformData, this.bridge.getPlatformData());
        this.session.accessToken = this.bridge.getAccessToken();

        this.registerEventListeners();

        setCommitDispatcher((surfaceId, ops) => {
            this.bridge.commitSurface(surfaceId, ops);
        });

        this.bridge.log('Starting script runtime!');
        console.log(`Access Token: ${this.session.accessToken}`);
    }

    sendEvent(name: string, payload: unknown = {}): void {
        this.bridge.send({ type: 'event', name, payload });
    }

    sendCommand(name: string, payload: unknown = {}): void {
        this.bridge.send({ type: 'command', name, payload });
    }

    async request<TPayload = unknown>(name: string, payload: unknown = {}): Promise<TPayload> {
        const id = randomUUID();

        return await new Promise<TPayload>((resolve, reject) => {
            this.pendingRequests.set(id, {
                resolve: value => resolve(value as TPayload),
                reject,
                name
            });

            this.bridge.send({ id, type: 'request', name, payload });
        });
    }

    getCurrentTrack(): SpotifyTrack {
        return this.bridge.getCurrentTrack();
    }

    async getTrack(uri: string): Promise<SpotifyTrack | null> {
        return this.bridge.getTrack(uri);
    }

    async getProgress(): Promise<number | null> {
        return this.bridge.getPlaybackPosition();
    }

    log(message: string): void {
        this.bridge.log(message);
    }

    seek(position: number): void {
        this.bridge.seek(position);
    }

    play(): void {
        this.bridge.play();
    }

    pause(): void {
        this.bridge.pause();
    }

    togglePlay(): void {
        this.bridge.togglePlay();
    }

    skipNext(): void {
        this.bridge.skipNext();
    }

    skipPrevious(): void {
        this.bridge.skipPrevious();
    }

    toast(text: string, length: 'short' | 'long' = 'short'): void {
        this.bridge.toast(text, length);
    }

    openUri(uri: string): void {
        this.bridge.openUri(uri);
    }

    storageSet(scriptId: string, key: string, value: unknown): void {
        this.bridge.storageSet(scriptId, key, value);
    }

    async storageGet<T = any>(scriptId: string, key: string): Promise<T | null> {
        return this.bridge.storageGet<T>(scriptId, key);
    }

    storageRemove(scriptId: string, key: string): void {
        this.bridge.storageRemove(scriptId, key);
    }

    storageWriteText(scriptId: string, path: string, value: string): void {
        this.bridge.storageWriteText(scriptId, path, value);
    }

    storageWriteJson(scriptId: string, path: string, value: unknown): void {
        this.bridge.storageWriteJson(scriptId, path, value);
    }

    storageWriteBinary(scriptId: string, path: string, data: string): void {
        this.bridge.storageWriteBinary(scriptId, path, data);
    }

    async storageRead<T = any>(scriptId: string, path: string): Promise<{ type?: 'text' | 'json' | 'binary'; value?: T | string | null; data?: string | null } | null> {
        return this.bridge.storageRead<T>(scriptId, path);
    }

    registerContextMenu(id: string, scriptId: string, title: string): void {
        this.bridge.registerContextMenu(id, scriptId, title);
    }

    registerSideDrawer(id: string, scriptId: string, title: string): void {
        this.bridge.registerSideDrawer(id, scriptId, title);
    }

    registerEventListeners(): void {
        this.bridge.on('menu.press', payload => {
            const data = payload as { scriptId: string; id: string; uri: string; };
            if (!data) {
                this.bridge.log('Failed to read context menu press data');
                return;
            }

            this.registry.emitContextMenuPress(data.scriptId, data.id, data.uri);
        });

        this.bridge.on('side.press', payload => {
            const data = payload as { scriptId: string; id: string; };
            if (!data) {
                this.bridge.log('Failed to read side drawer press data');
                return;
            }

            this.registry.emitSideDrawerPress(data.scriptId, data.id);
        });

        this.bridge.on('side.close', payload => {
            const data = payload as { scriptId: string; id: string; };
            if (!data) return;
            this.registry.unmountSurface(data.scriptId, 'sideDrawer');
            this.bridge.unregisterSurface('sideDrawer');
        });

        this.bridge.on('react.surfaceEvent', payload => {
            const surface = payload as Surface;
            if (!surface) return;

            const renderers = this.registry.getSurfaceRenderers(surface.id);
            console.log(`Received react.surfaceEvent | ${renderers.length} | ${surface.id} | ${surface.type}`);
            for (const renderer of renderers) {
                try {
                    const element = renderer.renderer(surface as any);
                    this.bridge.registerSurface(surface.id);

                    setCommitListener(surface.type, ops => {
                        this.bridge.commitSurface(surface.id, ops);
                    });

                    this.registry.mountSurface(renderer.scriptId, surface, element);
                } catch (error) {
                    this.bridge.log(`${error}`);
                }
            }
        });

        this.bridge.on('react.surfaceClose', payload => {
            const data = payload as { surfaceId: string };
            if (!data?.surfaceId) return;
            this.registry.unmountAllSurfaces(data.surfaceId);
            this.bridge.unregisterSurface(data.surfaceId);
        });

        this.bridge.on('react.event', payload => {
            const data = payload as { eventId: number; payload: any; targetId: number; surfaceId: string; eventName: string };
            const eventId = Number(data?.eventId);
            if (!Number.isFinite(eventId)) return;

            dispatchReactEvent(eventId, {
                ...(data?.payload ?? {}),
                targetId: data.targetId,
                surfaceId: data.surfaceId,
                eventName: data.eventName,
            });
        });

        this.bridge.on('event.updateToken', payload => {
            const data = payload as Session;
            Object.assign(this.session, data);
        });
    }

    private async handleIncomingPacket(packet: Packet): Promise<void> {
        this.logger.info(`Incoming ${packet.type}:${packet.name ?? packet.id}`);

        switch (packet.type) {
            case 'event':
                if (packet.name === 'event.connecting') {
                    this.markSpotifyConnecting();
                }
                if (packet.name === 'event.ready') {
                    this.markSpotifyReady();
                    Object.assign(this.platformData, packet.payload as PlatformData);
                }
                if (packet.name === 'event.updateToken') {
                    Object.assign(this.session, packet.payload as Session);
                }
                if (packet.name === 'menu.press') {
                    const payload = packet.payload as { scriptId: string; id: string, uri: string };
                    this.registry.emitContextMenuPress(payload.scriptId, payload.id, payload.uri);
                }
                if (packet.name === 'side.press') {
                    const payload = packet.payload as { scriptId: string; id: string };
                    const items = this.registry.getSideDrawerItems();
                    const item = items.get(payload.id);

                    const result = item?.item.onClick();
                    if (result && React.isValidElement(result)) {
                        setCommitListener('sideDrawer', ops => {
                            this.sendCommand('react.commit', { surfaceId: 'sideDrawer', ops });
                        });

                        this.registry.mountSurface(payload.scriptId, { id: 'sideDrawer', type: 'sideDrawer' }, result);
                    }
                }
                if (packet.name === 'side.close') {
                    const payload = packet.payload as { scriptId: string; id: string };
                    this.registry.unmountSurface(payload.scriptId, 'sideDrawer');
                    clearCommitListener('sideDrawer');
                }
                if (packet.name === 'react.surfaceEvent') {
                    const payload = packet.payload as Surface;
                    const renderers = this.registry.getSurfaceRenderers(payload.id);

                    for (const renderer of renderers) {
                        const element = renderer.renderer(payload as any);
                        setCommitListener(payload.type, ops => {
                            this.sendCommand('react.commit', { surfaceId: payload.id, ops });
                        });

                        this.registry.mountSurface(renderer.scriptId, payload, element);
                    }
                }
                if (packet.name === 'react.event') {
                    const payload = packet.payload as { eventId: number; payload: any, targetId: string, surfaceId: string, eventName: string };
                    const eventId = Number(payload?.eventId);
                    if (!Number.isFinite(eventId)) return;

                    dispatchReactEvent(eventId, {
                        ...(payload?.payload ?? {}),
                        targetId: payload.targetId,
                        surfaceId: payload.surfaceId,
                        eventName: payload.eventName
                    });
                }
                if (packet.name === 'react.surfaceClose') {
                    const payload = packet.payload as { surfaceId: string };
                    this.registry.unmountAllSurfaces(payload.surfaceId);
                    clearCommitListener(payload.surfaceId);
                }

                await this.registry.emit(packet.name!, packet.payload);
                break;

            case 'command':
                await this.registry.emit(packet.name!, packet.payload);
                break;

            case 'response':
                this.handleResponse(packet as ResponsePacket);
                break;

            case 'error':
                this.handleErrorPacket(packet as ErrorPacket<{ message?: string; stack?: string; code?: string }>);
                break;

            case 'request':
                this.logger.warn(`Unexpected request from Java: ${packet.name}`);
                break;
        }
    }

    private handleResponse(packet: ResponsePacket): void {
        if (!packet.id) {
            this.logger.warn(`Response without ID for ${packet.name}`);
            return;
        }

        const pending = this.pendingRequests.get(packet.id);
        if (!pending) {
            this.logger.warn(`No pending request for response ${packet.id}`);
            return;
        }

        this.pendingRequests.delete(packet.id);
        pending.resolve(packet.payload);
    }

    private handleErrorPacket(packet: ErrorPacket<{ message?: string; stack?: string; code?: string }>): void {
        if (packet.id) {
            const pending = this.pendingRequests.get(packet.id);
            if (pending) {
                this.pendingRequests.delete(packet.id);
                const error = new Error(packet.payload?.message ?? `Request failed: ${packet.name}`);

                if (packet.payload?.stack) error.stack = packet.payload.stack;
                pending.reject(error);
                return;
            }
        }

        this.logger.error(`Unhandled error packet ${packet.name}`, packet.payload);
    }

    waitForSpotifyConnecting(): Promise<void> {
        if (this.spotifyConnecting) return Promise.resolve();

        return new Promise<void>(resolve => {
            const waiter = () => {
                this.spotifyConnectingWaiters.delete(waiter);
                resolve();
            };

            this.spotifyConnectingWaiters.add(waiter);
        });
    }

    private markSpotifyConnecting(): void {
        if (this.spotifyConnecting) return;

        this.spotifyConnecting = true;

        for (const waiter of this.spotifyConnectingWaiters) {
            try {
                waiter(true);
            } catch { }
        }

        this.spotifyConnectingWaiters.clear();
    }

    private markSpotifyReady(): void {
        if (this.spotifyReady) return;

        this.spotifyReady = true;

        for (const waiter of this.spotifyReadyWaiters) {
            try {
                waiter(true);
            } catch { }
        }

        this.spotifyReadyWaiters.clear();
    }

    loadDex(scriptId: string, dexPath: string, pluginClass: string): void {
        this.bridge.loadDex(scriptId, dexPath, pluginClass);
    }
}
