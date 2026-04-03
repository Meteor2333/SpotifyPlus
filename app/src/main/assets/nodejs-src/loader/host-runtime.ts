import { randomUUID } from "crypto";
import { Bridge } from '../bridge/bridge';
import { Logger } from "../core/logger";
import { GetProgressData, ItemPress, PlatformData, Session, SpotifyTrack, SpotifyTrackData, Surface } from "../core/models";
import { ErrorPacket, Packet, ResponsePacket } from "../core/protocol";
import { ScriptRegistry } from "./script-registry";
import { setCommitListener } from "../ui/renderer";

interface PendingRequest {
    resolve: (payload: unknown) => void;
    reject: (error: Error) => void;
    name: string;
}

export class HostRuntime {
    readonly registry: ScriptRegistry;
    private readonly bridge: Bridge;
    private readonly pendingRequests = new Map<string, PendingRequest>();

    private spotifyConnecting: boolean = false;
    private spotifyConnectingWaiters = new Set<(value: boolean) => void>();

    private spotifyReady: boolean = false;
    private spotifyReadyWaiters = new Set<(ready: boolean) => void>;

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
        }
    }

    start(): void {
        this.bridge.startPolling(packet => {
            void this.handleIncomingPacket(packet);
        });
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

    async getCurrentTrack(): Promise<SpotifyTrack | null> {
        const payload = await this.request<SpotifyTrackData | null>('player.getCurrent', {});
        return payload ? SpotifyTrack.from(payload) : null;
    }

    seek(position: number): void {
        const thing = `${position}`;
        this.sendCommand('player.seek', { thing });
    }

    togglePlay(play?: boolean): void {
        this.sendCommand('player.togglePlay', play ? { play } : {});
    }

    async getProgress(): Promise<number | null> {
        const payload = await this.request<GetProgressData | null>('player.getProgress', {});
        return payload ? payload.position : -1;
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
                    this.logger.info(`${(packet.payload as PlatformData).clientVersion}`);
                    this.platformData = packet.payload as PlatformData;
                }
                if (packet.name === 'event.updateToken') {
                    this.session = packet.payload as Session;
                }
                if (packet.name === 'menu.press') {
                    const payload = packet.payload as ItemPress;
                    this.registry.emitContextMenuPress(payload.scriptId, payload.id);
                }
                if (packet.name === 'side.press') {
                    const payload = packet.payload as ItemPress;
                    this.registry.emitSideDrawerPress(payload.scriptId, payload.id);
                }
                if (packet.name === 'react.surfaceEvent') {
                    const payload = packet.payload as Surface;
                    const renderers = this.registry.getSurfaceRenderers(payload.id);

                    for (const renderer of renderers) {
                        const element = renderer.renderer(payload as any);
                        setCommitListener(payload.type, ops => {
                            this.sendCommand('react.commit', { surfaceId: payload.id, ops })
                        });

                        this.registry.mountSurface(renderer.scriptId, payload, element);
                    }
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

    waitForSpotifyReady(timeoutMs = 15000): Promise<boolean> {
        if (this.spotifyReady) return Promise.resolve(true);

        return new Promise<boolean>(resolve => {
            const waiter = (ready: boolean) => {
                clearTimeout(timeout);
                this.spotifyReadyWaiters.delete(waiter);
                resolve(ready);
            };

            const timeout = setTimeout(() => {
                this.spotifyReadyWaiters.delete(waiter);
                resolve(false);
            }, timeoutMs);

            this.spotifyReadyWaiters.add(waiter);
        });
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
}