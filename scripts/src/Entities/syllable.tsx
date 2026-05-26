import React, { useEffect, useMemo } from 'react'
import { Animated, CommonViewProps } from 'spotifyplus/react'
import { SyllableMetadata } from '../Types/lyrics-types'
import Spline from 'typescript-cubic-spline';
import { cancelAnimation, clamp, interpolate, interpolateColor, multiply, playbackClock, SpringConfig, subtract, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'spotifyplus/react/Animated';

interface Props extends CommonViewProps {
    syllable: SyllableMetadata;
    isBackground?: boolean;
    scaleSpline: Spline;
    glowSpline: Spline;
    yOffsetSpline: Spline;
}

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


const sampleSpline = (spline: Spline, samples: number = 32) => {
    const input: number[] = [];
    const output: number[] = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;

        input.push(t);
        output.push(spline.at(t));
    }

    return { input, output };
};

const SyllableView = ({ syllable, isBackground = false, scaleSpline, yOffsetSpline, glowSpline }: Props) => {
    const text = `${syllable.Text}${syllable.IsPartOfWord ? '' : ' '}`;
    const fontSize = isBackground ? 18 : 36;
    const startMs = syllable.StartTime * 1000;
    const endMs = syllable.EndTime * 1000;

    const scaleSpringConfig = React.useMemo(() => createSpringConfig(ScaleDampingRatio, ScaleFrequency), []);
    const yOffsetSpringConfig = React.useMemo(() => createSpringConfig(YOffsetDampingRatio, YOffsetFrequency), []);
    const glowSpringConfig = useMemo(() => createSpringConfig(GlowDampingRatio, GlowFrequency), []);

    const scaleSamples = React.useMemo(() => sampleSpline(scaleSpline), [scaleSpline]);
    const yOffsetSamples = React.useMemo(() => {
        const samples = sampleSpline(yOffsetSpline);

        return {
            input: samples.input,
            output: samples.output.map(value => value * fontSize),
        };
    }, [yOffsetSpline, fontSize]);
    const glowSamples = useMemo(() => sampleSpline(glowSpline), [glowSpline]);

    const playbackMs = useDerivedValue(() => playbackClock({ unit: 'ms' }), []);

    const progress = useDerivedValue(
        () => interpolate(playbackMs, [startMs, endMs], [0, 1], { extrapolate: 'clamp' }),
        [playbackMs, startMs, endMs],
    );

    const scaleTarget = React.useMemo(() => interpolate(
        progress,
        scaleSamples.input,
        scaleSamples.output,
        { extrapolate: 'clamp' },
    ), [progress, scaleSamples]);

    const yOffsetTarget = React.useMemo(() => interpolate(
        progress,
        yOffsetSamples.input,
        yOffsetSamples.output,
        { extrapolate: 'clamp' },
    ), [progress, yOffsetSamples]);

    const glowTarget = useMemo(() => interpolate(
        progress,
        glowSamples.input,
        glowSamples.output,
        { extrapolate: 'clamp' }
    ), [progress, glowSamples]);

    const scale = useSharedValue(scaleSamples.output[0] ?? 1);
    const yOffset = useSharedValue(yOffsetSamples.output[0] ?? 0);
    const glow = useSharedValue(glowSamples.output[0] ?? 0);

    React.useEffect(() => {
        scale.value = withSpring(scaleTarget, scaleSpringConfig);
        return () => cancelAnimation(scale);
    }, [scale, scaleTarget, scaleSpringConfig]);

    React.useEffect(() => {
        yOffset.value = withSpring(yOffsetTarget, yOffsetSpringConfig);
        return () => cancelAnimation(yOffset);
    }, [yOffset, yOffsetTarget, yOffsetSpringConfig]);

    useEffect(() => {
        glow.value = withSpring(glowTarget, glowSpringConfig);
        return () => cancelAnimation(glow);
    }, [glow, glowTarget, glowSpringConfig]);

    const fullReveal = clamp(subtract(progress, 0.4), 0, 1);
    const midReveal = clamp(subtract(progress, 0.2), 0, 1);
    const softReveal = progress;

    const wordStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: yOffset.value }, { scale: scale.value }],
    }), [scale, yOffset]);


    const shadowStyle = useAnimatedStyle(() => {
        const emphasisMultiplier = isBackground ? 3 : 1;
        const opacityMultiplier = isBackground ? 1 : 0.35;

        const shadowRadius = multiply(4, 2, glow.value, emphasisMultiplier);
        const shadowOpacity = clamp(multiply(glow.value, opacityMultiplier), 0, 1);

        return {
            textShadowColor: interpolateColor(shadowOpacity, [0, 1], ['#00ffffff', `#ffffffff`], { extrapolate: 'clamp' }),
            textShadowRadius: shadowRadius,
            textShadowOffset: { width: 0, height: 0 }
        }
    }, [glow, isBackground]);

    const fullRevealStyle = useAnimatedStyle(() => ({ clipRight: fullReveal }), [fullReveal]);
    const midRevealStyle = useAnimatedStyle(() => ({ clipRight: midReveal }), [midReveal]);
    const softRevealStyle = useAnimatedStyle(() => ({ clipRight: softReveal }), [softReveal]);

    const revealTextStyle = {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: '100%',
        overflow: 'hidden' as const,
        fontSize,
    };

    return (
        <Animated.View style={[{ position: 'relative', alignSelf: 'flex-start' }, wordStyle]}>
            <Animated.Text fontSize={fontSize} textColor={isBackground ? '#777777' : '#9b9b9b'} style={shadowStyle}>
                {text}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: isBackground ? '#cfcfcf' : '#d3d3d3',
                }, softRevealStyle]}
            >
                {text}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: isBackground ? '#e7e7e7' : '#ececec',
                }, midRevealStyle]}
            >
                {text}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: '#ffffff',
                }, fullRevealStyle]}
            >
                {text}
            </Animated.Text>
        </Animated.View>
    )
}

export default SyllableView
