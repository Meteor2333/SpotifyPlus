//@ts-ignore
import fs from 'fs';
//@ts-ignore
import path from 'path';
//@ts-ignore
import vm from 'vm';
//@ts-ignore
import { createRequire } from 'module';
//@ts-ignore
import { URL, URLSearchParams } from 'url';
//@ts-ignore
import { TextEncoder, TextDecoder } from 'util';
import { Logger } from '../core/logger';
import { ScriptApiFactory } from './script-api';
import { ScriptManifest, parseManifest } from './script-manifest';
import { HostRuntime } from './host-runtime';
import { createRoot, setCommitListener } from '../ui/renderer';
import React from 'react';

export class ScriptLoader {
    private readonly apiFactory: ScriptApiFactory;

    constructor(private readonly runtime: HostRuntime, private readonly logger: Logger) {
        this.apiFactory = new ScriptApiFactory(runtime, logger.child('Api'));
    }

    loadFromRoots(roots: string[]): void {
        for (const root of roots) this.loadFromRoot(root);
    }

    loadFromRoot(root: string): void {
        if (!fs.existsSync(root)) {
            this.logger.warn(`Scripts root does not exist: ${root}`);
            return;
        }

        const entries = fs.readdirSync(root, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const scriptDirectory = path.join(root, entry.name);
            try {
                this.loadScript(scriptDirectory);
            } catch (error) {
                this.logger.error(`Failed to load script at ${scriptDirectory}`, error);
            }
        }
    }

    private loadScript(scriptDirectory: string): void {
        const manifest = this.readManifest(scriptDirectory);
        const entryPath = path.resolve(scriptDirectory, manifest.main);

        if (!fs.existsSync(entryPath)) throw new Error(`Script entry not found: ${entryPath}`);

        const source = fs.readFileSync(entryPath, 'utf8');
        const api = this.apiFactory.create(manifest.id);
        const globals: Record<string, any> = {};
        globals.__spotifyplus_api__ = api;

        const nodeRequire = createRequire(entryPath);
        //@ts-ignore
        const componentsPath = path.resolve(__dirname, '../ui/components.js');
        const componentsModule = nodeRequire(componentsPath);
        const animatedPath = path.resolve(__dirname, '../ui/reanimated.js');
        const animatedModule = nodeRequire(animatedPath);
        const reanimatedPath = path.resolve(__dirname, '../ui/native-animation/index.js');
        const reanimatedModule = nodeRequire(reanimatedPath);

        let fetchImpl: any = undefined;
        let HeadersImpl: any = undefined;
        let RequestImpl: any = undefined;
        let ResponseImpl: any = undefined;

        try {
            const fetched = nodeRequire('node-fetch');
            fetchImpl = fetched.default ?? fetched;
            HeadersImpl = fetched.Headers;
            RequestImpl = fetched.Request;
            ResponseImpl = fetched.Response;
        } catch (error) {
            this.logger.warn(`node-fetch is not available for script ${manifest.id}`, error);
        }

        const localRequire = (specifier: string) => {
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

        const module = { exports: {} as any };

        globals.require = localRequire;
        globals.module = module;
        globals.exports = module.exports;
        globals.__filename = entryPath;
        globals.__dirname = path.dirname(entryPath);

        //@ts-ignore
        globals.process = process;
        //@ts-ignore
        globals.Buffer = Buffer;
        globals.console = api.console;

        globals.setTimeout = setTimeout;
        globals.clearTimeout = clearTimeout;
        globals.setInterval = setInterval;
        globals.clearInterval = clearInterval;
        //@ts-ignore
        globals.setImmediate = typeof setImmediate === 'function' ? setImmediate : (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
        //@ts-ignore
        globals.clearImmediate = typeof clearImmediate === 'function' ? clearImmediate : clearTimeout;

        globals.queueMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : (callback: () => void) => Promise.resolve().then(callback);

        globals.URL = URL;
        globals.URLSearchParams = URLSearchParams;
        globals.TextEncoder = TextEncoder;
        globals.TextDecoder = TextDecoder;

        if (fetchImpl) globals.fetch = fetchImpl;
        if (HeadersImpl) globals.Headers = HeadersImpl;
        if (RequestImpl) globals.Request = RequestImpl;
        if (ResponseImpl) globals.Response = ResponseImpl;

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

        const context = vm.createContext(globals, {
            name: `SpotifyPlusScript:${manifest.id}`,
            codeGeneration: {
                strings: true,
                wasm: false
            }
        });

        const script = new vm.Script(source, {
            filename: entryPath,
        });

        this.runtime.registry.registerScript({
            manifest,
            directoryPath: scriptDirectory
        });

        if (manifest.native) {
            const dexPath = path.resolve(scriptDirectory, manifest.native.dex);
            if (!fs.existsSync(dexPath)) throw new Error(`Native dex file not found: ${dexPath}`);

            this.runtime.loadDex(manifest.id, dexPath, manifest.native.pluginClass);
        }

        script.runInContext(context);

        const exported = module.exports?.default ?? module.exports;
        const config = module.exports?.config ?? {};

        if (typeof exported === 'function') {
            const surfaceId = config.surface ?? manifest.id;
            const root = createRoot(surfaceId);
            setCommitListener(surfaceId, (ops) => {
                this.runtime.sendCommand('react.commit', { surfaceId, ops });
            });

            root.render(React.createElement(exported));
        }

        this.logger.info(`Loaded script ${manifest.id} from ${entryPath}`);
    }

    private readManifest(scriptDirectory: string): ScriptManifest {
        const manifestPath = path.join(scriptDirectory, 'manifest.json');
        if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest.json in ${scriptDirectory}`);

        const rawText = fs.readFileSync(manifestPath, 'utf8');
        return parseManifest(JSON.parse(rawText));
    }
}
