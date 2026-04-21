import React from "react";
import { LetterVisual, LyricState, SyllableVisual, SyncedVocals, TimeValueRange, WordGroupVisual } from "../Types/animation-types";
import { SyllableList, SyllableMetadata } from "../Types/lyrics-types";
import Spring from "./spring";
import Spline from "typescript-cubic-spline";
import { Text, View } from "spotifyplus/react";
import { easeSinOut } from "d3-ease";
import { CallbackEvent } from "../Types/signal";

type AnimatedLetter = {
    start: number;
    duration: number;
    glowDuration: number;
    springs: ReturnType<typeof createSprings>;
};

type AnimatedSyllable = {
    start: number;
    duration: number;
    startScale: number;
    durationScale: number;
    springs: ReturnType<typeof createSprings>;
} & (
        | { type: "syllable"; }
        | { type: "letters"; letters: AnimatedLetter[]; }
    );

const scaleRange = [
    { time: 0, value: 0.95 },
    { time: 0.7, value: 1.025 },
    { time: 1, value: 1 }
];

const yOffsetRange = [
    { time: 0, value: (1 / 100) },
    { time: 0.9, value: -(1 / 60) },
    { time: 1, value: 0 }
];

const glowRange = [
    { time: 0, value: 0 },
    { time: 0.15, value: 1 },
    { time: 0.6, value: 1 },
    { time: 1, value: 0 }
];

const getSpline = (range: TimeValueRange) => {
    const times = range.map(value => value.time);
    const values = range.map(value => value.value);
    return new Spline(times, values);
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));

const scaleSpline = getSpline(scaleRange);
const yOffsetSpline = getSpline(yOffsetRange);
const glowSpline = getSpline(glowRange);

const yOffsetDamping = 0.4;
const yOffsetFrequency = 1.25;
const scaleDamping = 0.6;
const scaleFrequency = 0.7;
const glowDamping = 0.5;
const glowFrequency = 1;

const createSprings = () => ({
    scale: new Spring(0, scaleDamping, scaleFrequency),
    yOffset: new Spring(0, yOffsetDamping, yOffsetFrequency),
    glow: new Spring(0, glowDamping, glowFrequency)
});

const isEmphasized = (metadata: SyllableMetadata, isRomanized: boolean) => (
    ((metadata.EndTime - metadata.StartTime) >= 1) &&
    (((isRomanized && metadata.RomanizedText) || metadata.Text).length <= 12)
);

export default class SyllableVocals implements SyncedVocals {
    private readonly startTime: number;
    private readonly duration: number;
    private readonly syllables: AnimatedSyllable[] = [];
    private readonly groups: WordGroupVisual[] = [];
    private readonly onVisualInvalidated?: () => void;
    private readonly isBackground: boolean;

    private state: LyricState = "idle";
    private isSleeping: boolean = true;

    activityChanged: CallbackEvent<(isActive: boolean) => void> = new CallbackEvent();
    requestedTimeSkip: CallbackEvent<() => void> = new CallbackEvent();

