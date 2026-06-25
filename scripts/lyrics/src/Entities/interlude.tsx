import { useEffect, useMemo, useState } from 'react'
import { CurveInterpolator } from 'curve-interpolator';
import Spline from 'typescript-cubic-spline';
import { Animated, CommonViewProps, View } from 'spotifyplus/react'
import { Interlude } from '../Types/lyrics-types';
import { cancelAnimation, clamp, divide, interpolate, multiply, playbackClock, SpringConfig, subtract, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'spotifyplus/react/Animated';

interface Props extends CommonViewProps {
    metadata: Interlude;
    oppositeAligned?: boolean;
}

type Point = [number, number];

type Samples = {
    input: number[];
    output: number[];
};

const Tau = Math.PI * 2;

const ScaleDampingRatio = 0.6;
const ScaleFrequency = 0.7;

const YOffsetDampingRatio = 0.4;
const YOffsetFrequency = 1.25;

const GlowDampingRatio = 0.5;
const GlowFrequency = 1;

const createSpringConfig = (dampingRatio: number, frequency: number): SpringConfig => {
    const omega = frequency * Tau;

    return {
        mass: 1,
        stiffness: omega * omega,
        damping: 2 * dampingRatio * omega,
        restSpeedThreshold: 0.001,
        restDisplacementThreshold: 0.001,
    };
};

const PulseInterval = 2.25;
const DownPulse = 0.9;
const UpPulse = 1.05;
const DotStep = 0.92 / 3;
const DotSize = 20;

const MainScaleRange: Point[] = [
    [0, 0],
    [0.2, 1.05],
    [-0.075, 1.15],
    [0, 0],
];

const MainOpacityRange: Point[] = [
    [0, 0],
    [0.5, 1],
    [-0.075, 1],
    [0, 0],
];

const MainYOffsetRange: Point[] = [
    [0, 1 / 100],
    [0.9, -(1 / 60)],
    [1, 0],
];

const DotScaleSpline = new Spline([0, 0.7, 1], [0.75, 1.05, 1]);
const DotYOffsetSpline = new Spline([0, 0.9, 1], [0.125, -0.2, 0]);
const DotGlowSpline = new Spline([0, 0.6, 1], [0, 1, 1]);
const DotOpacitySpline = new Spline([0, 0.6, 1], [0.35, 1, 1]);

const sampleSpline = (spline: Spline, samples = 32, multiplier = 1): Samples => {
    const input: number[] = [];
    const output: number[] = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;

        input.push(t);
        output.push(spline.at(t) * multiplier);
    }

    return { input, output };
};

const sampleCurvePoint = (curve: CurveInterpolator, samples = 64, multiplier = 1): Samples => {
    const input: number[] = [];
    const output: number[] = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const point = curve.getPointAt(t);

        input.push(t);
        output.push((point[1] ?? 0) * multiplier);
    }

    return { input, output };
};

const pointY = (point: unknown): number | undefined => {
    if (!point || typeof point !== 'object') return undefined;

    const value = (point as { 1?: unknown })[1];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const sampleCurveIntersections = (curve: CurveInterpolator, samples = 96, fallback = 1, edgeValues?: { start?: number; end?: number }): Samples => {
    const input: number[] = [];
    const output: number[] = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        let y = fallback;

        if (i === 0 && edgeValues?.start !== undefined) {
            y = edgeValues.start;
        } else if (i === samples && edgeValues?.end !== undefined) {
            y = edgeValues.end;
        } else {
            const intersections = curve.getIntersects(t, 0, 0);
            const points = Array.isArray(intersections) ? intersections : [intersections];
            y = pointY(points[points.length - 1]) ?? fallback;
        }

        input.push(t);
        output.push(y);
    }

    return { input, output };
};

const createMainScalePoints = (duration: number): Point[] => {
    const points = MainScaleRange.map(([time, value]) => [time, value] as Point);

    points[2] = [points[2][0] + duration, points[2][1]];
    points[3] = [points[3][0] + duration, points[3][1]];

    const startPoint = points[1];
    const endPoint = points[2];
    const deltaTime = endPoint[0] - startPoint[0];

    for (let i = Math.floor(deltaTime / PulseInterval); i > 0; i -= 1) {
        const time = startPoint[0] + (i * PulseInterval);
        const value = i % 2 === 0 ? UpPulse : DownPulse;

        points.splice(2, 0, [time, value]);
    }

    return points.map(([time, value]) => [time / duration, value]);
};

const createNormalizedPoints = (points: Point[], duration: number): Point[] => {
    return points.map(([time, value]) => [time / duration, value]);
};

