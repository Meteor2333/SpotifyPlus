import React, { useMemo } from "react";
import { ColorValue, ScriptView, ScriptViewNode, View } from "spotifyplus/react";

type Props = {
    text: string;
    fontSize: number;
    width: number;
    height: number;
    colors?: ColorValue[];
    locations?: number[];
    opacity?: number;
};

export default function TextGradientOverlay({
    text,
    fontSize,
    width,
    height,
    colors = ["#ffffff00", "#d7fbffff", "#d7ccffff", "#ffffff00"],
    locations = [0, 0.35, 0.65, 1],
    opacity = 0.45
}: Props) {
    const nodes = useMemo<ScriptViewNode[]>(() => [
        {
            id: "gradient-text",
            type: "text",
            text,
            x: 0,
            y: 0,
            width: `${Math.max(1, width)}px`,
            height: `${Math.max(1, height)}px`,
            fontSize,
            maxLines: 1,
            alpha: opacity,
            includeFontPadding: true,
            fill: {
                type: "linear",
                colors,
                positions: locations,
                startX: "0px",
                startY: "0px",
                endX: `${Math.max(1, width)}px`,
                endY: "0px"
            }
        }
    ], [text, fontSize, width, height, colors, locations, opacity]);

    return (
        <View style={{ position: "absolute", left: 0, top: 0, width, height }}>
            <ScriptView pointerEvents="none" style={{ width, height }} nodes={nodes} />
        </View>
    );
}