import { useMemo, useState } from "react";
import { ColorValue, ScriptView, ScriptViewLength, ScriptViewNode, ScriptViewSizeEvent, StyleSheet, View, ViewProps } from "spotifyplus/react";

type Point = { x: number; y: number };

type LinearGradientProps = Omit<ViewProps, 'backgroundColor'> & {
    colors: ColorValue[];
    locations?: number[];
    startPoint?: Point;
    endPoint?: Point;
    useAngle?: boolean;
    angle?: number;
    angleCenter?: Point;
    borderRadius?: ScriptViewLength;
    children?: React.ReactNode;
};

function getStartCornerToIntersect(angle: number, width: number, height: number): Point {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (angle < 90) return { x: -halfWidth, y: -halfHeight };
    if (angle < 180) return { x: halfWidth, y: -halfHeight };
    if (angle < 270) return { x: halfWidth, y: halfHeight };
    return { x: -halfWidth, y: halfHeight };
}

function getHorizontalOrVerticalStartPoint(angle: number, width: number, height: number): Point {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (angle === 0) return { x: -halfWidth, y: 0 };
    if (angle === 90) return { x: 0, y: -halfHeight };
    if (angle === 180) return { x: halfWidth, y: 0 };
    return { x: 0, y: halfHeight };
}

function getGradientStartPoint(angle: number, width: number, height: number): Point {
    angle = angle % 360;
    if (angle < 0) angle += 360;

    if (angle % 90 === 0) return getHorizontalOrVerticalStartPoint(angle, width, height);

    const slope = Math.tan((angle * Math.PI) / 180);
    const perpendicularSlope = -1 / slope;
    const startCorner = getStartCornerToIntersect(angle, width, height);
    const b = startCorner.y - perpendicularSlope * startCorner.x;
    const startX = b / (slope - perpendicularSlope);
    const startY = slope * startX;

    return { x: startX, y: startY };
}

function buildGradientPoints(width: number, height: number, start: Point, end: Point, useAngle: boolean, angle: number, angleCenter: Point) {
    if (!useAngle) {
        return {
            startX: `${start.x * width}px`,
            startY: `${start.y * height}px`,
            endX: `${end.x * width}px`,
            endY: `${end.y * height}px`
        };
    }

    const cartesianAngle = 90 - angle;
    const relativeStartPoint = getGradientStartPoint(cartesianAngle, width, height);

    const centerX = angleCenter.x * width;
    const centerY = angleCenter.y * height;

    const startX = centerX + relativeStartPoint.x;
    const startY = centerY - relativeStartPoint.y;
    const endX = centerX - relativeStartPoint.x;
    const endY = centerY + relativeStartPoint.y;

    return {
        startX: `${startX}px`,
        startY: `${startY}px`,
        endX: `${endX}px`,
        endY: `${endY}px`
    }
}

export default function LinearGradient({
    colors,
    locations,
    startPoint: start = { x: 0, y: 0 },
    endPoint: end = { x: 0, y: 1 },
    useAngle = false,
    angle = 45,
    angleCenter = { x: 0.5, y: 0.5 },
    borderRadius = 0,
    style,
    children,
    ...rest
}: LinearGradientProps) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    const nodes = useMemo<ScriptViewNode[]>(() => {
        if (!colors || colors.length < 2) return [];
        if (useAngle && (size.width <= 0 || size.height <= 0)) return [];

        const points = buildGradientPoints(
            Math.max(1, size.width),
            Math.max(1, size.height),
            start,
            end,
            useAngle,
            angle,
            angleCenter
        );

        return [
            {
                id: 'gradient',
                type: borderRadius ? 'roundRect' : 'rect',
                width: '100%',
                height: '100%',
                borderRadius,
                fill: {
                    type: 'linear',
                    colors,
                    positions: locations,
                    startX: points.startX,
                    startY: points.startY,
                    endX: points.endX,
                    endY: points.endY
                }
            }
        ];
    }, [colors, locations, start, end, useAngle, angle, angleCenter, borderRadius, size.width, size.height]);

    const handleSizeChange = (event: ScriptViewSizeEvent) => {
        if (event.width !== size.width || event.height !== size.height) {
            setSize({ width: event.width, height: event.height });
        }
    };

    return (
        <View {...rest} style={style}>
            <ScriptView pointerEvents='none' style={StyleSheet.absoluteFillObject} nodes={nodes} onSizeChange={handleSizeChange} />
            {children}
        </View>
    )
}