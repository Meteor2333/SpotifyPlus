import fs from "fs";
import path from "path";
import { build } from "esbuild";

const root = process.cwd();
const sourcePackagePath = path.join(root, "package.json");
const sourcePackage = JSON.parse(fs.readFileSync(sourcePackagePath, "utf8"));

const primaryOutDir = path.join(root, "dist");
const mirrorOutDir = path.resolve(root, "../nodejs/sdk");

const publicFiles = [
    "index.cjs",
    "index.d.ts",
    "components.js",
    "components.d.ts",
    "animated.js",
    "animated.d.ts",
    "entities.js",
    "entities.d.ts",
    "package.json",
];

const internalTypeFiles = [
    "components.d.ts",
    "legacy-animated.d.ts",
    "native-animation.d.ts",
    "native-animation-core.d.ts",
    "renderer.d.ts",
    "script-api.d.ts",
    "script-registry.d.ts",
];

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function readGenerated(relativePath) {
    return fs.readFileSync(path.resolve(root, "../nodejs", relativePath), "utf8");
}

function writeFile(outDir, relativePath, text) {
    const filePath = path.join(outDir, relativePath);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, text, "utf8");
}

function copyFile(sourceDir, targetDir, relativePath) {
    const sourcePath = path.join(sourceDir, relativePath);
    const targetPath = path.join(targetDir, relativePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
}

function unlinkIfExists(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        if (error?.code !== "ENOENT") throw error;
    }
}

function rewriteCommonTypeImports(text) {
    return text
        .replace(/from "\.\.\/ui\/components"/g, 'from "spotifyplus/internal/components"')
        .replace(/from "\.\/components"/g, 'from "spotifyplus/internal/components"')
        .replace(/from "\.\.\/components"/g, 'from "spotifyplus/internal/components"')
        .replace(/from "\.\/animated"/g, 'from "spotifyplus/internal/legacy-animated"')
        .replace(/from "\.\.\/ui\/native-animation"/g, 'from "spotifyplus/internal/native-animation"')
        .replace(/from "\.\/native-animation\/core"/g, 'from "spotifyplus/react/Animated/core"')
        .replace(/from "\.\/core"/g, 'from "spotifyplus/react/Animated/core"')
        .replace(/from "\.\.\/renderer"/g, 'from "spotifyplus/internal/renderer"')
        .replace(/from "\.\/renderer"/g, 'from "spotifyplus/internal/renderer"')
        .replace(/from "\.\.\/core\/models"/g, 'from "spotifyplus/entities"')
        .replace(/from "\.\/script-registry"/g, 'from "spotifyplus/internal/script-registry"')
        .replace(/import\("\.\.\/ui\/components"\)/g, 'import("spotifyplus/internal/components")')
        .replace(/import\("\.\/components"\)/g, 'import("spotifyplus/internal/components")')
        .replace(/import\("\.\.\/components"\)/g, 'import("spotifyplus/internal/components")')
        .replace(/import\("\.\.\/ui\/animated"\)/g, 'import("spotifyplus/internal/legacy-animated")')
        .replace(/import\("\.\/animated"\)/g, 'import("spotifyplus/internal/legacy-animated")')
        .replace(/import\("\.\.\/ui\/native-animation"\)/g, 'import("spotifyplus/internal/native-animation")')
        .replace(/import\("\.\/native-animation\/core"\)/g, 'import("spotifyplus/react/Animated/core")')
        .replace(/import\("\.\/core"\)/g, 'import("spotifyplus/react/Animated/core")')
        .replace(/import\("\.\.\/loader\/script-api"\)/g, 'import("spotifyplus/internal/script-api")');
}

function rewriteInternalComponents(text) {
    return rewriteCommonTypeImports(text)
        .replace(
            /import \{ type AnimatedNodeLike as LegacyAnimatedNodeLike \} from "spotifyplus\/internal\/legacy-animated";/,
            'import { type AnimatedNodeLike as LegacyAnimatedNodeLike } from "spotifyplus/internal/legacy-animated";',
        )
        .replace(
            /import \* as NativeAnimatedCore from "spotifyplus\/react\/Animated\/core";/,
            'import * as NativeAnimatedCore from "spotifyplus/react/Animated/core";',
        )
        .replace(
            /import type \{ NativeAnimatedNodeLike \} from "spotifyplus\/react\/Animated\/core";/,
            'import type { NativeAnimatedNodeLike } from "spotifyplus/react/Animated/core";',
        );
}

function rewritePublicComponents(text) {
    return text
        .replace(/from "\.\.\/ui\/components"/g, 'from "spotifyplus/internal/components"')
        .replace(/import\("\.\.\/ui\/components"\)/g, 'import("spotifyplus/internal/components")')
        .replace(/from "\.\/animated"/g, 'from "spotifyplus/react/Animated/core"')
        .replace(/import\("\.\/animated"\)/g, 'import("spotifyplus/react/Animated/core")')
        .replace(/from "\.\.\/ui\/animated"/g, 'from "spotifyplus/internal/legacy-animated"')
        .replace(/import\("\.\.\/ui\/animated"\)/g, 'import("spotifyplus/internal/legacy-animated")');
}

