import React from "react";
import type { NativeComponentRef } from "./renderer";
import { removeAnimatedProps, setAnimatedProps, updateSharedValue } from "./renderer";

const ANIMATED_MARKER = Symbol.for("spotifyplus.animated");

export type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";
export type Extrapolate = "extend" | "clamp" | "identity";
export type AnimatedPrimitive = number | string | boolean | null;

export type NativeAnimatedNode = {
    __animated: string;
    id?: number;
    value?: unknown;
    values?: unknown[];
    input?: unknown;
    inputRange?: number[];
    outputRange?: unknown[];
    extrapolate?: Extrapolate;
    extrapolateLeft?: Extrapolate;
    extrapolateRight?: Extrapolate;
    offset?: number;
    unit?: "ms" | "seconds";
    [key: string]: unknown;
};

export interface AnimatedNodeLike<T = any> {
    readonly [ANIMATED_MARKER]: true;
    toNativeAnimatedNode(): NativeAnimatedNode;
    __getValue(): T;
}

export type NativeAnimatedNodeLike<T = any> = AnimatedNodeLike<T>;

export type TimingAnimation<T = number> = {
    __animation: "timing";
    toValue: T;
    duration: number;
    delay: number;
    easing: EasingName;
};

export type SpringAnimation<T = number> = {
    __animation: "spring";
    toValue: T;
    duration: number;
    delay: number;
    damping: number;
    stiffness: number;
    mass: number;
};

export type AnimationConfig<T = number> = TimingAnimation<T> | SpringAnimation<T>;

let nextAnimatedId = 1;

function createAnimatedId() {
    return nextAnimatedId++;
}

function isPlainObject(value: unknown): value is Record<string, any> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isAnimatedNodeLike(value: unknown): value is AnimatedNodeLike {
    return !!value && typeof value === "object" && (value as any)[ANIMATED_MARKER] === true && typeof (value as any).toNativeAnimatedNode === "function";
}

function isAnimationConfig(value: unknown): value is AnimationConfig<any> {
    return isPlainObject(value) && (value.__animation === "timing" || value.__animation === "spring");
}

function toNativeValue(value: unknown): unknown {
    if (isAnimatedNodeLike(value)) return value.toNativeAnimatedNode();
    if (Array.isArray(value)) return value.map(toNativeValue);
    if (isPlainObject(value)) {
        const output: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) output[key] = toNativeValue(child);
        return output;
    }
    return value;
}

function initialValueOf(value: unknown): unknown {
    if (isAnimatedNodeLike(value)) return value.__getValue();
    if (Array.isArray(value)) return value.map(initialValueOf);
    if (isPlainObject(value)) {
        const output: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) output[key] = initialValueOf(child);
        return output;
    }
    return value;
}

class AnimatedExpression<T = any> implements AnimatedNodeLike<T> {
    readonly [ANIMATED_MARKER] = true;

    constructor(private readonly spec: NativeAnimatedNode, private readonly getValue: () => T) { }

    toNativeAnimatedNode(): NativeAnimatedNode {
        return this.spec;
    }

    __getValue(): T {
        return this.getValue();
    }
}

export class SharedValue<T = number> implements AnimatedNodeLike<T> {
    readonly [ANIMATED_MARKER] = true;
    readonly id = createAnimatedId();
    private current: T;
    private readonly listeners = new Set<(value: T) => void>();

    constructor(initialValue: T) {
        this.current = initialValue;
    }

    get value(): T {
        return this.current;
    }

    set value(next: T | AnimationConfig<T>) {
        if (isAnimationConfig(next)) {
            const animation = next;
            const toValue = animation.toValue;
            updateSharedValue(this.id, this.current, { ...animation, toValue: toNativeValue(toValue) });
            this.current = toValue;
            this.notify();
            return;
        }

        this.current = next as T;
        updateSharedValue(this.id, toNativeValue(this.current));
        this.notify();
    }

    setValue(next: T | AnimationConfig<T>) {
        this.value = next;
    }

