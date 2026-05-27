import React from "react";
import { Logger } from "../core/logger";
import { ContextMenu, SideDrawerItem, Surface } from "../core/models";
import { ScriptManifest } from "./script-manifest";
import { createRoot, RenderRoot } from "../ui/renderer";

export type EventHandler = (payload: unknown) => void | Promise<void>;

export interface Script {
    manifest: ScriptManifest;
    directoryPath: string;
}

interface RegisteredContextMenu {
    scriptId: string;
    id: string;
    menu: ContextMenu;
}

interface RegisteredSideDrawer {
    scriptId: string;
    id: string;
    item: SideDrawerItem;
}

export type SurfaceRenderer<T extends string = string> = (surface: Surface & { type: T }) => React.ReactElement;

export type RegisteredSurfaceRenderer = {
    scriptId: string;
    surfaceType: string;
    renderer: SurfaceRenderer<any>;
}

export class ScriptRegistry {
    private readonly scripts = new Map<string, Script>();
    private readonly eventHandlers = new Map<string, Map<string, Set<EventHandler>>>();
    private readonly menus = new Map<string, RegisteredContextMenu>();
    private readonly sideDrawerItems = new Map<string, RegisteredSideDrawer>();
    private readonly renderers = new Map<string, RegisteredSurfaceRenderer[]>();
    private readonly mountedSurfaces = new Map<string, RenderRoot>();

    constructor(private readonly logger: Logger) { }

    registerScript(script: Script): void {
        if (this.scripts.has(script.manifest.id)) throw new Error(`Duplicate script ID '${script.manifest.id}'`);
        this.scripts.set(script.manifest.id, script);
        this.logger.info(`Registered script ${script.manifest.id}`);
    }

    getScript(scriptId: string): Script | undefined {
        return this.scripts.get(scriptId);
    }

    getScripts(): Script[] {
        return Array.from(this.scripts.values());
    }

    on(scriptId: string, eventName: string, handler: EventHandler): void {
        let scriptMap = this.eventHandlers.get(eventName);
        if (!scriptMap) {
            scriptMap = new Map<string, Set<EventHandler>>();
            this.eventHandlers.set(eventName, scriptMap);
        }

        let handlers = scriptMap.get(scriptId);
        if (!handlers) {
            handlers = new Set<EventHandler>();
            scriptMap.set(scriptId, handlers);
        }

        handlers.add(handler);
        this.logger.info(`Script ${scriptId} subscribed to ${eventName}`);
    }

    off(scriptId: string, eventName: string, handler: EventHandler): void {
        const scriptMap = this.eventHandlers.get(eventName);
        const handlers = scriptMap?.get(scriptId);
        if (!handlers) return;

        handlers.delete(handler);
        if (handlers.size === 0) scriptMap?.delete(scriptId);
        if (scriptMap && scriptMap.size === 0) this.eventHandlers.delete(eventName);
    }

    async emit(eventName: string, payload: unknown): Promise<void> {
        const scriptMap = this.eventHandlers.get(eventName);
        if (!scriptMap) return;

        for (const [scriptId, handlers] of scriptMap.entries()) {
            for (const handler of handlers.values()) {
                try {
                    await Promise.resolve(handler(payload));
                } catch (error) {
                    this.logger.error(`Handler failed for script ${scriptId} on event ${eventName}`, error);
                }
            }
        }
    }

    registerContextMenu(scriptId: string, id: string, menu: ContextMenu): void {
        this.menus.set(id, { scriptId, id, menu });
    }

    emitContextMenuPress(scriptId: string, id: string, uri: string): void {
        const menu = this.menus.get(id);
        menu?.menu.onClick(uri);
    }

    registerSideDrawer(scriptId: string, id: string, item: SideDrawerItem): void {
        this.sideDrawerItems.set(id, { scriptId, id, item });
    }

    getSideDrawerItems() {
        return this.sideDrawerItems;
    }

    emitSideDrawerPress(scriptId: string, id: string): void {
        const item = this.sideDrawerItems.get(id);
        const result = item?.item.onClick();
        if (result && React.isValidElement(result)) {
            this.mountSurface(scriptId, { id: 'sideDrawer', type: 'sideDrawer' }, result);
        }
    }

    registerSurfaceRenderer<T extends string>(scriptId: string, surfaceType: T, renderer: SurfaceRenderer<T>): void {
        console.log('Registering surface renderer', { scriptId, surfaceType });

        const existing = this.renderers.get(surfaceType) ?? [];
        existing.push({ scriptId, surfaceType, renderer });
        this.renderers.set(surfaceType, existing);
    }

    getSurfaceRenderers(surfaceType: string): RegisteredSurfaceRenderer[] {
        return this.renderers.get(surfaceType) ?? [];
    }

    mountSurface(scriptId: string, surface: Surface, element: React.ReactElement): void {
        const key = `${scriptId}:${surface.id}`;
        const existing = this.mountedSurfaces.get(key);
        if (existing) existing.unmount();

        const root = createRoot(surface.type);
        console.log("before root.render", { surface, element });
        root.render(element);
        console.log("after root.render", { surface, children: root.getTree() });
        this.mountedSurfaces.set(key, root);
    }

    unmountSurface(scriptId: string, surfaceId: string): void {
        const key = `${scriptId}:${surfaceId}`;
        const root = this.mountedSurfaces.get(key);
        root?.unmount();
        this.mountedSurfaces.delete(key);
    }

    unmountAllSurfaces(surfaceId: string): void {
        this.mountedSurfaces.forEach((root, key) => {
            if (key.endsWith(`:${surfaceId}`)) {
                root.unmount();
                this.mountedSurfaces.delete(key);
            }
        });
    }
}