function makePackageJson() {
    const version = sourcePackage.version;
    return JSON.stringify({
        name: sourcePackage.name,
        version,
        type: "commonjs",
        main: "./index.cjs",
        types: "./index.d.ts",
        exports: {
            ".": {
                types: "./index.d.ts",
                default: "./index.cjs",
            },
            "./react": {
                types: "./components.d.ts",
                default: "./components.js",
            },
            "./react/Animated": {
                types: "./animated.d.ts",
                default: "./animated.js",
            },
            "./react/Animated/core": {
                types: "./internal/native-animation-core.d.ts",
                default: "./animated.js",
            },
            "./entities": {
                types: "./entities.d.ts",
                default: "./entities.js",
            },
            "./animated": {
                types: "./animated.d.ts",
                default: "./animated.js",
            },
            "./internal/components": {
                types: "./internal/components.d.ts",
                default: "./components.js",
            },
            "./internal/legacy-animated": {
                types: "./internal/legacy-animated.d.ts",
                default: "./components.js",
            },
            "./internal/native-animation": {
                types: "./internal/native-animation.d.ts",
                default: "./animated.js",
            },
            "./internal/renderer": {
                types: "./internal/renderer.d.ts",
                default: "./components.js",
            },
            "./internal/script-api": {
                types: "./internal/script-api.d.ts",
                default: "./index.cjs",
            },
            "./internal/script-registry": {
                types: "./internal/script-registry.d.ts",
                default: "./index.cjs",
            },
        },
        files: [
            ...publicFiles,
            "internal/*.d.ts",
        ],
        typesVersions: {
            "*": {
                react: ["components.d.ts"],
                "react/Animated": ["animated.d.ts"],
                "react/Animated/core": ["internal/native-animation-core.d.ts"],
                entities: ["entities.d.ts"],
                animated: ["animated.d.ts"],
                "internal/components": ["internal/components.d.ts"],
                "internal/legacy-animated": ["internal/legacy-animated.d.ts"],
                "internal/native-animation": ["internal/native-animation.d.ts"],
                "internal/renderer": ["internal/renderer.d.ts"],
                "internal/script-api": ["internal/script-api.d.ts"],
                "internal/script-registry": ["internal/script-registry.d.ts"],
            },
        },
        peerDependencies: {
            react: sourcePackage.dependencies?.react ?? "^19.2.4",
        },
        devDependencies: {
            react: sourcePackage.dependencies?.react ?? "^19.2.4",
            "@types/react": sourcePackage.devDependencies?.["@types/react"] ?? "^19.2.4",
        },
    }, null, 4) + "\n";
}

function makeIndexDts() {
    return [
        'export declare const SpotifyPlus: import("spotifyplus/internal/script-api").SpotifyPlusApi;',
        "",
    ].join("\n");
}

function makeScriptRegistryDts() {
    return [
        'import React from "react";',
        'import type { Surface } from "spotifyplus/entities";',
        "",
        "export type EventHandler = (payload: unknown) => void | Promise<void>;",
        "export type SurfaceRenderer<T extends string = string> = (surface: Surface & { type: T }) => React.ReactElement;",
        "",
    ].join("\n");
}

