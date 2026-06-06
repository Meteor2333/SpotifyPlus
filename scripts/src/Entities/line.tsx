import React, { useEffect, useMemo } from 'react'
import { Animated, CommonViewProps } from 'spotifyplus/react'
import { LineVocal } from '../Types/lyrics-types'
import { cancelAnimation, clamp, interpolate, interpolateColor, multiply, playbackClock, SpringConfig, subtract, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'spotifyplus/react/Animated';

interface Props extends CommonViewProps {
    line: LineVocal;
}

const Tau = Math.PI * 2;

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

const LineView = ({ line, style }: Props) => {
    const fontSize = 36;
    const startMs = line.StartTime * 1000;
    const endMs = line.EndTime * 1000;

    const glowSpringConfig = useMemo(() => createSpringConfig(GlowDampingRatio, GlowFrequency), []);

    const playbackMs = useDerivedValue(() => playbackClock({ unit: 'ms' }), []);

    const progress = useDerivedValue(
        () => interpolate(playbackMs, [startMs, endMs], [0, 1], { extrapolate: 'clamp' }),
        [playbackMs, startMs, endMs],
    );

    const glowTarget = useMemo(() => interpolate(
        progress,
        [0, 0.15, 0.6, 1],
        [0, 1, 1, 0],
        { extrapolate: 'clamp' },
    ), [progress]);

    const glow = useSharedValue(0);

    useEffect(() => {
        glow.value = withSpring(glowTarget, glowSpringConfig);
        return () => cancelAnimation(glow);
    }, [glow, glowTarget, glowSpringConfig]);

    const fullReveal = clamp(subtract(progress, 0.08), 0, 1);
    const midReveal = clamp(subtract(progress, 0.04), 0, 1);
    const softReveal = progress;

    const shadowStyle = useAnimatedStyle(() => {
        const shadowRadius = multiply(4, 2, glow.value, 1);
        const shadowOpacity = clamp(multiply(glow.value, 0.35), 0, 1);

        return {
            textShadowColor: interpolateColor(shadowOpacity, [0, 1], ['#00ffffff', '#ffffffff'], { extrapolate: 'clamp' }),
            textShadowRadius: shadowRadius,
            textShadowOffset: { width: 0, height: 0 }
        }
    }, [glow]);

    const fullRevealStyle = useAnimatedStyle(() => ({ clipBottom: fullReveal }), [fullReveal]);
    const midRevealStyle = useAnimatedStyle(() => ({ clipBottom: midReveal }), [midReveal]);
    const softRevealStyle = useAnimatedStyle(() => ({ clipBottom: softReveal }), [softReveal]);

    const textAlign = line.OppositeAligned ? 'right' as const : 'left' as const;

    const revealMaskStyle = {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: '100%',
        overflow: 'hidden' as const,
        fontSize
    };

    const revealTextStyle = {
        fontSize,
        textAlign,
    };

    return (
        <Animated.View style={[{ position: 'relative', alignSelf: 'flex-start' }, style]}>
            <Animated.Text fontSize={fontSize} textColor={'#9b9b9b'} style={shadowStyle}>{line.Text}</Animated.Text>

            <Animated.Text style={[{ ...revealMaskStyle, textColor: '#d3d3d3' }, softRevealStyle]}>{line.Text}</Animated.Text>

            <Animated.Text style={[{ ...revealMaskStyle, textColor: '#ececec' }, midRevealStyle]}>{line.Text}</Animated.Text>

            <Animated.Text style={[{ ...revealMaskStyle, textColor: '#ffffff' }, fullRevealStyle]}>{line.Text}</Animated.Text>
        </Animated.View>
    )
}

export default LineView
