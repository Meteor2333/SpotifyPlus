import React, { useMemo } from "react";
import { ColorValue, ScriptView, ScriptViewNode, View } from "spotifyplus/react";

type GradientTextProps = {
    text: string;
    fontSize: number;
    width: number;
    height: number;
    colors: ColorValue[];
    locations?: number[];
};

export default function GradientText({ text, fontSize, width, height, colors, locations }: GradientTextProps) {
    const nodes = useMemo<ScriptViewNode[]>(() => {
        return [
            {
                id: "text",
                type: "text",
                text,
                x: 0,
                y: 0,
                width: `${width}px`,
                height: `${height}px`,
                fontSize,
                maxLines: 1,
                includeFontPadding: true,
                fill: {
                    type: "linear",
                    colors,
                    positions: locations,
                    startX: "0px",
                    startY: "0px",
                    endX: `${width}px`,
                    endY: "0px"
                }
            }
        ];
    }, [text, fontSize, width, height, colors, locations]);

    return (
        <View style={{ width, height }}>
            <ScriptView pointerEvents="none" style={{ width, height }} nodes={nodes} />
        </View>
    );
}