    addListener(listener: (value: T) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    toNativeAnimatedNode(): NativeAnimatedNode {
        return { __animated: "value", id: this.id, value: toNativeValue(this.current) };
    }

    __getValue(): T {
        return this.current;
    }

    private notify() {
        for (const listener of this.listeners) listener(this.current);
    }
}

export function useSharedValue<T = number>(initialValue: T): SharedValue<T> {
    const ref = React.useRef<SharedValue<T> | null>(null);
    if (!ref.current) ref.current = new SharedValue(initialValue);
    return ref.current;
}

export function withTiming<T = number>(toValue: T, config: Partial<Omit<TimingAnimation<T>, "__animation" | "toValue">> = {}): TimingAnimation<T> {
    return { __animation: "timing", toValue, duration: config.duration ?? 300, delay: config.delay ?? 0, easing: config.easing ?? "easeInOut" };
}

export function withSpring<T = number>(toValue: T, config: Partial<Omit<SpringAnimation<T>, "__animation" | "toValue">> = {}): SpringAnimation<T> {
    return { __animation: "spring", toValue, duration: config.duration ?? 450, delay: config.delay ?? 0, damping: config.damping ?? 14, stiffness: config.stiffness ?? 120, mass: config.mass ?? 1 };
}

function expression<T>(spec: NativeAnimatedNode, getValue: () => T): AnimatedExpression<T> {
    return new AnimatedExpression(spec, getValue);
}

function animatedNumber(value: unknown, fallback = 0): number {
    const raw = initialValueOf(value);
    if (typeof raw === "number") return raw;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function binaryExpression(type: string, values: unknown[], evaluator: (values: number[]) => number) {
    return expression<number>({ __animated: type, values: values.map(toNativeValue) }, () => evaluator(values.map(value => animatedNumber(value))));
}

export function add(...values: unknown[]) {
    return binaryExpression("add", values, nums => nums.reduce((sum, value) => sum + value, 0));
}

export function subtract(left: unknown, right: unknown) {
    return binaryExpression("subtract", [left, right], nums => nums[0] - nums[1]);
}

export function multiply(...values: unknown[]) {
    return binaryExpression("multiply", values, nums => nums.reduce((product, value) => product * value, 1));
}

export function divide(left: unknown, right: unknown) {
    return binaryExpression("divide", [left, right], nums => nums[1] === 0 ? 0 : nums[0] / nums[1]);
}

export function clamp(value: unknown, min: number, max: number) {
    return expression<number>({ __animated: "clamp", input: toNativeValue(value), min, max }, () => Math.max(min, Math.min(max, animatedNumber(value))));
}

export function interpolate(input: unknown, inputRange: number[], outputRange: number[], extrapolate: Extrapolate = "extend") {
    return expression<number>({ __animated: "interpolate", input: toNativeValue(input), inputRange, outputRange, extrapolate }, () => {
        const x = animatedNumber(input);
        return interpolateNumber(x, inputRange, outputRange, extrapolate, extrapolate);
    });
}

export function interpolateColor(input: unknown, inputRange: number[], outputRange: Array<string | number>, extrapolate: Extrapolate = "clamp") {
    return expression<string | number>({ __animated: "interpolateColor", input: toNativeValue(input), inputRange, outputRange, extrapolate }, () => outputRange[0] ?? 0);
}

export function usePlaybackClock(options: { unit?: "ms" | "seconds"; offset?: number } = {}) {
    const unit = options.unit ?? "ms";
    const offset = options.offset ?? 0;
    return expression<number>({ __animated: "playback", unit, offset }, () => 0);
}

export function usePlaybackValue(config: { inputRange: number[]; outputRange: number[]; unit?: "ms" | "seconds"; extrapolate?: Extrapolate }) {
    return interpolate(usePlaybackClock({ unit: config.unit ?? "ms" }), config.inputRange, config.outputRange, config.extrapolate ?? "clamp");
}

export function useDerivedValue<T>(factory: () => AnimatedNodeLike<T> | T, deps: React.DependencyList = []) {
    return React.useMemo(factory, deps);
}

export function useAnimatedStyle<T extends Record<string, any>>(factory: () => T, deps: React.DependencyList = []) {
    return React.useMemo(factory, deps);
}

export function useAnimatedProps<T extends Record<string, any>>(factory: () => T, deps: React.DependencyList = []) {
    return React.useMemo(factory, deps);
}

function interpolateNumber(x: number, inputRange: number[], outputRange: number[], extrapolateLeft: Extrapolate, extrapolateRight: Extrapolate) {
    if (inputRange.length < 2 || outputRange.length < 2) return outputRange[0] ?? 0;
    let index = 0;
    for (let i = 1; i < inputRange.length; i++) {
        if (x <= inputRange[i]) {
            index = i - 1;
            break;
        }
        index = i - 1;
    }

    const inMin = inputRange[index];
    const inMax = inputRange[Math.min(index + 1, inputRange.length - 1)];
    const outMin = outputRange[index];
    const outMax = outputRange[Math.min(index + 1, outputRange.length - 1)];

    if (x < inputRange[0]) {
        if (extrapolateLeft === "identity") return x;
        if (extrapolateLeft === "clamp") return outputRange[0];
    }

    if (x > inputRange[inputRange.length - 1]) {
        if (extrapolateRight === "identity") return x;
        if (extrapolateRight === "clamp") return outputRange[outputRange.length - 1];
    }

    const t = inMax === inMin ? 0 : (x - inMin) / (inMax - inMin);
    return outMin + ((outMax - outMin) * t);
}

function flattenStyle(style: any): Record<string, any> {
    if (!style) return {};
    if (Array.isArray(style)) {
        const output: Record<string, any> = {};
        for (const item of style) Object.assign(output, flattenStyle(item));
        return output;
    }
    return isPlainObject(style) ? { ...style } : {};
}

function normalizeAnimatedPropName(key: string) {
    switch (key) {
        case "opacity": return "alpha";
        case "translateX": return "translationX";
        case "translateY": return "translationY";
        case "translateZ": return "translationZ";
        case "rotate": return "rotation";
        case "rotateX": return "rotationX";
        case "rotateY": return "rotationY";
        case "color": return "textColor";
        case "fontSize": return "textSizeSp";
        default: return key;
    }
}

function normalizeTransformAnimatedProps(transform: unknown, animatedProps: Record<string, unknown>, cleanedStyle: Record<string, unknown>) {
    if (!Array.isArray(transform)) return transform;

    const cleanedTransform: unknown[] = [];
    for (const item of transform) {
        if (!isPlainObject(item)) {
            cleanedTransform.push(item);
            continue;
        }

        const cleanedItem: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(item)) {
            const nativeKey = normalizeAnimatedPropName(key);
            if (isAnimatedNodeLike(value)) {
                animatedProps[nativeKey] = value.toNativeAnimatedNode();
                cleanedItem[key] = value.__getValue();
            } else {
                cleanedItem[key] = value;
            }
        }
        cleanedTransform.push(cleanedItem);
    }

    cleanedStyle.transform = cleanedTransform;
    return cleanedTransform;
}

function extractAnimatedPropsFromStyle(style: any) {
    const flat = flattenStyle(style);
    const animatedProps: Record<string, unknown> = {};
    const cleanedStyle: Record<string, unknown> = { ...flat };

    if (flat.transform !== undefined) normalizeTransformAnimatedProps(flat.transform, animatedProps, cleanedStyle);

    for (const [key, value] of Object.entries(flat)) {
        if (key === "transform") continue;
        if (!isAnimatedNodeLike(value)) continue;
        animatedProps[normalizeAnimatedPropName(key)] = value.toNativeAnimatedNode();
        cleanedStyle[key] = value.__getValue();
    }

    return { animatedProps, cleanedStyle };
}

function extractAnimatedProps<P extends Record<string, any>>(props: P) {
    const animatedProps: Record<string, unknown> = {};
    const cleanedProps: Record<string, unknown> = { ...props };

    if (props.style !== undefined) {
        const styleResult = extractAnimatedPropsFromStyle(props.style);
        Object.assign(animatedProps, styleResult.animatedProps);
        cleanedProps.style = styleResult.cleanedStyle;
    }

    const explicitAnimatedProps = props.animatedProps;
    if (isPlainObject(explicitAnimatedProps)) {
        for (const [key, value] of Object.entries(explicitAnimatedProps)) {
            if (isAnimatedNodeLike(value)) animatedProps[normalizeAnimatedPropName(key)] = value.toNativeAnimatedNode();
            else animatedProps[normalizeAnimatedPropName(key)] = toNativeValue(value);
        }
        delete cleanedProps.animatedProps;
    }

    for (const [key, value] of Object.entries(props)) {
        if (key === "style" || key === "animatedProps") continue;
        if (!isAnimatedNodeLike(value)) continue;
        animatedProps[normalizeAnimatedPropName(key)] = value.toNativeAnimatedNode();
        cleanedProps[key] = value.__getValue();
    }

    return { cleanedProps: cleanedProps as P, animatedProps };
}

function stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, child) => {
        if (!isPlainObject(child)) return child;
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(child).sort()) output[key] = child[key];
        return output;
    });
}