    public constructor(syllablesMetadata: SyllableList, isBackground: boolean, isRomanized: boolean, onVisualInvalidated?: () => void) {
        this.startTime = syllablesMetadata[0].StartTime;
        this.duration = syllablesMetadata[syllablesMetadata.length - 1].EndTime - this.startTime;
        this.onVisualInvalidated = onVisualInvalidated;
        this.isBackground = isBackground;

        const syllableGroups: SyllableList[] = [];
        let currentSyllableGroup: SyllableList = [];

        for (const syllableMetadata of syllablesMetadata) {
            currentSyllableGroup.push(syllableMetadata);

            if (!syllableMetadata.IsPartOfWord) {
                syllableGroups.push(currentSyllableGroup);
                currentSyllableGroup = [];
            }
        }

        if (currentSyllableGroup.length > 0) syllableGroups.push(currentSyllableGroup);

        let groupIndex = 0;
        for (const syllableGroup of syllableGroups) {
            const group: WordGroupVisual = { key: `group-${groupIndex++}`, syllables: [] };
            const syllableCount = syllableGroup.length;
            const isInWordGroup = syllableCount > 1;

            for (const [index, syllableMetadata] of syllableGroup.entries()) {
                const emphasized = isEmphasized(syllableMetadata, isRomanized);
                const text = (isRomanized && syllableMetadata.RomanizedText) || syllableMetadata.Text;

                const relativeStart = syllableMetadata.StartTime - this.startTime;
                const relativeEnd = syllableMetadata.EndTime - this.startTime;
                const startScale = relativeStart / this.duration;
                const endScale = relativeEnd / this.duration;
                const duration = relativeEnd - relativeStart;

                const visual: SyllableVisual = {
                    key: `syllable-${group.key}-${index}`,
                    text,
                    start: relativeStart,
                    duration,
                    startScale,
                    durationScale: endScale - startScale,
                    emphasized,
                    isPartOfWord: syllableMetadata.IsPartOfWord,
                    isStartOfWord: syllableMetadata.IsPartOfWord && index === 0,
                    isEndOfWord: isInWordGroup ? index === syllableCount - 1 : !syllableMetadata.IsPartOfWord,
                    liveText: { id: `live-${group.key}-${index}`, springs: createSprings() }
                };

                if (emphasized) {
                    const chars = [...text];
                    const relativeTimestep = 1 / chars.length;
                    let relativeTimestamp = 0;

                    visual.letters = chars.map((char, letterIndex) => {
                        const letter: LetterVisual = {
                            key: `letter-${visual.key}-${letterIndex}`,
                            text: char,
                            start: relativeTimestamp,
                            duration: relativeTimestep,
                            glowDuration: 1 - relativeTimestamp,
                            liveText: { id: `live-${visual.key}-${letterIndex}`, springs: createSprings() }
                        };

                        relativeTimestamp += relativeTimestep;
                        return letter;
                    });
                }

                group.syllables.push(visual);

                this.syllables.push(
                    visual.letters
                        ? {
                            type: "letters",
                            start: visual.start,
                            duration: visual.duration,
                            startScale: visual.startScale,
                            durationScale: visual.durationScale,
                            springs: visual.liveText.springs,
                            letters: visual.letters.map(letter => ({
                                start: letter.start,
                                duration: letter.duration,
                                glowDuration: letter.glowDuration,
                                springs: letter.liveText.springs
                            }))
                        }
                        : {
                            type: "syllable",
                            start: visual.start,
                            duration: visual.duration,
                            startScale: visual.startScale,
                            durationScale: visual.durationScale,
                            springs: visual.liveText.springs
                        }
                );
            }

            this.groups.push(group);
        }

        this.setToGeneralState(false);
    }

    private updateSpringTargets(springs: ReturnType<typeof createSprings>, timeScale: number, glowTimeScale: number, force?: true) {
        const scale = scaleSpline.at(timeScale);
        const yOffset = yOffsetSpline.at(timeScale);
        const glowAlpha = glowSpline.at(glowTimeScale);

        if (force) {
            springs.scale.Set(scale);
            springs.yOffset.Set(yOffset);
            springs.glow.Set(glowAlpha);
            return;
        }

        springs.scale.Final = scale;
        springs.yOffset.Final = yOffset;
        springs.glow.Final = glowAlpha;
    }

    private updateSpringValues(springs: ReturnType<typeof createSprings>, deltaTime: number): boolean {
        springs.scale.Update(deltaTime);
        springs.yOffset.Update(deltaTime);
        springs.glow.Update(deltaTime);

        return springs.scale.IsSleeping() && springs.yOffset.IsSleeping() && springs.glow.IsSleeping();
    }

