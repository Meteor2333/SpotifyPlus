import React from "react";
import App from "./app";
import { SpotifyPlus } from "./script-api";

SpotifyPlus.Surfaces.register('lyrics-view', (surface: any) => {
    return <App />;
})