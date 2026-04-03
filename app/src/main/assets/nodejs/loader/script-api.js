"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptApiFactory = void 0;
const models_1 = require("../core/models");
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
                    runtime.sendCommand("menu.register", {
                        id,
                        scriptId,
                        title: menu.name,
                        disabled: menu.disabled
                    });
                });
            }
        };
        const ScriptSideDrawer = class extends models_1.SideDrawerItem {
            constructor(name, onClick) {
                super(name, onClick, (drawer) => {
                    const id = `${scriptId}:${drawer.name}`;
                    runtime.registry.registerSideDrawer(scriptId, id, drawer);
                    runtime.sendCommand("side.register", {
                        id,
                        scriptId,
                        title: drawer.name
                    });
                });
            }
        };
        const api = {
            scriptId,
            version: 1,
            log: (...args) => scriptLogger.info(formatLogArgs(args)),
            warn: (...args) => scriptLogger.warn(formatLogArgs(args)),
            error: (...args) => scriptLogger.error(formatLogArgs(args)),
            on: (eventName, handler) => this.runtime.registry.on(scriptId, eventName, handler),
            off: (eventName, handler) => this.runtime.registry.off(scriptId, eventName, handler),
            request: (name, payload = {}) => this.runtime.request(name, payload),
            toast: (text, length = 'short') => this.runtime.sendCommand('ui.toast', { text, length }),
            openUrl: url => this.runtime.sendCommand('system.openUrl', { url }),
            emit: (eventName, payload = {}) => this.runtime.sendEvent(eventName, payload),
            Platform: {
                PlatformData: this.runtime.platformData,
                Session: this.runtime.session,
                Storage: {
                    set: (key, value) => this.runtime.sendCommand('storage.set', { scriptId, key, value }),
                    get: async (key) => {
                        const payload = await this.runtime.request('storage.get', { scriptId, key });
                        return payload ? payload : null;
                    }
                }
            },
            Player: {
                getCurrentTrack: () => this.runtime.getCurrentTrack(),
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
function formatLogArgs(args) {
    return args.map(arg => {
        if (typeof arg === 'string')
            return arg;
        try {
            return JSON.stringify(arg);
        }
        catch {
            return String(arg);
        }
    }).join(' ');
}
