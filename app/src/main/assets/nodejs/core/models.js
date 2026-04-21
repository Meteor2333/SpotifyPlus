"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uri = exports.SideDrawerItem = exports.ContextMenu = exports.SpotifyTrack = exports.SpotifyAlbum = void 0;
class SpotifyAlbum {
    constructor(title, artist, image, release) {
        this.title = title;
        this.artist = artist;
        this.release = release;
        this.image = image;
    }
    static from(data) {
        return new SpotifyAlbum(data.title, data.artist, data.image, data.release);
    }
    toJSON() {
        return {
            title: this.title,
            artist: this.artist,
            release: this.release,
            image: this.image
        };
    }
}
exports.SpotifyAlbum = SpotifyAlbum;
class SpotifyTrack {
    constructor(data) {
        this.uri = data.uri;
        this.id = this.uri.split(':')[2];
        this.title = data.title;
        this.trackNumber = data.trackNumber;
        this.artist = data.artist;
        this.artists = data.artists;
        this.album = data.album;
        this.durationMs = data.durationMs;
        this.explicit = data.explicit;
    }
    static from(data) {
        return new SpotifyTrack(data);
    }
    get displayName() {
        return `${this.title} - ${this.artist}`;
    }
    toJSON() {
        return {
            title: this.title,
            trackNumber: this.trackNumber,
            durationMs: this.durationMs,
            explicit: this.explicit,
            uri: this.uri,
            artist: this.artist,
            album: this.album,
            artists: this.artists
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
