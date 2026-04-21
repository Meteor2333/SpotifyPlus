import React, { useMemo } from 'react'
import { View, Text, HorizontalStackLayout, CommonViewProps } from 'spotifyplus/react'
import { SyllableVocalSet } from '../Types/lyrics-types'
import SyllableView from './syllable';
import { usePlaybackTime } from './clock';

interface Props extends CommonViewProps {
    metadata: SyllableVocalSet;
}

const SyllableVocalLine = ({ metadata }: Props) => {
    const currentTime = usePlaybackTime();
    const startTime = metadata.Lead.StartTime;
    const relativeTime = currentTime - startTime;
    const timeScale = Math.max(0, Math.min(relativeTime - metadata.Lead.Syllables[metadata.Lead.Syllables.length - 1].EndTime));

    const leadSyllables = useMemo(() => {
        return metadata.Lead.Syllables.map((syllable) => {
            const relativeStart = syllable.StartTime - startTime;
            const relativeEnd = syllable.EndTime - startTime;
            const duration = relativeEnd - relativeStart;
            const startScale = relativeStart / duration;

            return ({
                syllable,
                relativeStart,
                relativeEnd,
                duration,
                startScale,
                durationScale: (relativeEnd / duration) - startScale
            });
        });
    }, [metadata, startTime]);

    const backgroundSyllables = useMemo(() => {
        if (!metadata.Background) return null;

        return metadata.Background[0].Syllables.map((syllable) => {
            const relativeStart = syllable.StartTime - startTime;
            const relativeEnd = syllable.EndTime - startTime;
            const duration = relativeEnd - relativeStart;
            const startScale = relativeStart / duration;

            return ({
                syllable,
                relativeStart,
                relativeEnd,
                duration,
                startScale,
                durationScale: (relativeEnd / duration) - startScale
            });
        });
    }, [metadata, startTime]);

    return (
        <View style={{ flex: 1 }}>
            <HorizontalStackLayout style={{ flex: 1, flexWrap: 'wrap' }}>
                {leadSyllables.map(({ syllable, relativeStart, relativeEnd, duration, startScale, durationScale }, index) => (
                    <SyllableView key={index} syllable={syllable} relativeTime={relativeTime} timeScale={timeScale} relativeStart={relativeStart} relativeEnd={relativeEnd} duration={duration} startScale={startScale} durationScale={durationScale} />
                ))}
            </HorizontalStackLayout>

            {backgroundSyllables && (
                <HorizontalStackLayout style={{ flex: 1, flexWrap: 'wrap' }}>
                    {backgroundSyllables.map(({ syllable, relativeStart, relativeEnd, duration, startScale, durationScale }, index) => (
                        <SyllableView key={index} syllable={syllable} relativeTime={relativeTime} timeScale={timeScale} relativeStart={relativeStart} relativeEnd={relativeEnd} duration={duration} startScale={startScale} durationScale={durationScale} isBackground style={{
                            marginRight: syllable.IsPartOfWord ? 0 : 1
                        }} />
                    ))}
                </HorizontalStackLayout>
            )}
        </View>
    )
}

export default SyllableVocalLine