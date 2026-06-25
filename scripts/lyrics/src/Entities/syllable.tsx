import React, { useEffect, useMemo } from 'react'
import { Animated, CommonViewProps } from 'spotifyplus/react'
import { SyllableMetadata } from '../Types/lyrics-types'
import Spline from 'typescript-cubic-spline';
import { cancelAnimation, clamp, interpolate, interpolateColor, multiply, playbackClock, SpringConfig, subtract, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'spotifyplus/react/Animated';

interface Props extends CommonViewProps {
    syllable: SyllableMetadata;
    emphasized: boolean;
    isBackground?: boolean;
    scaleSpline: Spline;
    yOffsetSpline: Spline;
    glowSpline: Spline;
}

const Tau = Math.PI * 2;

const ScaleDampingRatio = 0.6;
const ScaleFrequency = 0.7;

const YOffsetDampingRatio = 0.4;
const YOffsetFrequency = 1.25;

const GlowDampingRatio = 0.5;
const GlowFrequency = 1;

type SplineSamples = {
    input: number[];
    output: number[];
};

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

const sampleSinEase = (samples: number = 32) => {
    const input: number[] = [];
    const output: number[] = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;

        input.push(t);
        output.push(Math.sin(t * (Math.PI / 2)));
    }

    return { input, output };
};

interface EmphasizedLetterProps {
    char: string;
    index: number;
    letterCount: number;
    fontSize: number;
    isBackground: boolean;
    progress: unknown;
    scaleSamples: SplineSamples;
    yOffsetSamples: SplineSamples;
    glowSamples: SplineSamples;
    sinEaseSamples: SplineSamples;
    scaleSpringConfig: SpringConfig;
    yOffsetSpringConfig: SpringConfig;
    glowSpringConfig: SpringConfig;
}

const EmphasizedLetter = ({
    char,
    index,
    letterCount,
    fontSize,
    isBackground,
    progress,
    scaleSamples,
    yOffsetSamples,
    glowSamples,
    sinEaseSamples,
    scaleSpringConfig,
    yOffsetSpringConfig,
    glowSpringConfig,
}: EmphasizedLetterProps) => {
    const letterStart = index / letterCount;
    const letterEnd = (index + 1) / letterCount;

    const timeAlpha = useMemo(() => interpolate(
        progress,
        sinEaseSamples.input,
        sinEaseSamples.output,
        { extrapolate: 'clamp' },
    ), [progress, sinEaseSamples]);

    const letterProgress = useMemo(() => interpolate(
        timeAlpha,
        [letterStart, letterEnd],
        [0, 1],
        { extrapolate: 'clamp' },
    ), [timeAlpha, letterStart, letterEnd]);

    const letterGlowProgress = useMemo(() => interpolate(
        timeAlpha,
        [letterStart, 1],
        [0, 1],
        { extrapolate: 'clamp' },
    ), [timeAlpha, letterStart]);

    const scaleTarget = useMemo(() => interpolate(
        letterProgress,
        scaleSamples.input,
        scaleSamples.output,
        { extrapolate: 'clamp' },
    ), [letterProgress, scaleSamples]);

    const yOffsetTarget = useMemo(() => interpolate(
        letterProgress,
        yOffsetSamples.input,
        yOffsetSamples.output,
        { extrapolate: 'clamp' },
    ), [letterProgress, yOffsetSamples]);

    const glowTarget = useMemo(() => interpolate(
        letterGlowProgress,
        glowSamples.input,
        glowSamples.output,
        { extrapolate: 'clamp' },
    ), [letterGlowProgress, glowSamples]);

    const scale = useSharedValue(scaleSamples.output[0] ?? 1);
    const yOffset = useSharedValue(yOffsetSamples.output[0] ?? 0);
    const glow = useSharedValue(glowSamples.output[0] ?? 0);

    useEffect(() => {
        scale.value = withSpring(scaleTarget, scaleSpringConfig);
        return () => cancelAnimation(scale);
    }, [scale, scaleTarget, scaleSpringConfig]);

    useEffect(() => {
        yOffset.value = withSpring(yOffsetTarget, yOffsetSpringConfig);
        return () => cancelAnimation(yOffset);
    }, [yOffset, yOffsetTarget, yOffsetSpringConfig]);

    useEffect(() => {
        glow.value = withSpring(glowTarget, glowSpringConfig);
        return () => cancelAnimation(glow);
    }, [glow, glowTarget, glowSpringConfig]);

    const fullReveal = clamp(subtract(letterProgress, 0.08), 0, 1);
    const midReveal = clamp(subtract(letterProgress, 0.04), 0, 1);
    const softReveal = letterProgress;

    const letterStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: multiply(yOffset.value, 2) }, { scale: scale.value }],
    }), [scale, yOffset]);

    const shadowStyle = useAnimatedStyle(() => {
        const shadowRadius = multiply(4, 2, glow.value, 3);
        const shadowOpacity = clamp(multiply(glow.value, 1), 0, 1);

        return {
            textShadowColor: interpolateColor(shadowOpacity, [0, 1], ['#00ffffff', `#ffffffff`], { extrapolate: 'clamp' }),
            textShadowRadius: shadowRadius,
            textShadowOffset: { width: 0, height: 0 }
        }
    }, [glow]);

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
        <Animated.View style={[{ position: 'relative', alignSelf: 'flex-start' }, letterStyle]}>
            <Animated.Text fontSize={fontSize} textColor={isBackground ? '#777777' : '#9b9b9b'} style={shadowStyle}>
                {char}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: isBackground ? '#cfcfcf' : '#d3d3d3',
                }, softRevealStyle]}
            >
                {char}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: isBackground ? '#e7e7e7' : '#ececec',
                }, midRevealStyle]}
            >
                {char}
            </Animated.Text>

            <Animated.Text
                style={[{
                    ...revealTextStyle,
                    textColor: '#ffffff',
                }, fullRevealStyle]}
            >
                {char}
            </Animated.Text>
        </Animated.View>
    )
};

