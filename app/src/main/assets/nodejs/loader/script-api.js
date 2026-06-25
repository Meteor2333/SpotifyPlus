"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptApiFactory = void 0;
const models_1 = require("../core/models");
const logger_1 = require("../core/logger");
class ScriptApiFactory {
    constructor(runtime, logger) {
        this.runtime = runtime;
        this.logger = logger;
    }
    create(scriptId) {
        const scriptLogger = this.logger.child(scriptId);
        const runtime = this.runtime;
        const ScriptContextMenu = class extends models_1.ContextMenu {
            constructor(name, onClick, shouldAdd, disabled) {
                super(name, onClick, shouldAdd, disabled, (menu) => {
                    const id = `${scriptId}:${menu.name}`;
                    runtime.registry.registerContextMenu(scriptId, id, menu);
                    runtime.registerContextMenu(id, scriptId, menu.name);
                    // runtime.sendCommand("menu.register", { id, scriptId, title: menu.name, disabled: menu.disabled });
                });
            }
        };
        const ScriptSideDrawer = class extends models_1.SideDrawerItem {
            constructor(name, onClick) {
                super(name, onClick, (drawer) => {
                    const id = `${scriptId}:${drawer.name}`;
                    runtime.registry.registerSideDrawer(scriptId, id, drawer);
                    runtime.registerSideDrawer(id, scriptId, drawer.name);
                    // runtime.sendCommand("side.register", { id, scriptId, title: drawer.name });
                });
            }
        };
        const api = {
            scriptId,
            version: 1,
            log: (...args) => this.runtime.log((0, logger_1.formatLogArgs)(args)),
            warn: (...args) => this.runtime.log((0, logger_1.formatLogArgs)(args)),
            error: (...args) => this.runtime.log((0, logger_1.formatLogArgs)(args)),
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
                    get: async (key) => this.runtime.storageGet(scriptId, key),
                    remove: key => this.runtime.storageRemove(scriptId, key),
                    write: (path, value) => {
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
                    read: async (path) => {
                        const payload = await this.runtime.storageRead(scriptId, path);
                        if (!payload)
                            return null;
                        if (payload.type === 'binary')
                            return payload.data ? fromBase64(payload.data) : null;
                        if (payload.type === 'json' || payload.type === 'text')
                            return payload.value ?? null;
                        if (typeof payload.data === 'string')
                            return fromBase64(payload.data);
                        return payload.value ?? null;
                    }
                }
            },
            Internal: {
                getTrack: async (uri) => this.runtime.getTrack(uri)
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
                    this.runtime.registry.registerSurfaceRenderer(scriptId, surfaceType, renderer);
                }
            },
            ContextMenu: ScriptContextMenu,
            SideDrawer: ScriptSideDrawer
        };
        const scriptConsole = {
            log: (...args) => api.log(...args),
            warn: (...args) => api.warn(...args),
            error: (...args) => api.error(...args)
        };
        const globals = {
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
exports.ScriptApiFactory = ScriptApiFactory;
function isBinaryLike(value) {
    return value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}
function toUint8Array(value) {
    if (value instanceof Uint8Array)
        return value;
    if (value instanceof ArrayBuffer)
        return new Uint8Array(value);
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
function toBase64(value) {
    const bytes = toUint8Array(value);
    return Buffer.from(bytes).toString('base64');
}
function fromBase64(value) {
    return Uint8Array.from(Buffer.from(value, 'base64'));
}
