"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostRuntime = void 0;
const crypto_1 = require("crypto");
const bridge_1 = require("../bridge/bridge");
const models_1 = require("../core/models");
const script_registry_1 = require("./script-registry");
const renderer_1 = require("../ui/renderer");
class HostRuntime {
    constructor(logger) {
        this.logger = logger;
        this.pendingRequests = new Map();
        this.spotifyConnecting = false;
        this.spotifyConnectingWaiters = new Set();
        this.spotifyReady = false;
        this.spotifyReadyWaiters = new Set;
        this.registry = new script_registry_1.ScriptRegistry(logger.child('Registry'));
        this.bridge = new bridge_1.Bridge(logger.child('Bridge'));
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
    start() {
        this.bridge.startPolling(packet => {
            void this.handleIncomingPacket(packet);
        });
    }
    sendEvent(name, payload = {}) {
        this.bridge.send({ type: 'event', name, payload });
    }
    sendCommand(name, payload = {}) {
        this.bridge.send({ type: 'command', name, payload });
    }
    async request(name, payload = {}) {
        const id = (0, crypto_1.randomUUID)();
        return await new Promise((resolve, reject) => {
            this.pendingRequests.set(id, {
                resolve: value => resolve(value),
                reject,
                name
            });
            this.bridge.send({ id, type: 'request', name, payload });
        });
    }
    async getCurrentTrack() {
        const payload = await this.request('player.getCurrent', {});
        return payload ? models_1.SpotifyTrack.from(payload) : null;
    }
    seek(position) {
        const thing = `${position}`;
        this.sendCommand('player.seek', { thing });
    }
    togglePlay(play) {
        this.sendCommand('player.togglePlay', play ? { play } : {});
    }
    async getProgress() {
        const payload = await this.request('player.getProgress', {});
        return payload ? payload.position : -1;
    }
    async handleIncomingPacket(packet) {
        this.logger.info(`Incoming ${packet.type}:${packet.name ?? packet.id}`);
        switch (packet.type) {
            case 'event':
                if (packet.name === 'event.connecting') {
                    this.markSpotifyConnecting();
                }
                if (packet.name === 'event.ready') {
                    this.markSpotifyReady();
                    this.logger.info(`${packet.payload.clientVersion}`);
                    this.platformData = packet.payload;
                }
                if (packet.name === 'event.updateToken') {
                    this.session = packet.payload;
                }
                if (packet.name === 'menu.press') {
                    const payload = packet.payload;
                    this.registry.emitContextMenuPress(payload.scriptId, payload.id);
                }
                if (packet.name === 'side.press') {
                    const payload = packet.payload;
                    this.registry.emitSideDrawerPress(payload.scriptId, payload.id);
                }
                if (packet.name === 'react.surfaceEvent') {
                    const payload = packet.payload;
                    const renderers = this.registry.getSurfaceRenderers(payload.id);
                    for (const renderer of renderers) {
                        const element = renderer.renderer(payload);
                        (0, renderer_1.setCommitListener)(payload.type, ops => {
                            this.sendCommand('react.commit', { surfaceId: payload.id, ops });
                        });
                        this.registry.mountSurface(renderer.scriptId, payload, element);
                    }
                }
                await this.registry.emit(packet.name, packet.payload);
                break;
            case 'command':
                await this.registry.emit(packet.name, packet.payload);
                break;
            case 'response':
                this.handleResponse(packet);
                break;
            case 'error':
                this.handleErrorPacket(packet);
                break;
            case 'request':
                this.logger.warn(`Unexpected request from Java: ${packet.name}`);
                break;
        }
    }
    handleResponse(packet) {
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
    handleErrorPacket(packet) {
        if (packet.id) {
            const pending = this.pendingRequests.get(packet.id);
            if (pending) {
                this.pendingRequests.delete(packet.id);
                const error = new Error(packet.payload?.message ?? `Request failed: ${packet.name}`);
                if (packet.payload?.stack)
                    error.stack = packet.payload.stack;
                pending.reject(error);
                return;
            }
        }
        this.logger.error(`Unhandled error packet ${packet.name}`, packet.payload);
    }
    waitForSpotifyConnecting() {
        if (this.spotifyConnecting)
            return Promise.resolve();
        return new Promise(resolve => {
            const waiter = () => {
                this.spotifyConnectingWaiters.delete(waiter);
                resolve();
            };
            this.spotifyConnectingWaiters.add(waiter);
        });
    }
    markSpotifyConnecting() {
        if (this.spotifyConnecting)
            return;
        this.spotifyConnecting = true;
        for (const waiter of this.spotifyConnectingWaiters) {
            try {
                waiter(true);
            }
            catch { }
        }
        this.spotifyConnectingWaiters.clear();
    }
    waitForSpotifyReady(timeoutMs = 15000) {
        if (this.spotifyReady)
            return Promise.resolve(true);
        return new Promise(resolve => {
            const waiter = (ready) => {
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
    markSpotifyReady() {
        if (this.spotifyReady)
            return;
        this.spotifyReady = true;
        for (const waiter of this.spotifyReadyWaiters) {
            try {
                waiter(true);
            }
            catch { }
        }
        this.spotifyReadyWaiters.clear();
    }
}
exports.HostRuntime = HostRuntime;
