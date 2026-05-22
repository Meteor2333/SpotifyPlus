import React, { useEffect, useMemo } from 'react'
import { View, Text, CommonViewProps, Animated, NativeView, createNativeComponent } from 'spotifyplus/react'
import { SyllableMetadata } from '../Types/lyrics-types'
import { usePlaybackTime } from './clock';
import LinearGradient from './linear-gradient';
import Spring from './spring';

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

const GradientText = NativeView<{
    text: string;
    fontSizee: number;
    startTime: number;
    duration: number;
    startScale: number;
    durationScale: number;
}>('GradientText');

const SyllableView = ({ syllable, relativeTime, timeScale, relativeStart, relativeEnd, duration, startScale, durationScale, isBackground = false, startTime }: Props) => {
    const isActive = relativeTime >= relativeStart && relativeTime < relativeEnd;
    const isPast = relativeTime >= relativeEnd;

    const timeScaleThing = Math.max(0, Math.min(relativeTime / duration));
    const syllableTimeScale = Math.max(0, Math.min((timeScaleThing - startScale) / durationScale, 1));
    const text = `${syllable.Text}${syllable.IsPartOfWord ? '' : ' '}`;
    const fontSize = isBackground ? 18 : 36;

    const progress = Animated.usePlaybackValue({
        inputRange: [syllable.StartTime * 1000, syllable.EndTime * 1000],
        outputRange: [0, 1],
        unit: 'ms',
        extrapolate: 'clamp'
    });

    // const scale = Animated.interpolate(progress, [0, 0.7, 1], [1, 1.5, 1]);
    // const yOffset = Animated.interpolate(progress, [0, 0.9, 1], [fontSize / 100, -fontSize / 10, 0]);
    const scale = Animated.interpolate(progress, [0, 0.3, 1], [1, 1.03, 1]);
    const yOffset = Animated.interpolate(progress, [0, 0.3, 1], [0, -fontSize / 60, 0]);
    const glow = Animated.interpolate(progress, [0, 0.15, 0.6, 1], [0, 1, 1, 0]);

    // useEffect(() => {
    //     if (isActive) {
    //         scale.value = Animated.withSpring(1.03, { damping: 10, stiffness: 140, mass: 1 });
    //         yOffset.value = Animated.withSpring(-fontSize / 60, { damping: 12, stiffness: 120, mass: 1 });
    //     } else {
    //         scale.value = Animated.withSpring(1, { damping: 16, stiffness: 120, mass: 1 });
    //         yOffset.value = Animated.withSpring(0, { damping: 14, stiffness: 100, mass: 1 });
    //     }
    // }, [isActive]);

    return (
        <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <GradientText text={text} fontSizee={fontSize} startTime={startTime} duration={duration} startScale={startScale} durationScale={durationScale} />
        </View>
    )

    // return (
    //     <Animated.View style={{ position: 'relative', alignSelf: 'flex-start', transform: [{ translateY: yOffset, scale: scale }] }}>
    //         <GradientText progress={syllableTimeScale} text={text} fontSize={fontSize} />

    //         <Animated.View style={{
    //             position: 'absolute',
    //             left: 0,
    //             top: 0,
    //             bottom: 0,
    //             width: '100%',
    //             overflow: 'hidden',
    //             clipRight: progress
    //         }}>
    //             <Text fontSize={fontSize} textColor={'#ffffff'}>{text}</Text>
    //         </Animated.View>
    //     </Animated.View>
    // )
}

export default SyllableView