import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseVocals, SyncedVocals } from "../Types/animation-types";
import SyllableVocals from "../Entities/syllable-vocal";
import { Pressable, Text, View } from "spotifyplus/react";
import { SpotifyPlus } from "spotifyplus";

export type VocalGroupRuntime<V extends (BaseVocals | SyncedVocals)> = {
    StartTime: number;
    vocals: V[];
};

type Props = {
    group: any;
    registerRuntime: (runtime: VocalGroupRuntime<SyncedVocals>) => void;
};

const LyricsView = ({ group, registerRuntime }: Props) => {
    const [, setVersion] = useState(0);
    const runtimeRef = useRef<VocalGroupRuntime<SyncedVocals> | null>(null);

    const invalidateVisuals = useCallback(() => {
        setVersion(v => v + 1);
    }, []);

    const runtime = useMemo(() => {
        if (group.Type !== "Vocal") return null;

        const vocals: SyncedVocals[] = [];
        let StartTime = group.Lead.StartTime;

        const lead = new SyllableVocals(group.Lead.Syllables, false, false, invalidateVisuals);
        vocals.push(lead);

        if (group.Background) {
            for (const background of group.Background) {
                StartTime = Math.min(StartTime, background.StartTime);
                vocals.push(new SyllableVocals(background.Syllables, true, false, invalidateVisuals));
            }
        }

        return { StartTime, vocals };
    }, [group, invalidateVisuals]);

    useEffect(() => {
        if (!runtime) return;
        runtimeRef.current = runtime;
        registerRuntime(runtime);
    }, [runtime, registerRuntime]);

    if (group.Type !== "Vocal") {
        return (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text textColor={"#AAAAAA"}>{group.Text ?? "♪"}</Text>
            </View>
        );
    }

    return (
        <Pressable onPress={() => {
            if (runtimeRef.current) SpotifyPlus.Player.seek(runtimeRef.current.StartTime);
        }}>
            <View style={{ paddingVertical: 10, alignItems: group.OppositeAligned ? "flex-end" : "flex-start" }}>
                {runtime?.vocals.map((vocal, index) => (
                    <React.Fragment key={`${runtime.StartTime}-${index}`}>
                        {vocal.render()}
                    </React.Fragment>
                ))}
            </View>
        </Pressable>
    );
};

export default LyricsView;