function makeScriptApiDts() {
    return [
        'import type { ContextMenu, OnClickCallback, PlatformData, Session, ShouldAddCallback, SideDrawerItem, SideOnClickCallback, SpotifyTrack } from "spotifyplus/entities";',
        'import type { EventHandler, SurfaceRenderer } from "spotifyplus/internal/script-registry";',
        "",
        "export interface ScriptConsole {",
        "    log: (...args: unknown[]) => void;",
        "    warn: (...args: unknown[]) => void;",
        "    error: (...args: unknown[]) => void;",
        "}",
        "",
        "export interface ContextMenuConstructor {",
        "    new(name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, disabled?: boolean): ContextMenu;",
        "}",
        "",
        "export interface SideDrawerConstructor {",
        "    new(name: string, onClick: SideOnClickCallback): SideDrawerItem;",
        "}",
        "",
        "export interface ScriptGlobals {",
        "    SpotifyPlus: SpotifyPlusApi;",
        "    console: ScriptConsole;",
        "    setTimeout: typeof setTimeout;",
        "    setInterval: typeof setInterval;",
        "    clearTimeout: typeof clearTimeout;",
        "    clearInterval: typeof clearInterval;",
        "    global: unknown;",
        "    globalThis: unknown;",
        "}",
        "",
        "export interface SpotifyPlusApi {",
        "    readonly scriptId: string;",
        "    readonly version: number;",
        "    log(...args: unknown[]): void;",
        "    warn(...args: unknown[]): void;",
        "    error(...args: unknown[]): void;",
        "    on(eventName: string, handler: EventHandler): void;",
        "    off(eventName: string, handler: EventHandler): void;",
        "    request<TPayload = unknown>(name: string, payload?: unknown): Promise<TPayload>;",
        "    toast(text: string, length?: 'short' | 'long'): void;",
        "    openUri(uri: string): void;",
        "    emit(eventName: string, payload?: unknown): void;",
        "    Platform: {",
        "        PlatformData: PlatformData;",
        "        Session: Session;",
        "        Storage: {",
        "            set(key: string, value: any): void;",
        "            get<T = any>(key: string): Promise<T | null>;",
        "            remove(key: string): void;",
        "            write(path: string, value: string): void;",
        "            write<T = any>(path: string, value: T): void;",
        "            write(path: string, data: Uint8Array | ArrayBuffer): void;",
        "            read<T = any>(path: string): Promise<T | string | Uint8Array | null>;",
        "        };",
        "    };",
        "    Internal: {",
        "        getTrack(uri: string): Promise<SpotifyTrack | null>;",
        "    };",
        "    Player: {",
        "        getCurrentTrack(): SpotifyTrack;",
        "        getProgress(): number;",
        "        seek(position: number): void;",
        "        play(): void;",
        "        pause(): void;",
        "        togglePlay(): void;",
        "        skipNext(): void;",
        "        skipPrevious(): void;",
        "    };",
        "    Surfaces: {",
        "        register(surfaceType: string, renderer: SurfaceRenderer<any>): void;",
        "    };",
        "    ContextMenu: ContextMenuConstructor;",
        "    SideDrawer: SideDrawerConstructor;",
        "}",
        "",
    ].join("\n");
}

function writeTypes(outDir) {
    writeFile(outDir, "index.d.ts", makeIndexDts());
    writeFile(outDir, "components.d.ts", rewritePublicComponents(readGenerated("sdk/components.d.ts")));
    writeFile(outDir, "animated.d.ts", rewriteCommonTypeImports(readGenerated("ui/native-animation/index.d.ts"))
        .replace(/from "\.\.\/components"/g, 'from "spotifyplus/react"'));
    writeFile(outDir, "entities.d.ts", rewriteCommonTypeImports(readGenerated("core/models.d.ts")));

    writeFile(outDir, "internal/components.d.ts", rewriteInternalComponents(readGenerated("ui/components.d.ts")));
    writeFile(outDir, "internal/legacy-animated.d.ts", rewriteCommonTypeImports(readGenerated("ui/animated.d.ts")));
    writeFile(outDir, "internal/native-animation.d.ts", rewriteCommonTypeImports(readGenerated("ui/native-animation/index.d.ts"))
        .replace(/from "\.\.\/components"/g, 'from "spotifyplus/react"'));
    writeFile(outDir, "internal/native-animation-core.d.ts", rewriteCommonTypeImports(readGenerated("ui/native-animation/core.d.ts")));
    writeFile(outDir, "internal/renderer.d.ts", rewriteCommonTypeImports(readGenerated("ui/renderer.d.ts")));
    writeFile(outDir, "internal/script-registry.d.ts", makeScriptRegistryDts());
    writeFile(outDir, "internal/script-api.d.ts", makeScriptApiDts());
}

async function bundleJs(outDir) {
    ensureDir(outDir);
    const common = {
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "es2020",
        external: ["react"],
        logLevel: "info",
    };

    await Promise.all([
        build({
            ...common,
            entryPoints: [path.join(root, "sdk/index.ts")],
            outfile: path.join(outDir, "index.cjs"),
        }),
        build({
            ...common,
            entryPoints: [path.join(root, "sdk/components.ts")],
            outfile: path.join(outDir, "components.js"),
        }),
        build({
            ...common,
            entryPoints: [path.join(root, "sdk/animated.ts")],
            outfile: path.join(outDir, "animated.js"),
        }),
        build({
            ...common,
            entryPoints: [path.join(root, "sdk/entities.ts")],
            outfile: path.join(outDir, "entities.js"),
        }),
    ]);
}

async function buildPackage() {
    fs.rmSync(primaryOutDir, { recursive: true, force: true });

    await bundleJs(primaryOutDir);
    writeTypes(primaryOutDir);
    writeFile(primaryOutDir, "package.json", makePackageJson());

    ensureDir(mirrorOutDir);
    unlinkIfExists(path.join(mirrorOutDir, "index.js"));
    unlinkIfExists(path.join(mirrorOutDir, "runtime.js"));
    unlinkIfExists(path.join(mirrorOutDir, "runtime.d.ts"));

    for (const file of publicFiles) copyFile(primaryOutDir, mirrorOutDir, file);
    for (const file of internalTypeFiles) copyFile(primaryOutDir, mirrorOutDir, path.join("internal", file));

    console.log(`Built SDK package in ${path.relative(root, primaryOutDir)}`);
    console.log(`Mirrored SDK package to ${path.relative(root, mirrorOutDir)}`);
}

await buildPackage();
