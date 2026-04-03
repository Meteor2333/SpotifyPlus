"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPacket = isPacket;
exports.parsePacket = parsePacket;
exports.stringify = stringify;
const PACKET_TYPES = new Set([
    'event',
    'command',
    'request',
    'response',
    'error',
]);
function isPacket(value) {
    if (!value || typeof value !== 'object')
        return false;
    const packet = value;
    if (typeof packet.type !== 'string' || !PACKET_TYPES.has(packet.type)) {
        return false;
    }
    if (!('payload' in packet)) {
        return false;
    }
    if ('id' in packet && packet.id !== undefined && typeof packet.id !== 'string') {
        return false;
    }
    if (packet.type === 'event' || packet.type === 'command' || packet.type === 'request') {
        return typeof packet.name === 'string';
    }
    if ('name' in packet && packet.name !== undefined && typeof packet.name !== 'string') {
        return false;
    }
    return true;
}
function parsePacket(json) {
    const parsed = JSON.parse(json);
    if (!isPacket(parsed))
        throw new Error('Invalid packet');
    return parsed;
}
function stringify(packet) {
    const seen = new WeakSet();
    return JSON.stringify(packet, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value))
                return '[Circular]';
            seen.add(value);
        }
        if (typeof value === 'function')
            return '[Function]';
        return value;
    });
}