const InterludeView = ({ metadata, oppositeAligned = true }: Props) => {
    const startMs = metadata.StartTime * 1000;
    const endMs = metadata.EndTime * 1000;
    const duration = Math.max(metadata.EndTime - metadata.StartTime, 0.001);

    const scaleSpringConfig = useMemo(() => createSpringConfig(ScaleDampingRatio, ScaleFrequency), []);
    const yOffsetSpringConfig = useMemo(() => createSpringConfig(YOffsetDampingRatio, YOffsetFrequency), []);
    const glowSpringConfig = useMemo(() => createSpringConfig(GlowDampingRatio, GlowFrequency), []);

    const dotScaleSamples = useMemo(() => sampleSpline(DotScaleSpline), []);
    const dotYOffsetSamples = useMemo(() => sampleSpline(DotYOffsetSpline, 32, 36), []);
    const dotGlowSamples = useMemo(() => sampleSpline(DotGlowSpline), []);
    const dotOpacitySamples = useMemo(() => sampleSpline(DotOpacitySpline), []);

    const mainScaleSamples = useMemo(() => {
        const curve = new CurveInterpolator(createMainScalePoints(duration));
        return sampleCurveIntersections(curve, 96, 1, { start: 0, end: 0 });
    }, [duration]);

    const mainOpacitySamples = useMemo(() => {
        const curve = new CurveInterpolator(createNormalizedPoints(MainOpacityRange, duration));
        return sampleCurveIntersections(curve, 96, 1, { start: 0, end: 0 });
    }, [duration]);

    const mainYOffsetSamples = useMemo(() => {
        const curve = new CurveInterpolator(MainYOffsetRange);
        return sampleCurvePoint(curve, 64, 25);
    }, []);

    const playbackMs = useDerivedValue(() => playbackClock({ unit: 'ms' }), []);
    const progress = useDerivedValue(() => interpolate(playbackMs, [startMs, endMs], [0, 1], { extrapolate: 'clamp' }), [playbackMs, startMs, endMs]);
    const isActive = useDerivedValue(() => interpolate(playbackMs, [startMs - 1, startMs, endMs, endMs + 1], [0, 1, 1, 0], { extrapolate: 'clamp' }), [playbackMs, startMs, endMs]);

    const mainScaleTarget = useMemo(() => interpolate(progress, mainScaleSamples.input, mainScaleSamples.output, { extrapolate: 'clamp' }), [progress, mainScaleSamples]);
    const mainYOffsetTarget = useMemo(() => interpolate(progress, mainYOffsetSamples.input, mainYOffsetSamples.output, { extrapolate: 'clamp' }), [progress, mainYOffsetSamples]);
    const mainOpacityTarget = useMemo(() => multiply(isActive, interpolate(progress, mainOpacitySamples.input, mainOpacitySamples.output, { extrapolate: 'clamp' })), [progress, isActive, mainOpacitySamples]);

    const mainStyle = useAnimatedStyle(() => ({
        opacity: clamp(mainOpacityTarget, 0, 1),
        transform: [{ translateY: mainYOffsetTarget }, { scale: mainScaleTarget }],
    }), [mainOpacityTarget, mainYOffsetTarget, mainScaleTarget]);

    const Dot = ({ index }: { index: number }) => {
        const dotStart = index * DotStep;
        const dotProgress = useDerivedValue(() => clamp(divide(subtract(progress, dotStart), DotStep), 0, 1), [progress, dotStart]);

        const dotScaleTarget = useMemo(() => interpolate(dotProgress, dotScaleSamples.input, dotScaleSamples.output, { extrapolate: 'clamp' }), [dotProgress]);
        const dotYOffsetTarget = useMemo(() => interpolate(dotProgress, dotYOffsetSamples.input, dotYOffsetSamples.output, { extrapolate: 'clamp' }), [dotProgress]);
        const dotGlowTarget = useMemo(() => interpolate(dotProgress, dotGlowSamples.input, dotGlowSamples.output, { extrapolate: 'clamp' }), [dotProgress]);
        const dotOpacity = useMemo(() => interpolate(dotProgress, dotOpacitySamples.input, dotOpacitySamples.output, { extrapolate: 'clamp' }), [dotProgress]);

        const dotScale = useSharedValue(dotScaleSamples.output[0] ?? 1);
        const dotYOffset = useSharedValue(dotYOffsetSamples.output[0] ?? 0);
        const dotGlow = useSharedValue(dotGlowSamples.output[0] ?? 0);

        useEffect(() => {
            dotScale.value = withSpring(dotScaleTarget, scaleSpringConfig);
            return () => cancelAnimation(dotScale);
        }, [dotScale, dotScaleTarget, scaleSpringConfig]);

        useEffect(() => {
            dotYOffset.value = withSpring(dotYOffsetTarget, yOffsetSpringConfig);
            return () => cancelAnimation(dotYOffset);
        }, [dotYOffset, dotYOffsetTarget, yOffsetSpringConfig]);

        useEffect(() => {
            dotGlow.value = withSpring(dotGlowTarget, glowSpringConfig);
            return () => cancelAnimation(dotGlow);
        }, [dotGlow, dotGlowTarget, glowSpringConfig]);

        const dotStyle = useAnimatedStyle(() => {
            const glow = clamp(dotGlow.value, 0, 1);

            return {
                opacity: clamp(dotOpacity, 0, 1),
                transform: [{ translateY: dotYOffset.value }, { scale: dotScale.value }],
                shadowColor: 'white',
                shadowOpacity: glow,
                shadowRadius: multiply(glow, 10),
                elevation: multiply(glow, 10)
            };
        }, [dotOpacity, dotYOffset, dotScale, dotGlow]);

        return (
            <View style={{ width: DotSize + 6, height: DotSize + 28, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                <Animated.View style={[{ width: DotSize, height: DotSize, borderRadius: DotSize / 2, backgroundColor: 'white' }, dotStyle]} />
            </View>
        )
    };

    return (
        <Animated.View style={[
            oppositeAligned
                ? { flex: 1, paddingRight: 25, paddingLeft: 35, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', overflow: 'visible' }
                : { flex: 1, paddingLeft: 25, paddingRight: 35, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', overflow: 'visible' }
        ]}>
            <Dot index={0} />
            <Dot index={1} />
            <Dot index={2} />
        </Animated.View>
    )
}

export default InterludeView
