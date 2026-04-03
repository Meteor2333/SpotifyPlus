import React from "react";
import App from "./test-overlay";

//@ts-expect-error
SpotifyPlus.Surfaces.register('lyrics-view', (surface: any) => {
    return <App />;
});