export function createAnimatedComponent<P extends Record<string, any>>(Component: React.ComponentType<P>) {
    const AnimatedComponent = React.forwardRef<NativeComponentRef, P>((props, forwardedRef) => {
        const nativeRef = React.useRef<NativeComponentRef | null>(null);
        const { cleanedProps, animatedProps } = React.useMemo(() => extractAnimatedProps(props), [props]);
        const animatedKey = React.useMemo(() => stableStringify(animatedProps), [animatedProps]);

        React.useImperativeHandle(forwardedRef, () => nativeRef.current as NativeComponentRef, []);

        React.useLayoutEffect(() => {
            const nodeId = nativeRef.current?.nodeId;
            if (!nodeId) return;
            if (Object.keys(animatedProps).length === 0) {
                removeAnimatedProps(nodeId);
                return;
            }
            setAnimatedProps(nodeId, animatedProps);
            return () => removeAnimatedProps(nodeId);
        }, [animatedKey]);

        return React.createElement(Component, { ...(cleanedProps as P), ref: nativeRef as any });
    });

    AnimatedComponent.displayName = `Animated(${(Component as any).displayName ?? Component.name ?? "Component"})`;
    return AnimatedComponent as unknown as React.ComponentType<P & { animatedProps?: Record<string, unknown>; ref?: React.Ref<NativeComponentRef> }>;
}

export function runOnJS<T extends (...args: any[]) => any>(fn: T): T {
    return fn;
}

export const Easing = {
    linear: "linear" as EasingName,
    ease: "easeInOut" as EasingName,
    in: () => "easeIn" as EasingName,
    out: () => "easeOut" as EasingName,
    inOut: () => "easeInOut" as EasingName,
    bounce: "bounce" as EasingName,
};

export default {
    Easing,
    SharedValue,
    add,
    clamp,
    createAnimatedComponent,
    divide,
    interpolate,
    interpolateColor,
    isAnimatedNodeLike,
    multiply,
    runOnJS,
    subtract,
    useAnimatedProps,
    useAnimatedStyle,
    useDerivedValue,
    usePlaybackClock,
    usePlaybackValue,
    useSharedValue,
    withSpring,
    withTiming,
};
