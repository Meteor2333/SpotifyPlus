import { SpotifyPlus } from "spotifyplus";
import App from "./app";

SpotifyPlus.Surfaces.register('lyrics-view', (surface: any) => {
    return <App />
});