    private getTextStyle(springs: ReturnType<typeof createSprings>, isEmphasized: boolean): any {
        const scale = springs.scale.Position;
        const yOffset = springs.yOffset.Position;
        const glowAlpha = springs.glow.Position;

        return {
            transform: [
                { translateY: `${yOffset * (isEmphasized ? 2 : 1)}em` },
                { scale }
            ],
            textShadowRadius: 4 + (2 * glowAlpha * (isEmphasized ? 3 : 1)),
            textShadowOpacity: glowAlpha * (isEmphasized ? 1 : 0.35)
        };
    }

    private setToGeneralState(state: boolean) {
        const timeScale = state ? 1 : 0;

        for (const syllable of this.syllables) {
            this.updateSpringTargets(syllable.springs, timeScale, timeScale, true);

            if (syllable.type === "letters") {
                for (const letter of syllable.letters) {
                    this.updateSpringTargets(letter.springs, timeScale, timeScale, true);
                }
            }
        }

        this.state = state ? "sung" : "idle";
    }

    public animate(songTimestamp: number, deltaTime: number, isImmediate?: true) {
        const relativeTime = songTimestamp - this.startTime;
        const timeScale = clamp((relativeTime / this.duration), 0, 1);

        const pastStart = relativeTime >= 0;
        const beforeEnd = relativeTime <= this.duration;
        const isActive = pastStart && beforeEnd;
        const stateNow: LyricState = isActive ? "active" : pastStart ? "sung" : "idle";
        const stateChanged = stateNow !== this.state;
        const shouldUpdateTargets = stateChanged || isActive || isImmediate;

        if (stateChanged) this.state = stateNow;
        if (shouldUpdateTargets) this.isSleeping = false;

        const isMoving = !this.isSleeping;
        if (!shouldUpdateTargets && !isMoving) return;

        let isSleeping = true;

        for (const syllable of this.syllables) {
            const syllableTimeScale = clamp(((timeScale - syllable.startScale) / syllable.durationScale), 0, 1);

            if (syllable.type === "letters") {
                const timeAlpha = easeSinOut(syllableTimeScale);

                for (const letter of syllable.letters) {
                    const letterTime = timeAlpha - letter.start;
                    const letterTimeScale = clamp((letterTime / letter.duration), 0, 1);
                    const glowTimeScale = clamp((letterTime / letter.glowDuration), 0, 1);

                    if (shouldUpdateTargets) this.updateSpringTargets(letter.springs, letterTimeScale, glowTimeScale, isImmediate);

                    if (isMoving) {
                        const letterSleeping = this.updateSpringValues(letter.springs, deltaTime);
                        if (!letterSleeping) isSleeping = false;
                    }
                }
            }

            if (shouldUpdateTargets) this.updateSpringTargets(syllable.springs, syllableTimeScale, syllableTimeScale, isImmediate);

            if (isMoving) {
                const syllableSleeping = this.updateSpringValues(syllable.springs, deltaTime);
                if (!syllableSleeping) isSleeping = false;
            }
        }

        this.isSleeping = isSleeping;
        this.onVisualInvalidated?.();
    }

    public render() {
        return (
            <View>
                {this.groups.map(group => {
                    const wrapper = group.syllables.length > 1;

                    const content = group.syllables.map(syllable => {
                        if (syllable.letters) {
                            return (
                                <Text key={syllable.key} style={this.getTextStyle(syllable.liveText.springs, false)} textColor={this.isBackground ? "#B3B3B3" : "#FFFFFF"}>
                                    {syllable.letters.map(letter => (
                                        <Text key={letter.key} style={this.getTextStyle(letter.liveText.springs, true)} textColor={this.isBackground ? "#B3B3B3" : "#FFFFFF"}>
                                            {letter.text}
                                        </Text>
                                    ))}
                                </Text>
                            );
                        }

                        return (
                            <Text key={syllable.key} style={this.getTextStyle(syllable.liveText.springs, false)} textColor={this.isBackground ? "#B3B3B3" : "#FFFFFF"}>
                                {syllable.text}
                            </Text>
                        );
                    });

                    if (wrapper) return <Text key={group.key}>{content}</Text>;
                    return <React.Fragment key={group.key}>{content}</React.Fragment>;
                })}
            </View>
        );
    }
}