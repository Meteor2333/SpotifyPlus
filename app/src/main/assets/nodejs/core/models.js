"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uri = exports.SideDrawerItem = exports.ContextMenu = exports.SpotifyTrack = void 0;
class SpotifyTrack {
    constructor(data) {
        this.uri = data.uri;
        this.title = data.title;
        this.artist = data.artist;
        this.album = data.album;
        this.durationMs = data.durationMs;
        this.artworkUrl = data.artworkUrl;
    }
    static from(data) {
        return new SpotifyTrack(data);
    }
    get displayName() {
        return `${this.title} - ${this.artist}`;
    }
    toJSON() {
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
exports.SpotifyTrack = SpotifyTrack;
class ContextMenu {
    constructor(name, onClick, shouldAdd, disabled, registerThing) {
        this.name = name;
        this.onClick = onClick;
        this.shouldAdd = shouldAdd;
        this.disabled = disabled ?? false;
        this.registerThing = registerThing;
    }
    register() {
        if (!this.registerThing) {
            throw new Error('ContextMenu register thing has not been initialized');
        }
        this.registerThing(this);
        return this;
    }
}
exports.ContextMenu = ContextMenu;
class SideDrawerItem {
    constructor(name, onClick, registerThing) {
        this.name = name;
        this.onClick = onClick;
        this.registerThing = registerThing;
    }
    register() {
        if (!this.registerThing) {
            throw new Error('SideDrawer register thing has not been initialized');
        }
        this.registerThing(this);
        return this;
    }
}
exports.SideDrawerItem = SideDrawerItem;
class Uri {
    constructor(type, props) {
        this.type = type;
        this.id = props?.id;
    }
    static from(data) {
        return new Uri(data.type, data);
    }
    toString() {
        return this.id ? `spotify:${this.type}:${this.id}` : `spotify:${this.type}`;
    }
}
exports.Uri = Uri;
