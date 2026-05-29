"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostRuntime = void 0;
const crypto_1 = require("crypto");
const bridge_1 = require("../bridge/bridge");
const script_registry_1 = require("./script-registry");
const renderer_1 = require("../ui/renderer");
const react_1 = __importDefault(require("react"));
class HostRuntime {
    constructor(logger) {
        this.logger = logger;
        this.pendingRequests = new Map();
        this.spotifyConnecting = false;
        this.spotifyConnectingWaiters = new Set();
        this.spotifyReady = false;
        this.spotifyReadyWaiters = new Set();
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
        Object.assign(this.platformData, this.bridge.getPlatformData());
        this.session.accessToken = this.bridge.getAccessToken();
        this.registerEventListeners();
        (0, renderer_1.setCommitDispatcher)((surfaceId, ops) => {
            this.bridge.commitSurface(surfaceId, ops);
        });
        this.bridge.log('Starting script runtime!');
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
    getCurrentTrack() {
        return this.bridge.getCurrentTrack();
    }
    async getTrack(uri) {
        return this.bridge.getTrack(uri);
    }
    async getProgress() {
        return this.bridge.getPlaybackPosition();
    }
    log(message) {
        this.bridge.log(message);
    }
    seek(position) {
        this.bridge.seek(position);
    }
    play() {
        this.bridge.play();
    }
    pause() {
        this.bridge.pause();
    }
    togglePlay() {
        this.bridge.togglePlay();
    }
    skipNext() {
        this.bridge.skipNext();
    }
    skipPrevious() {
        this.bridge.skipPrevious();
    }
    toast(text, length = 'short') {
        this.bridge.toast(text, length);
    }
    openUri(uri) {
        this.bridge.openUri(uri);
    }
    storageSet(scriptId, key, value) {
        this.bridge.storageSet(scriptId, key, value);
    }
    async storageGet(scriptId, key) {
        return this.bridge.storageGet(scriptId, key);
    }
    storageRemove(scriptId, key) {
        this.bridge.storageRemove(scriptId, key);
    }
    storageWriteText(scriptId, path, value) {
        this.bridge.storageWriteText(scriptId, path, value);
    }
    storageWriteJson(scriptId, path, value) {
        this.bridge.storageWriteJson(scriptId, path, value);
    }
    storageWriteBinary(scriptId, path, data) {
        this.bridge.storageWriteBinary(scriptId, path, data);
    }
    async storageRead(scriptId, path) {
        return this.bridge.storageRead(scriptId, path);
    }
    registerContextMenu(id, scriptId, title) {
        this.bridge.registerContextMenu(id, scriptId, title);
    }
    registerSideDrawer(id, scriptId, title) {
        this.bridge.registerSideDrawer(id, scriptId, title);
    }
    registerEventListeners() {
        this.bridge.on('menu.press', payload => {
            const data = payload;
            if (!data) {
                this.bridge.log('Failed to read context menu press data');
                return;
            }
            this.registry.emitContextMenuPress(data.scriptId, data.id, data.uri);
        });
        this.bridge.on('side.press', payload => {
            const data = payload;
            if (!data) {
                this.bridge.log('Failed to read side drawer press data');
                return;
            }
            this.registry.emitSideDrawerPress(data.scriptId, data.id);
        });
        this.bridge.on('side.close', payload => {
            const data = payload;
            if (!data)
                return;
            this.registry.unmountSurface(data.scriptId, 'sideDrawer');
            this.bridge.unregisterSurface('sideDrawer');
        });
        this.bridge.on('react.surfaceEvent', payload => {
            const surface = payload;
            if (!surface)
                return;
            const renderers = this.registry.getSurfaceRenderers(surface.id);
            for (const renderer of renderers) {
                try {
                    const element = renderer.renderer(surface);
                    this.bridge.registerSurface(surface.id);
                    (0, renderer_1.setCommitListener)(surface.type, ops => {
                        this.bridge.commitSurface(surface.id, ops);
                    });
                    this.registry.mountSurface(renderer.scriptId, surface, element);
                }
                catch (error) {
                    this.bridge.log(`${error}`);
                }
            }
        });
        this.bridge.on('react.surfaceClose', payload => {
            const data = payload;
            if (!data?.surfaceId)
                return;
            this.registry.unmountAllSurfaces(data.surfaceId);
            (0, renderer_1.clearCommitListener)(data.surfaceId);
            this.bridge.unregisterSurface(data.surfaceId);
        });
        this.bridge.on('react.event', payload => {
            const data = payload;
            const eventId = Number(data?.eventId);
            if (!Number.isFinite(eventId))
                return;
            (0, renderer_1.dispatchReactEvent)(eventId, {
                ...(data?.payload ?? {}),
                targetId: data.targetId,
                surfaceId: data.surfaceId,
                eventName: data.eventName,
            });
        });
        this.bridge.on('event.updateToken', payload => {
            const data = payload;
            Object.assign(this.session, data);
        });
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
                    Object.assign(this.platformData, packet.payload);
                }
                if (packet.name === 'event.updateToken') {
                    Object.assign(this.session, packet.payload);
                }
                if (packet.name === 'menu.press') {
                    const payload = packet.payload;
                    this.registry.emitContextMenuPress(payload.scriptId, payload.id, payload.uri);
                }
                if (packet.name === 'side.press') {
                    const payload = packet.payload;
                    const items = this.registry.getSideDrawerItems();
                    const item = items.get(payload.id);
                    const result = item?.item.onClick();
                    if (result && react_1.default.isValidElement(result)) {
                        (0, renderer_1.setCommitListener)('sideDrawer', ops => {
                            this.sendCommand('react.commit', { surfaceId: 'sideDrawer', ops });
                        });
                        this.registry.mountSurface(payload.scriptId, { id: 'sideDrawer', type: 'sideDrawer' }, result);
                    }
                }
                if (packet.name === 'side.close') {
                    const payload = packet.payload;
                    this.registry.unmountSurface(payload.scriptId, 'sideDrawer');
                    (0, renderer_1.clearCommitListener)('sideDrawer');
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
                if (packet.name === 'react.event') {
                    const payload = packet.payload;
                    const eventId = Number(payload?.eventId);
                    if (!Number.isFinite(eventId))
                        return;
                    (0, renderer_1.dispatchReactEvent)(eventId, {
                        ...(payload?.payload ?? {}),
                        targetId: payload.targetId,
                        surfaceId: payload.surfaceId,
                        eventName: payload.eventName
                    });
                }
                if (packet.name === 'react.surfaceClose') {
                    const payload = packet.payload;
                    this.registry.unmountAllSurfaces(payload.surfaceId);
                    (0, renderer_1.clearCommitListener)(payload.surfaceId);
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
    loadDex(scriptId, dexPath, pluginClass) {
        this.bridge.loadDex(scriptId, dexPath, pluginClass);
    }
}
exports.HostRuntime = HostRuntime;
