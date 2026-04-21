import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'spotifyplus/react'
import { SpotifyTrack } from 'spotifyplus/entities';
import { SpotifyPlus } from 'spotifyplus';
import fetch from 'node-fetch';
import { TransformedLyrics, transformLyrics } from './Lyrics/lyric-utilities';
import { SyncedVocals } from './Types/animation-types';
import LyricsView from './Lyrics/lyrics-view';

const App = () => {
    const [lyrics, setLyrics] = useState<TransformedLyrics>();

    useEffect(() => {
        const getLyrics = async () => {
            const spicyVersion: string = '5.22.3'
            const track: SpotifyTrack | null = await SpotifyPlus.Player.getCurrentTrack();
            if (!track) {
                SpotifyPlus.error('Failed to get current track');
                return;
            }

            const response = await fetch('https://api.spicylyrics.org/query', {
                method: 'POST',
                headers: {
                    'Spicylyrics-Webauth': `Bearer ${SpotifyPlus.Platform.Session.accessToken}`,
                    'Spicylyrics-Version': spicyVersion,
                    'Origin': 'https://xpui.app.spotify.com',
                    'Referer': 'https://xpui.app.spotify.com/',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.97 Spotify/1.2.86.502 Safari/537.36',
                    'Sec-Ch-Ua': '"Not(A:Brand";v="8", "Chromium";v="144"',
                    'Sec-Fetch-Dest': 'empty'
                },
                body: JSON.stringify({
                    queries: [
                        {
                            operation: 'lyrics',
                            variables: {
                                id: track.id,
                                auth: 'SpicyLyrics-WebAuth'
                            }
                        }
                    ],
                    client: {
                        version: spicyVersion
                    }
                })
            });

            const json = await response.json() as any;

            if (!response.ok) {
                SpotifyPlus.log('Failed to get lyrics :(');
                return;
            }

            const transformed = transformLyrics(json.queries[1]?.result?.data);
            setLyrics(transformed);
        };

        getLyrics();
    }, []);

    return <LyricsView lyrics={lyrics} />

    // return (
    //     <ScrollView style={{ flex: 1, backgroundColor: '#313131' }}>
    //         {!lyrics ? (
    //             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
    //                 <Text textColor={'#FFFFFF'}>Loading lyrics...</Text>
    //             </View>
    //         ) : lyrics.Type === 'Static' ? (
    //             <View style={{ padding: 16 }}>
    //                 {lyrics.Lines.map((line, index) => (
    //                     <Text key={`static-${index}`} textColor={'#FFFFFF'} style={{ fontSize: 24, marginBottom: 12 }}>{line}</Text>
    //                 ))}
    //             </View>
    //         ) : (
    //             <View style={{ padding: 16 }}>
    //                 {lyrics.Content.map((group, index) => (
    //                     <LyricsView
    //                         key={index}
    //                         group={group}
    //                         registerRuntime={(runtime) => registerRuntime(index, runtime)}
    //                     />
    //                 ))}
    //             </View>
    //         )}
    //     </ScrollView>
    // );
}

export default App;