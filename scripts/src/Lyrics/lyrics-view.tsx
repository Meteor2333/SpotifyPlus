import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, VerticalStackLayout, NativeView, FlatList } from 'spotifyplus/react'
import { TransformedLyrics } from './lyric-utilities'
import { StaticSyncedLyrics, SyllableSyncedLyrics } from '../Types/lyrics-types';
import { SpotifyPlus } from 'spotifyplus';
import SyllableView from '../Entities/syllable';
import { usePlaybackTime } from '../Entities/clock';
import SyllableVocalLine from '../Entities/syllable-vocals';

interface Props {
    lyrics: TransformedLyrics | undefined;
}

const AnimatedBackground = NativeView('AnimatedBackground');

const LyricsView = ({ lyrics }: Props) => {
    const scroller = useRef<FlatList | null>(null);
    const playbackTime = usePlaybackTime();
    const lastActiveIndex = useRef<number | null>(null);

    const getLineRange = (item: SyllableSyncedLyrics['Content'][number]) => {
        if (item.Type !== 'Vocal') {
            return {
                start: item.StartTime,
                end: item.EndTime
            }
        }

        const starts = [
            item.Lead.StartTime,
            ...(item.Background?.map(vocal => vocal.StartTime) ?? [])
        ];

        const ends = [
            item.Lead.EndTime,
            ...(item.Background?.map(vocal => vocal.EndTime) ?? [])
        ];

        return {
            start: Math.min(...starts),
            end: Math.max(...ends)
        };
    };

    useEffect(() => {
        if (lyrics?.Type !== 'Syllable') return;

        const activeIndex = lyrics.Content.findIndex(item => {
            const { start, end } = getLineRange(item);
            return playbackTime >= start && playbackTime <= end;
        });

        if (activeIndex === -1 || activeIndex === lastActiveIndex.current) return;

        lastActiveIndex.current = activeIndex;

        scroller.current?.scrollToIndex({
            index: activeIndex,
            animated: true,
            viewPosition: 0.35
        });
    }, [lyrics, playbackTime]);

    if (lyrics?.Type === 'Line') {
        return (
            <ScrollView style={{ flex: 1 }}>
                {(lyrics as unknown as StaticSyncedLyrics).Lines.map((line, index) => (
                    <Text key={index}>{line.Text}</Text>
                ))}
            </ScrollView>
        )
    }

    if (lyrics?.Type === 'Syllable') {
        return (
            <View style={{ flex: 1, position: 'relative' }}>
                <AnimatedBackground style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, elevation: 0 }} />

                <FlatList style={{ flex: 1, elevation: 10, backgroundColor: '#00000088' }} ref={scroller} data={lyrics.Content} renderItem={({ item, index }) => {
                    if (item.Type === 'Vocal') {
                        return (
                            <View style={{ flex: 1, flexDirection: 'column' }}>
                                <SyllableVocalLine key={index} metadata={item} style={{ paddingVertical: 2 }} />
                            </View>
                        )
                    }
                }} />
            </View>
        )
    }
}

export default LyricsView
