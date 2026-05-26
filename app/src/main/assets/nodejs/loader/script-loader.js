"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptLoader = void 0;
//@ts-ignore
const fs_1 = __importDefault(require("fs"));
//@ts-ignore
const path_1 = __importDefault(require("path"));
//@ts-ignore
const vm_1 = __importDefault(require("vm"));
//@ts-ignore
const module_1 = require("module");
//@ts-ignore
const url_1 = require("url");
//@ts-ignore
const util_1 = require("util");
const script_api_1 = require("./script-api");
const script_manifest_1 = require("./script-manifest");
const renderer_1 = require("../ui/renderer");
const react_1 = __importDefault(require("react"));
class ScriptLoader {
    constructor(runtime, logger) {
        this.runtime = runtime;
        this.logger = logger;
        this.apiFactory = new script_api_1.ScriptApiFactory(runtime, logger.child('Api'));
    }
    loadFromRoots(roots) {
        for (const root of roots)
            this.loadFromRoot(root);
    }
    loadFromRoot(root) {
        if (!fs_1.default.existsSync(root)) {
            this.logger.warn(`Scripts root does not exist: ${root}`);
            return;
        }
        const entries = fs_1.default.readdirSync(root, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const scriptDirectory = path_1.default.join(root, entry.name);
            try {
                this.loadScript(scriptDirectory);
            }
            catch (error) {
                this.logger.error(`Failed to load script at ${scriptDirectory}`, error);
            }
        }
    }
    loadScript(scriptDirectory) {
        const manifest = this.readManifest(scriptDirectory);
        const entryPath = path_1.default.resolve(scriptDirectory, manifest.main);
        if (!fs_1.default.existsSync(entryPath))
            throw new Error(`Script entry not found: ${entryPath}`);
        const source = fs_1.default.readFileSync(entryPath, 'utf8');
        const api = this.apiFactory.create(manifest.id);
        const globals = {};
        globals.__spotifyplus_api__ = api;
        const nodeRequire = (0, module_1.createRequire)(entryPath);
        //@ts-ignore
        const componentsPath = path_1.default.resolve(__dirname, '../ui/components.js');
        const componentsModule = nodeRequire(componentsPath);
        const animatedPath = path_1.default.resolve(__dirname, '../ui/reanimated.js');
        const animatedModule = nodeRequire(animatedPath);
        const reanimatedPath = path_1.default.resolve(__dirname, '../ui/native-animation/index.js');
        const reanimatedModule = nodeRequire(reanimatedPath);
        let fetchImpl = undefined;
        let HeadersImpl = undefined;
        let RequestImpl = undefined;
        let ResponseImpl = undefined;
        try {
            const fetched = nodeRequire('node-fetch');
            fetchImpl = fetched.default ?? fetched;
            HeadersImpl = fetched.Headers;
            RequestImpl = fetched.Request;
            ResponseImpl = fetched.Response;
        }
        catch (error) {
            this.logger.warn(`node-fetch is not available for script ${manifest.id}`, error);
        }
        const localRequire = (specifier) => {
            if (specifier === 'spotifyplus') {
                return {
                    SpotifyPlus: api.SpotifyPlus,
                    default: api.SpotifyPlus
                };
            }
            if (specifier === 'spotifyplus/react') {
                return componentsModule;
            }
            if (specifier === 'spotifyplus/animated') {
                return animatedModule;
            }
            if (specifier === 'spotifyplus/react/Animated') {
                return reanimatedModule;
            }
            return nodeRequire(specifier);
        };
        const module = { exports: {} };
        globals.require = localRequire;
        globals.module = module;
        globals.exports = module.exports;
        globals.__filename = entryPath;
        globals.__dirname = path_1.default.dirname(entryPath);
        //@ts-ignore
        globals.process = process;
        //@ts-ignore
        globals.Buffer = Buffer;
        globals.console = console;
        globals.setTimeout = setTimeout;
        globals.clearTimeout = clearTimeout;
        globals.setInterval = setInterval;
        globals.clearInterval = clearInterval;
        //@ts-ignore
        globals.setImmediate = typeof setImmediate === 'function' ? setImmediate : (fn, ...args) => setTimeout(fn, 0, ...args);
        //@ts-ignore
        globals.clearImmediate = typeof clearImmediate === 'function' ? clearImmediate : clearTimeout;
        globals.queueMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : (callback) => Promise.resolve().then(callback);
        globals.URL = url_1.URL;
        globals.URLSearchParams = url_1.URLSearchParams;
        globals.TextEncoder = util_1.TextEncoder;
        globals.TextDecoder = util_1.TextDecoder;
        if (fetchImpl)
            globals.fetch = fetchImpl;
        if (HeadersImpl)
            globals.Headers = HeadersImpl;
        if (RequestImpl)
            globals.Request = RequestImpl;
        if (ResponseImpl)
            globals.Response = ResponseImpl;
        globals.Promise = Promise;
        globals.Symbol = Symbol;
        globals.Map = Map;
        globals.Set = Set;
        globals.WeakMap = WeakMap;
        globals.WeakSet = WeakSet;
        globals.Array = Array;
        globals.Object = Object;
        globals.String = String;
        globals.Number = Number;
        globals.Boolean = Boolean;
        globals.Date = Date;
        globals.RegExp = RegExp;
        globals.Error = Error;
        globals.TypeError = TypeError;
        globals.JSON = JSON;
        globals.Math = Math;
        globals.Reflect = Reflect;
        globals.Proxy = Proxy;
        globals.global = globals;
        globals.globalThis = globals;
        globals.self = globals;
        const context = vm_1.default.createContext(globals, {
            name: `SpotifyPlusScript:${manifest.id}`,
            codeGeneration: {
                strings: true,
                wasm: false
            }
        });
        const script = new vm_1.default.Script(source, {
            filename: entryPath,
        });
        this.runtime.registry.registerScript({
            manifest,
            directoryPath: scriptDirectory
        });
        if (manifest.native) {
            const dexPath = path_1.default.resolve(scriptDirectory, manifest.native.dex);
            if (!fs_1.default.existsSync(dexPath))
                throw new Error(`Native dex file not found: ${dexPath}`);
            this.runtime.loadDex(manifest.id, dexPath, manifest.native.pluginClass);
        }
        script.runInContext(context);
        const exported = module.exports?.default ?? module.exports;
        const config = module.exports?.config ?? {};
        if (typeof exported === 'function') {
            const surfaceId = config.surface ?? manifest.id;
            const root = (0, renderer_1.createRoot)(surfaceId);
            (0, renderer_1.setCommitListener)(surfaceId, (ops) => {
                this.runtime.sendCommand('react.commit', { surfaceId, ops });
            });
            root.render(react_1.default.createElement(exported));
        }
        this.logger.info(`Loaded script ${manifest.id} from ${entryPath}`);
    }
    readManifest(scriptDirectory) {
        const manifestPath = path_1.default.join(scriptDirectory, 'manifest.json');
        if (!fs_1.default.existsSync(manifestPath))
            throw new Error(`Missing manifest.json in ${scriptDirectory}`);
        const rawText = fs_1.default.readFileSync(manifestPath, 'utf8');
        return (0, script_manifest_1.parseManifest)(JSON.parse(rawText));
    }
}
exports.ScriptLoader = ScriptLoader;
