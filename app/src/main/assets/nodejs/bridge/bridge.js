"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bridge = void 0;
const path_1 = __importDefault(require("path"));
const protocol_1 = require("../core/protocol");
const events_1 = __importDefault(require("events"));
class Bridge extends events_1.default {
    constructor(logger) {
        super();
        this.logger = logger;
        this.pollingHandle = null;
        const addonPath = path_1.default.join(__dirname, '..', 'spotifyplus_bridge.node');
        this.logger.info(`Loading addon from ${addonPath}`);
        this.addon = require(addonPath);
        this.addon.setEventHandler((type, payload) => {
            this.emit(type, JSON.parse(payload));
        });
    }
    send(packet) {
        const json = (0, protocol_1.stringify)(packet);
        this.logger.info(`Sending packet ${packet.type}:${packet.name}`);
        this.addon.sendToJava(json);
    }
    startPolling(onPacket, intervalMs = 8) {
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
    stopPolling() {
        // if (!this.pollingHandle) return;
        // clearInterval(this.pollingHandle);
        // this.pollingHandle = null;
    }
    loadDex(scriptId, dexPath, pluginClass) {
        this.addon.loadDex(scriptId, dexPath, pluginClass);
    }
    getPlatformData() {
        return this.addon.getPlatformData();
    }
    getAccessToken() {
        return this.addon.getAccessToken();
    }
    log(message) {
        this.addon.log(message);
    }
    getCurrentTrack() {
        return this.addon.getCurrentTrack();
    }
    getTrack(uri) {
        return this.addon.getTrack(uri) ?? null;
    }
    getPlaybackPosition() {
        return this.addon.getPlaybackPosition();
    }
    seek(position) {
        this.addon.seek(position);
    }
    play() {
        this.addon.play();
    }
    pause() {
        this.addon.pause();
    }
    togglePlay() {
        this.addon.togglePlay();
    }
    skipNext() {
        this.addon.skipNext();
    }
    skipPrevious() {
        this.addon.skipPrevious();
    }
    toast(text, length = 'short') {
        this.addon.toast(text, length === 'long');
    }
    openUri(uri) {
        this.addon.openUri(uri);
    }
    storageSet(scriptId, key, value) {
        this.addon.storageSet(scriptId, key, JSON.stringify(value));
    }
    storageGet(scriptId, key) {
        const value = this.addon.storageGet(scriptId, key);
        if (value == null)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    storageRemove(scriptId, key) {
        this.addon.storageRemove(scriptId, key);
    }
    storageWriteText(scriptId, path, value) {
        this.addon.storageWriteText(scriptId, path, value);
    }
    storageWriteJson(scriptId, path, value) {
        this.addon.storageWriteJson(scriptId, path, JSON.stringify(value));
    }
    storageWriteBinary(scriptId, path, data) {
        this.addon.storageWriteBinary(scriptId, path, data);
    }
    storageRead(scriptId, path) {
        const payload = this.addon.storageRead(scriptId, path);
        if (!payload)
            return null;
        if (payload.type === 'json') {
            try {
                return {
                    type: 'json',
                    value: payload.value ? JSON.parse(payload.value) : null,
                    data: null
                };
            }
            catch {
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
    registerContextMenu(id, scriptId, title) {
        this.addon.registerContextMenu(id, scriptId, title);
    }
    registerSideDrawer(id, scriptId, title) {
        this.addon.registerSideDrawer(id, scriptId, title);
    }
    registerSurface(surfaceId) {
        this.addon.registerSurface(surfaceId);
    }
    unregisterSurface(surfaceId) {
        this.addon.unregisterSurface(surfaceId);
    }
    commitSurface(surfaceId, ops) {
        this.addon.commitSurface(surfaceId, JSON.stringify(ops));
    }
}
exports.Bridge = Bridge;
