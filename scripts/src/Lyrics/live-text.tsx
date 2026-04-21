import React, { useEffect, useState } from "react";
import { Text } from "spotifyplus/react";

type Props = {
    text: string;
    initialStyle?: any;
    textColor?: string;
    bindSetStyle?: (setter: (style: any) => void) => void;
};

const LiveText = ({ text, initialStyle, textColor, bindSetStyle }: Props) => {
    const [style, setStyle] = useState(initialStyle ?? {});

    useEffect(() => {
        bindSetStyle?.((nextStyle) => {
            setStyle((prev: any) => ({ ...prev, ...nextStyle }));
        });
    }, [bindSetStyle]);

    return <Text textColor={textColor} style={style}>{text}</Text>;
};

export default LiveText;