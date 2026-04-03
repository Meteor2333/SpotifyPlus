import { SpotifyPlusApi } from "../loader/script-api";

export interface SpotifyTrackData {
    uri: string;
    title: string;
    artist: string;
    album: string;
    durationMs: number;
    artworkUrl: string;
}

export class SpotifyTrack {
    readonly uri: string;
    readonly title: string;
    readonly artist: string;
    readonly album: string;
    readonly durationMs: number;
    readonly artworkUrl: string;

    constructor(data: SpotifyTrackData) {
        this.uri = data.uri;
        this.title = data.title;
        this.artist = data.artist;
        this.album = data.album;
        this.durationMs = data.durationMs;
        this.artworkUrl = data.artworkUrl;
    }

    static from(data: SpotifyTrackData): SpotifyTrack {
        return new SpotifyTrack(data);
    }

    get displayName(): string {
        return `${this.title} - ${this.artist}`;
    }

    toJSON(): SpotifyTrackData {
        return {
            uri: this.uri,
            title: this.title,
            artist: this.artist,
            album: this.album,
            durationMs: this.durationMs,
            artworkUrl: this.artworkUrl
        };
    }
}

export interface GetProgressData {
    position: number;
}

export interface MenuItemDefinition {
    id: string;
    title: string;
}

export interface MenuContext {
    type: string;
    track?: SpotifyTrackData;
    [key: string]: unknown;
}

export interface PlatformData {
    clientVersion: string;
    osName: string;
    osVersion: string;
    sdkVersion: number;
}

export interface Session {
    accessToken: string;
}

export interface ItemPress {
    id: string;
    scriptId: string;
}

export type ContextMenuRegister = (menu: ContextMenu) => void;
export type OnClickCallback = () => void;
export type ShouldAddCallback = (uri: string, contextUri: string) => boolean;

export class ContextMenu {
    private readonly registerThing?: ContextMenuRegister;

    public name: string;
    readonly onClick: OnClickCallback;
    readonly shouldAdd?: ShouldAddCallback;
    // Icon
    public disabled: boolean;

    constructor(name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, disabled?: boolean, registerThing?: ContextMenuRegister) {
        this.name = name;
        this.onClick = onClick;
        this.shouldAdd = shouldAdd;
        this.disabled = disabled ?? false;
        this.registerThing = registerThing;
    }

    register(): this {
        if (!this.registerThing) {
            throw new Error('ContextMenu register thing has not been initialized');
        }

        this.registerThing(this);
        return this;
    }
}

export type SideDrawerRegister = (drawer: SideDrawerItem) => void;
export type SideOnClickCallback = () => void;

export class SideDrawerItem {
    private readonly registerThing?: SideDrawerRegister;

    public name: string;
    readonly onClick: SideOnClickCallback;

    constructor(name: string, onClick: SideOnClickCallback, registerThing?: SideDrawerRegister) {
        this.name = name;
        this.onClick = onClick;
        this.registerThing = registerThing;
    }

    register(): this {
        if (!this.registerThing) {
            throw new Error('SideDrawer register thing has not been initialized');
        }

        this.registerThing(this);
        return this;
    }
}

export interface UriData {
    type: string;
    id?: string;
}

export class Uri {
    public type: string;
    public id?: string;

    constructor(type: string, props?: UriData) {
        this.type = type;
        this.id = props?.id;
    }

    static from(data: UriData): Uri {
        return new Uri(data.type, data);
    }

    toString() {
        return this.id ? `spotify:${this.type}:${this.id}` : `spotify:${this.type}`;
    }
}

export type Surface = {
    id: string;
    type: string;
}