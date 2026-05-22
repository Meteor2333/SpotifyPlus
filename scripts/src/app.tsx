import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NativeView, ScrollView, Text, View } from 'spotifyplus/react'
import { SpotifyTrack } from 'spotifyplus/entities';
import { SpotifyPlus } from 'spotifyplus';
import fetch from 'node-fetch';
import { TransformedLyrics, transformLyrics } from './Lyrics/lyric-utilities';
import { SyncedVocals } from './Types/animation-types';
import LyricsView from './Lyrics/lyrics-view';

const App = () => {
    const [lyrics, setLyrics] = useState<TransformedLyrics>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();

    useEffect(() => {
        const getLyrics = async () => {
            try {
                setLoading(false);
                setError(undefined);

                const spicyVersion: string = '5.22.3'
                SpotifyPlus.log(`Current Version: ${spicyVersion}`);

                const track: SpotifyTrack = SpotifyPlus.Player.getCurrentTrack();
                if (!track) {
                    SpotifyPlus.error('Failed to get current track');
                    setError('Failed to get current track');
                    setLoading(false);
                    return;
                }

                SpotifyPlus.log(`Current Track: ${track.title} by ${track.artist}`);
                SpotifyPlus.log(`Current Track ID: ${track.id}`);

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
                        'Sec-Fetch-Dest': 'empty',
                        'Priority': 'u=1, i',
                        'Accept-Language': 'en-Latn-US,en-US;q=0.9,en-Latn;q=0.8,en;q=0.7',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"'
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
                    setError('Failed to get lyrics');
                    SpotifyPlus.log('Failed to get lyrics :(');
                    return;
                }

                console.log(json.queries[1]?.result);
                console.log(json.queries[1]?.result?.data);

                const transformed = transformLyrics(json.queries[1]?.result?.data);
                setLyrics(transformed);
            } catch (e) {
                setError(`An error occurred while fetching lyrics | ${(e as Error).message}`);
                SpotifyPlus.error('An error occurred while fetching lyrics', e);
            } finally {
                setLoading(false);
            }
        };

        getLyrics();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#313131' }}>
                <Text style={{ color: '#ffffff', fontSize: 18 }}>Loading lyrics...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#313131' }}>
                <Text style={{ color: '#ffffff', fontSize: 18 }}>{error}</Text>
            </View>
        );
    }

    return <LyricsView lyrics={lyrics} />
}

export default App;