import React, { useMemo } from 'react'
import { View, Text, CommonViewProps } from 'spotifyplus/react'
import { SyllableMetadata } from '../Types/lyrics-types'
import TextGradientOverlay from './gradient-overlay';

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
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(value, max));

const SyllableView = ({ syllable, relativeTime, relativeStart, relativeEnd, duration, startScale, durationScale, isBackground = false }: Props) => {
    const isActive = relativeTime >= relativeStart && relativeTime < relativeEnd;
    const isPast = relativeTime >= relativeEnd;

    const timeScaleThing = clamp(relativeTime / duration);
    const syllableTimeScale = clamp((timeScaleThing - startScale) / durationScale);

    const text = `${syllable.Text}${syllable.IsPartOfWord ? '' : ' '}`;
    const fontSize = isBackground ? 12 : 24;

    const textWidth = useMemo(() => Math.max(1, text.length * fontSize * 0.58), [text, fontSize]);
    const textHeight = fontSize * 1.35;
    const revealWidth = isPast ? textWidth : isActive ? syllableTimeScale * textWidth : 0;

    return (
        <View style={{ position: 'relative', alignSelf: 'flex-start', width: textWidth, height: textHeight }}>
            <Text fontSize={fontSize} textColor="#9b9b9b" style={{ position: 'absolute', left: 0, top: 0, width: textWidth, height: textHeight }}>
                {text}
            </Text>

            <View style={{ position: 'absolute', left: 0, top: 0, width: revealWidth, height: textHeight, overflow: 'hidden' }}>
                <View style={{ position: 'relative', width: textWidth, height: textHeight }}>
                    <Text fontSize={fontSize} textColor="#ffffff" style={{ position: 'absolute', left: 0, top: 0, width: textWidth, height: textHeight }}>
                        {text}
                    </Text>

                    <TextGradientOverlay text={text} fontSize={fontSize} width={textWidth} height={textHeight} />
                </View>
            </View>
        </View>
    )
}

export default SyllableView