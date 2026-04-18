import React from 'react';
import App from './app';
import Marketplace from './marketplace';
import YogaTestPage from './test';
import Test from './app';
import AnimatedTestScreen from './AnimatedTestScreen';

console.log('Loading bookmarks!');
const main = async () => {
    //@ts-expect-error
    let bookmarks: string[] = await SpotifyPlus.Platform.Storage.read<string[]>('bookmarkss.json') || [];

    //@ts-expect-error
    new SpotifyPlus.SideDrawer('Marketplace', () => {
        // return <Marketplace SpotifyPlus={SpotifyPlus} />
        return <AnimatedTestScreen />

        // //@ts-expect-error
        // return <App bookmarks={bookmarks} SpotifyPlus={SpotifyPlus} onDeleteTrack={(uri: string) => {
        //     bookmarks = bookmarks.filter(b => b !== uri);
        //     //@ts-expect-error
        //     SpotifyPlus.Platform.Storage.write('bookmarkss.json', bookmarks);
        // }} />;
    }).register();

    //@ts-expect-error
    new SpotifyPlus.ContextMenu('Bookmark this song', (uri: string) => {
        console.log(`Bookmarking song: ${uri}`);
        bookmarks.push(uri);
        //@ts-expect-error
        SpotifyPlus.Platform.Storage.write('bookmarkss.json', bookmarks);
    }).register();
};

main();