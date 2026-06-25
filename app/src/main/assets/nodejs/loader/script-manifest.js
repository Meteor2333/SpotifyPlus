"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseManifest = parseManifest;
function parseManifest(raw) {
    if (!raw || typeof raw !== 'object')
        throw new Error('Manifest must be an object');
    const manifest = raw;
    const id = ensureString(manifest.id, 'manifest.id');
    const name = ensureString(manifest.name, 'manifest.name');
    const version = ensureString(manifest.version, 'manifest.version');
    const main = ensureString(manifest.main, 'manifest.main');
    const description = optionalString(manifest.description, 'manifest.description');
    const author = optionalString(manifest.author, 'manifest.author');
    const api = typeof manifest.api === 'number' ? manifest.api : 1;
    const permissions = Array.isArray(manifest.permissions) ? manifest.permissions.map((item, index) => ensureString(item, `manifest.permissions[${index}]`)) : [];
    const native = parseNativeObject(manifest.native, 'manifest.native');
    return { id, name, version, main, description, author, permissions, api, native };
}
function parseNativeObject(raw, fieldName) {
    if (!raw || typeof raw !== 'object')
        return undefined;
    const native = raw;
    const dex = ensureString(native.dex, `${fieldName}.dex`);
    const pluginClass = ensureString(native.pluginClass, `${fieldName}.pluginClass`);
    return { dex, pluginClass };
}
function ensureString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0)
        throw new Error(`${fieldName} must be a non-empty string`);
    return value;
}
function optionalString(value, fieldName) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string')
        throw new Error(`${fieldName} must be a string`);
    return value;
}
