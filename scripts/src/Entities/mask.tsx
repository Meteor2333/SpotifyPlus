import React, { useMemo, useState } from 'react'
import { ScriptView, ScriptViewNode, ScriptViewSizeEvent, View, ViewProps } from 'spotifyplus/react'

type MaskedViewProps = ViewProps & {
    maskText: string;
    fontSize: number;
    colors: string[];
    locations?: number[];
};

export default function MaskedGradientText({ maskText, fontSize, colors, locations, style, ...rest }: MaskedViewProps & { maskText: string; fontSize: number; colors: string[]; locations?: number[] }) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    const nodes = useMemo<ScriptViewNode[]>(() => {
        if (size.width <= 0 || size.height <= 0) return [];

        return [
            {
                id: 'masked-gradient-text',
                type: 'mask',
                width: '100%',
                height: '100%',
                maskMode: 'dstIn',
                content: [
                    {
                        id: 'gradient',
                        type: 'rect',
                        width: '100%',
                        height: '100%',
                        fill: {
                            type: 'linear',
                            colors,
                            positions: locations,
                            startX: '0px',
                            startY: `${size.height / 2}px`,
                            endX: `${size.width}px`,
                            endY: `${size.height / 2}px`
                        }
                    }
                ],
                mask: [
                    {
                        id: 'text-mask',
                        type: 'text',
                        x: 0,
                        y: 0,
                        width: '100%',
                        height: '100%',
                        text: maskText,
                        fontSize,
                        color: '#ffffffff'
                    }
                ]
            }
        ];
    }, [maskText, fontSize, colors, locations, size.width, size.height]);

    const onSizeChange = (event: ScriptViewSizeEvent) => {
        if (event.width !== size.width || event.height !== size.height) {
            setSize({ width: event.width, height: event.height });
        }
    };

    return (
        <View {...rest} style={style}>
            <ScriptView pointerEvents="none" style={{ width: '100%', height: '100%' }} nodes={nodes} onSizeChange={onSizeChange} />
        </View>
    );
}