"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.formatLogArgs = formatLogArgs;
class Logger {
    constructor(tag) {
        this.tag = tag;
    }
    info(message, ...args) {
        console.log(`[${this.tag}] ${formatLogArgs([message, ...args])}`);
    }
    warn(message, ...args) {
        console.warn(`[${this.tag}] ${formatLogArgs([message, ...args])}`);
    }
    error(message, ...args) {
        console.error(`[${this.tag}] ${formatLogArgs([message, ...args])}`);
    }
    child(childTag) {
        return new Logger(`${this.tag}:${childTag}`);
    }
}
exports.Logger = Logger;
const DEFAULT_OPTIONS = {
    maxDepth: 3,
    maxArrayItems: 20,
    maxObjectKeys: 30,
    maxStringLength: 500,
    maxOutputLength: 2000,
};
function formatLogArgs(args, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const seen = new WeakSet();
    const output = args.map(arg => safeFormat(arg, opts, 0, seen)).join(" ");
    return truncate(output, opts.maxOutputLength);
}
function safeFormat(value, options, depth, seen) {
    if (value == null)
        return String(value);
    if (typeof value === "string")
        return truncate(value, options.maxStringLength);
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
        return String(value);
    if (typeof value === "function")
        return `[Function ${value.name || "anonymous"}]`;
    if (value instanceof Error)
        return formatError(value, options);
    if (depth >= options.maxDepth)
        return summaryFor(value);
    if (typeof value === "object") {
        if (seen.has(value))
            return "[Circular]";
        seen.add(value);
        if (Array.isArray(value)) {
            const items = value.slice(0, options.maxArrayItems).map(item => safeFormat(item, options, depth + 1, seen));
            if (value.length > options.maxArrayItems)
                items.push(`... ${value.length - options.maxArrayItems} more`);
            return `[${items.join(", ")}]`;
        }
        const entries = Object.entries(value);
        const parts = entries.slice(0, options.maxObjectKeys).map(([key, entry]) => `${key}: ${safeFormat(entry, options, depth + 1, seen)}`);
        if (entries.length > options.maxObjectKeys)
            parts.push(`... ${entries.length - options.maxObjectKeys} more`);
        return `{ ${parts.join(", ")} }`;
    }
    return truncate(String(value), options.maxStringLength);
}
function formatError(error, options) {
    const stack = error.stack ? ` ${truncate(error.stack, options.maxStringLength)}` : "";
    return `${error.name}: ${truncate(error.message, options.maxStringLength)}${stack}`;
}
function summaryFor(value) {
    if (Array.isArray(value))
        return `[Array(${value.length})]`;
    if (value && typeof value === "object")
        return `[${value.constructor?.name || "Object"}]`;
    return String(value);
}
function truncate(value, maxLength) {
    if (value.length <= maxLength)
        return value;
    return `${value.slice(0, Math.max(0, maxLength - 20))}... <truncated>`;
}