const SyllableView = ({ syllable, emphasized, isBackground = false, scaleSpline, yOffsetSpline, glowSpline }: Props) => {
    const text = `${syllable.Text}${syllable.IsPartOfWord ? '' : ' '}`;
    const fontSize = isBackground ? 18 : 36;
    const startMs = syllable.StartTime * 1000;
    const endMs = syllable.EndTime * 1000;

    const scaleSpringConfig = useMemo(() => createSpringConfig(ScaleDampingRatio, ScaleFrequency), []);
    const yOffsetSpringConfig = useMemo(() => createSpringConfig(YOffsetDampingRatio, YOffsetFrequency), []);
    const glowSpringConfig = useMemo(() => createSpringConfig(GlowDampingRatio, GlowFrequency), []);

    const scaleSamples = useMemo(() => sampleSpline(scaleSpline), [scaleSpline]);
    const yOffsetSamples = useMemo(() => {
        const samples = sampleSpline(yOffsetSpline);

        return {
            input: samples.input,
            output: samples.output.map(value => value * fontSize),
        };
    }, [yOffsetSpline, fontSize]);
    const glowSamples = useMemo(() => sampleSpline(glowSpline), [glowSpline]);
    const sinEaseSamples = useMemo(() => sampleSinEase(), []);

    const playbackMs = useDerivedValue(() => playbackClock({ unit: 'ms' }), []);

    const progress = useDerivedValue(
        () => interpolate(playbackMs, [startMs, endMs], [0, 1], { extrapolate: 'clamp' }),
        [playbackMs, startMs, endMs],
    );

    const scaleTarget = useMemo(() => interpolate(
        progress,
        scaleSamples.input,
        scaleSamples.output,
        { extrapolate: 'clamp' },
    ), [progress, scaleSamples]);

    const yOffsetTarget = useMemo(() => interpolate(
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

    useEffect(() => {
        scale.value = withSpring(scaleTarget, scaleSpringConfig);
        return () => cancelAnimation(scale);
    }, [scale, scaleTarget, scaleSpringConfig]);

    useEffect(() => {
        yOffset.value = withSpring(yOffsetTarget, yOffsetSpringConfig);
        return () => cancelAnimation(yOffset);
    }, [yOffset, yOffsetTarget, yOffsetSpringConfig]);

    useEffect(() => {
        glow.value = withSpring(glowTarget, glowSpringConfig);
        return () => cancelAnimation(glow);
    }, [glow, glowTarget, glowSpringConfig]);

    const fullReveal = clamp(subtract(progress, 0.08), 0, 1);
    const midReveal = clamp(subtract(progress, 0.04), 0, 1);
    const softReveal = progress;

    const wordStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: yOffset.value }, { scale: scale.value }],
    }), [scale, yOffset]);

    const shadowStyle = useAnimatedStyle(() => {
        const shadowRadius = multiply(4, 2, glow.value, 1);
        const shadowOpacity = clamp(multiply(glow.value, 0.35), 0, 1);

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

    if (emphasized) {
        const chars = [...syllable.Text];

        return (
            <Animated.View style={[{
                flexDirection: 'row',
                position: 'relative',
                alignSelf: 'flex-start',
                marginRight: syllable.IsPartOfWord ? 0 : 5,
            }, wordStyle]}>
                {chars.map((char, index) => (
                    <EmphasizedLetter
                        key={`${char}-${index}`}
                        char={char}
                        index={index}
                        letterCount={chars.length}
                        fontSize={fontSize}
                        isBackground={isBackground}
                        progress={progress}
                        scaleSamples={scaleSamples}
                        yOffsetSamples={yOffsetSamples}
                        glowSamples={glowSamples}
                        sinEaseSamples={sinEaseSamples}
                        scaleSpringConfig={scaleSpringConfig}
                        yOffsetSpringConfig={yOffsetSpringConfig}
                        glowSpringConfig={glowSpringConfig}
                    />
                ))}
            </Animated.View>
        )
    }

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
