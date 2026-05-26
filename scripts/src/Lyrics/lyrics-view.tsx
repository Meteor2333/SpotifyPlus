import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, VerticalStackLayout, NativeView } from 'spotifyplus/react'
import { TransformedLyrics } from './lyric-utilities'
import { StaticSyncedLyrics, SyllableSyncedLyrics } from '../Types/lyrics-types';
import { SpotifyPlus } from 'spotifyplus';
import SyllableView from '../Entities/syllable';
import { usePlaybackTime } from '../Entities/clock';
import SyllableVocalLine from '../Entities/syllable-vocals';

interface Props {
    lyrics: TransformedLyrics | undefined;
}

const LyricView = NativeView('LyricView');

const LyricsView = ({ lyrics }: Props) => {

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
            <ScrollView style={{ flex: 1, backgroundColor: '#313131' }}>
                <VerticalStackLayout style={{ flex: 1 }}>
                    {lyrics.Content.map((line, index) => {
                        if (line.Type === 'Vocal') {
                            return <SyllableVocalLine key={index} metadata={line} style={{ paddingVertical: 2 }} />
                        }
                    })}
                </VerticalStackLayout>
            </ScrollView>
        )
    }
}

export default LyricsView