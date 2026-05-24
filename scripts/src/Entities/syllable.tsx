import React from 'react'
import { CommonViewProps, Animated, Text } from 'spotifyplus/react'
import { SyllableMetadata } from '../Types/lyrics-types'

interface Props extends CommonViewProps {
    syllable: SyllableMetadata;
    relativeTime: number;
    timeScale: number;
    relativeStart: number;
    relativeEnd: number;
    duration: number;
    startScale: number;
    durationScale: number;
    isBackground?: boolean;
    startTime: number;
}

const SyllableView = ({ syllable, relativeTime, timeScale, relativeStart, relativeEnd, duration, startScale, durationScale, isBackground = false, startTime }: Props) => {
    const text = `${syllable.Text}${syllable.IsPartOfWord ? '' : ' '}`;
    const fontSize = isBackground ? 18 : 36;
    const startMs = syllable.StartTime * 1000;
    const endMs = syllable.EndTime * 1000;

    const playbackMs = Animated.useDerivedValue(() => Animated.playbackClock({ unit: 'ms' }), []);
    const progress = Animated.useDerivedValue(
        () => Animated.interpolate(playbackMs, [startMs, endMs], [0, 1], { extrapolate: 'clamp' }),
        [startMs, endMs],
    );
    const scale = Animated.interpolate(
        progress,
        [0, 0.1, 0.58, 0.86, 1],
        [1, 1.2, 1.2, 1.04, 1],
        { extrapolate: 'clamp' },
    );
    const yOffset = Animated.interpolate(
        progress,
        [0, 0.06, 0.58, 0.98, 1],
        [0, -fontSize * 0.15, -fontSize * 0.15, -fontSize * 0.06, 0],
        { extrapolate: 'clamp' },
    );
    const fullReveal = Animated.clamp(Animated.subtract(progress, 0.08), 0, 1);
    const midReveal = Animated.clamp(Animated.subtract(progress, 0.04), 0, 1);
    const softReveal = progress;

    const wordStyle = Animated.useAnimatedStyle(() => ({
        transform: [{ translateY: yOffset }, { scale }],
    }), [progress, scale, yOffset]);
    const fullRevealStyle = Animated.useAnimatedStyle(() => ({ clipRight: fullReveal }), [fullReveal]);
    const midRevealStyle = Animated.useAnimatedStyle(() => ({ clipRight: midReveal }), [midReveal]);
    const softRevealStyle = Animated.useAnimatedStyle(() => ({ clipRight: softReveal }), [softReveal]);
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
            <Text fontSize={fontSize} textColor={isBackground ? '#777777' : '#9b9b9b'}>{text}</Text>

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
