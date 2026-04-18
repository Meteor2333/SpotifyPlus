import React from "react";
import AnimatedCore, {
    createAnimatedComponent,
    type AnimatedNodeLike,
} from "./animated";

export type LayoutSize =
    | number
    | `${number}dp`
    | `${number}px`
    | `${number}sp`
    | `${number}%`
    | "auto"
    | "match_parent"
    | "match"
    | "fill_parent"
    | "fill"
    | "wrap_content"
    | "wrap";
export type SizeValue =
    | number
    | `${number}dp`
    | `${number}px`
    | `${number}sp`
    | `${number}%`
    | "auto";
export type ColorValue = string | number;
export type VisibilityValue = "visible" | "invisible" | "gone";
export type DisplayValue = "flex" | "none";
export type FlexDirectionValue =
    | "row"
    | "column"
    | "row-reverse"
    | "column-reverse";
export type JustifyContentValue =
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
export type AlignItemsValue =
    | "stretch"
    | "flex-start"
    | "center"
    | "flex-end"
    | "baseline"
    | "space-between"
    | "space-around";
export type AlignSelfValue =
    | "auto"
    | "stretch"
    | "flex-start"
    | "center"
    | "flex-end"
    | "baseline";
export type FlexWrapValue = "nowrap" | "wrap" | "wrap-reverse";
export type OverflowValue = "visible" | "hidden" | "scroll";
export type DirectionValue = "inherit" | "ltr" | "rtl";
export type FontWeightValue =
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900;
export type FontStyleValue = "normal" | "italic";
export type TextAlignValue = "auto" | "left" | "center" | "right";
export type EllipsizeModeValue = "head" | "middle" | "tail" | "clip";
export type ResizeModeValue = "cover" | "contain" | "stretch" | "center";
export type KeyboardTypeValue =
    | "default"
    | "email-address"
    | "numeric"
    | "decimal-pad"
    | "phone-pad";
export type ReturnKeyTypeValue = "done" | "go" | "next" | "search" | "send";
export type OrientationValue = "horizontal" | "vertical";
export type GravityValue =
    | "center"
    | "center_horizontal"
    | "center_vertical"
    | "start"
    | "end"
    | "left"
    | "right"
    | "top"
    | "bottom"
    | `${string}|${string}`;
export type ShowDividersValue =
    | "none"
    | "beginning"
    | "middle"
    | "end"
    | `${string}|${string}`;
export type OverScrollModeValue = "always" | "ifContentScrolls" | "never";
export type ScaleTypeValue =
    | "centerCrop"
    | "center_crop"
    | "fitCenter"
    | "fit_center"
    | "fitXY"
    | "fit_xy"
    | "center"
    | "centerInside"
    | "center_inside"
    | "fitStart"
    | "fit_start"
    | "fitEnd"
    | "fit_end"
    | "matrix";
export type NativeNodeId = number;
export type ImageSource = string | { uri: string };
export type StyleProp<T> =
    | T
    | null
    | undefined
    | false
    | ReadonlyArray<StyleProp<T>>;
export type AnimatedStyleValue<T> = T | AnimatedNodeLike;

type ReactChildren = React.ReactNode;
type HostProps = Record<string, unknown>;

export interface PressEvent {
    targetId: number;
    x: number;
    y: number;
}
export interface FocusEvent {
    targetId: number;
    hasFocus: boolean;
}
export interface ScrollEvent {
    targetId: number;
    x: number;
    y: number;
    oldX: number;
    oldY: number;
}
export interface SubmitEditingEvent {
    targetId: number;
    text: string;
    actionId: number;
}

export interface LayoutStyle {
    width?: LayoutSize;
    height?: LayoutSize;
    minWidth?: LayoutSize;
    minHeight?: LayoutSize;
    maxWidth?: LayoutSize;
    maxHeight?: LayoutSize;
    margin?: SizeValue;
    marginHorizontal?: SizeValue;
    marginVertical?: SizeValue;
    marginLeft?: SizeValue;
    marginRight?: SizeValue;
    marginTop?: SizeValue;
    marginBottom?: SizeValue;
    marginStart?: SizeValue;
    marginEnd?: SizeValue;
    padding?: SizeValue;
    paddingHorizontal?: SizeValue;
    paddingVertical?: SizeValue;
    paddingLeft?: SizeValue;
    paddingRight?: SizeValue;
    paddingTop?: SizeValue;
    paddingBottom?: SizeValue;
    paddingStart?: SizeValue;
    paddingEnd?: SizeValue;
    position?: "relative" | "absolute" | "static";
    top?: SizeValue;
    bottom?: SizeValue;
    left?: SizeValue;
    right?: SizeValue;
    start?: SizeValue;
    end?: SizeValue;
    display?: DisplayValue;
    flex?: number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: LayoutSize;
    flexDirection?: FlexDirectionValue;
    justifyContent?: JustifyContentValue;
    alignItems?: AlignItemsValue;
    alignSelf?: AlignSelfValue;
    flexWrap?: FlexWrapValue;
    overflow?: OverflowValue;
    direction?: DirectionValue;
    aspectRatio?: number;
    gap?: SizeValue;
    rowGap?: SizeValue;
    columnGap?: SizeValue;
}

export interface TransformStyle {
    opacity?: AnimatedStyleValue<number>;
    backgroundColor?: ColorValue;
    borderRadius?: SizeValue;
    borderTopLeftRadius?: SizeValue;
    borderTopRightRadius?: SizeValue;
    borderBottomLeftRadius?: SizeValue;
    borderBottomRightRadius?: SizeValue;
    borderWidth?: SizeValue;
    borderLeftWidth?: SizeValue;
    borderTopWidth?: SizeValue;
    borderRightWidth?: SizeValue;
    borderBottomWidth?: SizeValue;
    borderStartWidth?: SizeValue;
    borderEndWidth?: SizeValue;
    borderColor?: ColorValue;
    transform?: ReadonlyArray<{
        translateX?: AnimatedStyleValue<SizeValue>;
        translateY?: AnimatedStyleValue<SizeValue>;
        translateZ?: AnimatedStyleValue<SizeValue>;
        scale?: AnimatedStyleValue<number>;
        scaleX?: AnimatedStyleValue<number>;
        scaleY?: AnimatedStyleValue<number>;
        rotate?: AnimatedStyleValue<string | number>;
        rotateX?: AnimatedStyleValue<string | number>;
        rotateY?: AnimatedStyleValue<string | number>;
        rotation?: AnimatedStyleValue<string | number>;
    }>;
    elevation?: AnimatedStyleValue<SizeValue>;
    scaleX?: AnimatedStyleValue<number>;
    scaleY?: AnimatedStyleValue<number>;
    rotation?: AnimatedStyleValue<number>;
    rotationX?: AnimatedStyleValue<number>;
    rotationY?: AnimatedStyleValue<number>;
    translateX?: AnimatedStyleValue<SizeValue>;
    translateY?: AnimatedStyleValue<SizeValue>;
    translateZ?: AnimatedStyleValue<SizeValue>;
    clipToOutline?: boolean;
}

export interface TextStyle extends LayoutStyle, TransformStyle {
    color?: ColorValue;
    fontSize?: number;
    fontWeight?: FontWeightValue;
    fontStyle?: FontStyleValue;
    textAlign?: TextAlignValue;
    lineHeight?: number;
    letterSpacing?: number;
    includeFontPadding?: boolean;
    textTransform?: "none" | "uppercase";
}

export interface ViewStyle extends LayoutStyle, TransformStyle { }

export interface RelativeLayoutRuleProps {
    alignParentTop?: boolean;
    alignParentBottom?: boolean;
    alignParentStart?: boolean;
    alignParentEnd?: boolean;
    centerInParent?: boolean;
    centerHorizontal?: boolean;
    centerVertical?: boolean;
    above?: NativeNodeId;
    below?: NativeNodeId;
    toStartOf?: NativeNodeId;
    toEndOf?: NativeNodeId;
    alignStart?: NativeNodeId;
    alignEnd?: NativeNodeId;
    alignTop?: NativeNodeId;
    alignBottom?: NativeNodeId;
}

export interface CommonViewProps extends RelativeLayoutRuleProps {
    children?: ReactChildren;
    style?: StyleProp<ViewStyle | TextStyle>;
    width?: LayoutSize;
    height?: LayoutSize;
    minWidth?: LayoutSize;
    minHeight?: LayoutSize;
    maxWidth?: LayoutSize;
    maxHeight?: LayoutSize;
    visible?: boolean;
    visibility?: VisibilityValue;
    display?: DisplayValue;
    disabled?: boolean;
    enabled?: boolean;
    pointerEvents?: "none" | "auto" | "box-none" | "box-only";
    clickable?: boolean;
    longClickable?: boolean;
    focusable?: boolean;
    focusableInTouchMode?: boolean;
    selected?: boolean;
    activated?: boolean;
    duplicateParentStateEnabled?: boolean;
    hapticFeedbackEnabled?: boolean;
    soundEffectsEnabled?: boolean;
    opacity?: AnimatedStyleValue<number>;
    backgroundColor?: ColorValue;
    borderRadius?: SizeValue;
    borderTopLeftRadius?: SizeValue;
    borderTopRightRadius?: SizeValue;
    borderBottomLeftRadius?: SizeValue;
    borderBottomRightRadius?: SizeValue;
    borderWidth?: SizeValue;
    borderLeftWidth?: SizeValue;
    borderTopWidth?: SizeValue;
    borderRightWidth?: SizeValue;
    borderBottomWidth?: SizeValue;
    borderStartWidth?: SizeValue;
    borderEndWidth?: SizeValue;
    borderColor?: ColorValue;
    transform?: TransformStyle["transform"];
    clipToOutline?: boolean;
    elevation?: AnimatedStyleValue<SizeValue>;
    rotation?: AnimatedStyleValue<number>;
    rotationX?: AnimatedStyleValue<number>;
    rotationY?: AnimatedStyleValue<number>;
    scaleX?: AnimatedStyleValue<number>;
    scaleY?: AnimatedStyleValue<number>;
    translateX?: AnimatedStyleValue<SizeValue>;
    translateY?: AnimatedStyleValue<SizeValue>;
    translateZ?: AnimatedStyleValue<SizeValue>;
    accessibilityLabel?: string;
    contentDescription?: string;
    testID?: string;
    nativeID?: string;
    tag?: string | number | boolean;
    keepScreenOn?: boolean;
    fitsSystemWindows?: boolean;
    clipChildren?: boolean;
    clipToPadding?: boolean;
    margin?: SizeValue;
    marginHorizontal?: SizeValue;
    marginVertical?: SizeValue;
    marginLeft?: SizeValue;
    marginRight?: SizeValue;
    marginTop?: SizeValue;
    marginBottom?: SizeValue;
    marginStart?: SizeValue;
    marginEnd?: SizeValue;
    padding?: SizeValue;
    paddingHorizontal?: SizeValue;
    paddingVertical?: SizeValue;
    paddingLeft?: SizeValue;
    paddingRight?: SizeValue;
    paddingTop?: SizeValue;
    paddingBottom?: SizeValue;
    paddingStart?: SizeValue;
    paddingEnd?: SizeValue;
    flex?: number;
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: LayoutSize;
    flexDirection?: FlexDirectionValue;
    justifyContent?: JustifyContentValue;
    alignItems?: AlignItemsValue;
    alignSelf?: AlignSelfValue;
    flexWrap?: FlexWrapValue;
    overflow?: OverflowValue;
    direction?: DirectionValue;
    aspectRatio?: number;
    gap?: SizeValue;
    rowGap?: SizeValue;
    columnGap?: SizeValue;
    position?: "relative" | "absolute" | "static";
    top?: SizeValue;
    bottom?: SizeValue;
    left?: SizeValue;
    right?: SizeValue;
    start?: SizeValue;
    end?: SizeValue;
    layoutWeight?: number;
    orientation?: OrientationValue;
    gravity?: GravityValue;
    layoutGravity?: GravityValue;
    weightSum?: number;
    showDividers?: ShowDividersValue;
    dividerPadding?: SizeValue;
    baselineAligned?: boolean;
    onClick?: (event: PressEvent) => void;
    onLongClick?: (event: PressEvent) => void;
    onPress?: (event: PressEvent) => void;
    onLongPress?: (event: PressEvent) => void;
    onPressIn?: (event: PressEvent) => void;
    onPressOut?: (event: PressEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
}

export interface ViewProps extends CommonViewProps { }
export interface FrameLayoutProps extends CommonViewProps { }
export interface RelativeLayoutProps extends CommonViewProps { }
export interface PlainViewProps extends CommonViewProps { }

export interface TextProps extends CommonViewProps {
    style?: StyleProp<TextStyle | ViewStyle>;
    children?: ReactChildren;
    text?: string | number;
    color?: ColorValue;
    fontSize?: number;
    fontWeight?: FontWeightValue;
    fontStyle?: FontStyleValue;
    textAlign?: TextAlignValue;
    lineHeight?: number;
    letterSpacing?: number;
    numberOfLines?: number;
    ellipsizeMode?: EllipsizeModeValue;
    selectable?: boolean;
    allowFontPadding?: boolean;
    textTransform?: "none" | "uppercase";
    hint?: string;
    hintColor?: ColorValue;
    textColor?: ColorValue;
    textSizeSp?: number;
    maxLines?: number;
    minLines?: number;
    lines?: number;
    singleLine?: boolean;
    allCaps?: boolean;
    includeFontPadding?: boolean;
    textStyle?: "normal" | "bold" | "italic" | "bold|italic" | "italic|bold";
    ellipsize?: "start" | "middle" | "end" | "marquee";
    textIsSelectable?: boolean;
    lineSpacingExtra?: number;
    lineSpacingMultiplier?: number;
    maxLength?: number;
}

export interface TextInputProps extends TextProps {
    value?: string | number;
    defaultValue?: string | number;
    placeholder?: string;
    placeholderTextColor?: ColorValue;
    keyboardType?: KeyboardTypeValue;
    secureTextEntry?: boolean;
    multiline?: boolean;
    returnKeyType?: ReturnKeyTypeValue;
    selectTextOnFocus?: boolean;
    caretHidden?: boolean;
    editable?: boolean;
    inputType?: string | number;
    imeOptions?: string | number;
    selectAllOnFocus?: boolean;
    cursorVisible?: boolean;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: (event: SubmitEditingEvent) => void;
}

export interface ImageProps extends CommonViewProps {
    style?: StyleProp<ViewStyle>;
    source?: ImageSource;
    src?: string;
    resizeMode?: ResizeModeValue;
    scaleType?: ScaleTypeValue;
    tintColor?: ColorValue;
    adjustViewBounds?: boolean;
    cropToPadding?: boolean;
}

export interface ButtonProps extends TextProps {
    title?: string;
}
export interface ProgressBarProps extends CommonViewProps {
    indeterminate?: boolean;
    min?: number;
    progress?: number;
    secondaryProgress?: number;
    max?: number;
    progressTintColor?: ColorValue;
    secondaryProgressTintColor?: ColorValue;
    progressBackgroundTintColor?: ColorValue;
    indeterminateTintColor?: ColorValue;
}
export interface ActivityIndicatorProps extends CommonViewProps {
    animating?: boolean;
    color?: ColorValue;
    hidesWhenStopped?: boolean;
}
export interface SliderProps extends ProgressBarProps {
    thumbTintColor?: ColorValue;
    tickMarkTintColor?: ColorValue;
    splitTrack?: boolean;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
}
export interface CompoundButtonProps extends TextProps {
    checked?: boolean;
    value?: boolean;
    buttonTintColor?: ColorValue;
    onValueChange?: (value: boolean) => void;
}
export interface SwitchProps extends CompoundButtonProps {
    thumbColor?: ColorValue;
    trackColor?: ColorValue;
    thumbTintColor?: ColorValue;
    trackTintColor?: ColorValue;
    textOn?: string;
    textOff?: string;
    showText?: boolean;
}
export interface ScrollViewProps extends CommonViewProps {
    style?: StyleProp<ViewStyle>;
    horizontal?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    fillViewport?: boolean;
    smoothScrollingEnabled?: boolean;
    verticalScrollBarEnabled?: boolean;
    horizontalScrollBarEnabled?: boolean;
    showsVerticalScrollIndicator?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    overScrollMode?: OverScrollModeValue;
    onScroll?: (event: ScrollEvent) => void;
}
export interface HorizontalScrollViewProps extends ScrollViewProps { }
export interface CheckBoxProps extends CompoundButtonProps { }
export interface RadioButtonProps extends CompoundButtonProps { }
export interface RadioGroupProps extends CommonViewProps {
    checkedId?: NativeNodeId | null;
    onValueChange?: (checkedId: NativeNodeId | null) => void;
}
export interface ImageButtonProps extends ImageProps { }
export interface ToggleButtonProps extends CompoundButtonProps {
    textOn?: string;
    textOff?: string;
    disabledAlpha?: number;
}
export interface SpaceProps extends CommonViewProps { }

export interface PressableStateCallbackType {
    pressed: boolean;
    focused: boolean;
}
export interface PressableProps extends Omit<
    ViewProps,
    "onClick" | "onLongClick" | "style" | "children"
> {
    style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    children?:
    | ReactChildren
    | ((state: PressableStateCallbackType) => ReactChildren);
    onPress?: (event: PressEvent) => void;
    onLongPress?: (event: PressEvent) => void;
    onPressIn?: (event: PressEvent) => void;
    onPressOut?: (event: PressEvent) => void;
}
export interface TouchableOpacityProps extends PressableProps {
    activeOpacity?: number;
}
export interface FlatListProps<ItemT> extends Omit<
    ScrollViewProps,
    "children"
> {
    data?: readonly ItemT[] | null;
    renderItem: (info: { item: ItemT; index: number }) => React.ReactNode;
    keyExtractor?: (item: ItemT, index: number) => string;
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    ItemSeparatorComponent?: React.ComponentType<any> | React.ReactElement | null;
}

export type RNStyle = ViewStyle | TextStyle;

function isPlainObject(value: unknown): value is HostProps {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function flattenStyle(style: StyleProp<RNStyle>): HostProps {
    if (!style) return {};
    if (Array.isArray(style)) {
        const result: HostProps = {};
        for (const entry of style)
            Object.assign(result, flattenStyle(entry as StyleProp<RNStyle>));
        return result;
    }
    return isPlainObject(style) ? { ...style } : {};
}

function normalizeLayoutSize(value: unknown): unknown {
    if (
        value === "match_parent" ||
        value === "match" ||
        value === "fill_parent" ||
        value === "fill"
    )
        return "100%";
    if (value === "wrap_content" || value === "wrap") return "auto";
    return value;
}

function normalizeSizeInput(input: HostProps): HostProps {
    const output: HostProps = { ...input };
    const keys = [
        "width",
        "height",
        "minWidth",
        "minHeight",
        "maxWidth",
        "maxHeight",
        "flexBasis",
        "margin",
        "marginHorizontal",
        "marginVertical",
        "marginLeft",
        "marginRight",
        "marginTop",
        "marginBottom",
        "marginStart",
        "marginEnd",
        "padding",
        "paddingHorizontal",
        "paddingVertical",
        "paddingLeft",
        "paddingRight",
        "paddingTop",
        "paddingBottom",
        "paddingStart",
        "paddingEnd",
        "top",
        "bottom",
        "left",
        "right",
        "start",
        "end",
        "translateX",
        "translateY",
        "translateZ",
        "elevation",
        "borderRadius",
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
        "borderWidth",
        "borderLeftWidth",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderStartWidth",
        "borderEndWidth",
        "gap",
        "rowGap",
        "columnGap",
        "dividerPadding",
    ];
    for (const key of keys)
        if (output[key] !== undefined)
            output[key] = normalizeLayoutSize(output[key]);
    return output;
}

function mergeTextStyle(
    fontWeight?: FontWeightValue,
    fontStyle?: FontStyleValue,
): HostProps {
    const isBold =
        typeof fontWeight === "number"
            ? fontWeight >= 600
            : fontWeight === "bold" ||
            fontWeight === "600" ||
            fontWeight === "700" ||
            fontWeight === "800" ||
            fontWeight === "900";
    const isItalic = fontStyle === "italic";
    if (isBold && isItalic) return { textStyle: "bold|italic" };
    if (isBold) return { textStyle: "bold" };
    if (isItalic) return { textStyle: "italic" };
    return {};
}

function mapDisplay(
    display?: DisplayValue,
    visible?: boolean,
    explicitVisibility?: VisibilityValue,
): HostProps {
    const output: HostProps = {};
    if (display !== undefined) output.display = display;
    if (explicitVisibility) output.visibility = explicitVisibility;
    else if (visible === false) output.visibility = "gone";
    else if (visible === true) output.visibility = "visible";
    if (display === "none" && output.visibility === undefined)
        output.visibility = "gone";
    return output;
}

function mapDisabled(disabled?: boolean, enabled?: boolean): HostProps {
    if (disabled != null) return { enabled: !disabled };
    if (enabled != null) return { enabled };
    return {};
}

function mapPointerEvents(
    pointerEvents?: "none" | "auto" | "box-none" | "box-only",
    clickable?: boolean,
): HostProps {
    if (pointerEvents === "none" || pointerEvents === "box-none")
        return { clickable: false, longClickable: false, focusable: false };
    if (pointerEvents === "auto" || pointerEvents === "box-only")
        return { clickable: true };
    if (clickable != null) return { clickable };
    return {};
}

function normalizeAngle(value: unknown): unknown {
    if (typeof value !== "string") return value;
    const text = value.trim().toLowerCase();
    if (text.endsWith("deg")) return parseFloat(text);
    if (text.endsWith("rad")) return (parseFloat(text) * 180) / Math.PI;
    return value;
}

function mapTransform(transform: unknown): HostProps {
    const output: HostProps = {};
    if (!Array.isArray(transform)) return output;
    for (const item of transform) {
        if (!isPlainObject(item)) continue;
        for (const [key, value] of Object.entries(item)) {
            if (key === "translateX" && output.translationX === undefined)
                output.translationX = normalizeLayoutSize(value);
            else if (key === "translateY" && output.translationY === undefined)
                output.translationY = normalizeLayoutSize(value);
            else if (key === "translateZ" && output.translationZ === undefined)
                output.translationZ = normalizeLayoutSize(value);
            else if (key === "scale") {
                if (output.scaleX === undefined) output.scaleX = value;
                if (output.scaleY === undefined) output.scaleY = value;
            } else if (key === "scaleX" && output.scaleX === undefined)
                output.scaleX = value;
            else if (key === "scaleY" && output.scaleY === undefined)
                output.scaleY = value;
            else if (
                (key === "rotate" || key === "rotation") &&
                output.rotation === undefined
            )
                output.rotation = normalizeAngle(value);
            else if (key === "rotateX" && output.rotationX === undefined)
                output.rotationX = normalizeAngle(value);
            else if (key === "rotateY" && output.rotationY === undefined)
                output.rotationY = normalizeAngle(value);
        }
    }
    return output;
}

function mapCommonProps(input: HostProps): HostProps {
    const output: HostProps = {
        ...mapDisplay(
            input.display as DisplayValue | undefined,
            input.visible as boolean | undefined,
            input.visibility as VisibilityValue | undefined,
        ),
        ...mapDisabled(
            input.disabled as boolean | undefined,
            input.enabled as boolean | undefined,
        ),
        ...mapPointerEvents(
            input.pointerEvents as
            | "none"
            | "auto"
            | "box-none"
            | "box-only"
            | undefined,
            input.clickable as boolean | undefined,
        ),
        ...mapTransform(input.transform),
    };
    if (input.opacity !== undefined && input.alpha === undefined)
        output.alpha = input.opacity;
    if (input.translateX !== undefined && input.translationX === undefined)
        output.translationX = normalizeLayoutSize(input.translateX);
    if (input.translateY !== undefined && input.translationY === undefined)
        output.translationY = normalizeLayoutSize(input.translateY);
    if (input.translateZ !== undefined && input.translationZ === undefined)
        output.translationZ = normalizeLayoutSize(input.translateZ);
    if (
        input.accessibilityLabel !== undefined &&
        input.contentDescription === undefined
    )
        output.contentDescription = input.accessibilityLabel;
    if (input.testID !== undefined && input.tag === undefined)
        output.tag = input.testID;
    if (input.nativeID !== undefined && input.tag === undefined)
        output.tag = input.nativeID;
    if (
        input.layoutWeight !== undefined &&
        input.flex === undefined &&
        input.flexGrow === undefined
    )
        output.flexGrow = input.layoutWeight;
    if (input.orientation !== undefined && input.flexDirection === undefined)
        output.flexDirection =
            input.orientation === "horizontal" ? "row" : "column";
    return output;
}

function mapTextAlign(textAlign?: TextAlignValue): HostProps {
    if (!textAlign || textAlign === "auto") return {};
    if (textAlign === "center")
        return { gravity: "center_horizontal", textAlignment: "center" };
    if (textAlign === "right")
        return { gravity: "right", textAlignment: "viewEnd" };
    return { gravity: "left", textAlignment: "viewStart" };
}

function mapEllipsizeMode(value?: EllipsizeModeValue): HostProps {
    if (!value || value === "clip") return {};
    if (value === "head") return { ellipsize: "start" };
    if (value === "middle") return { ellipsize: "middle" };
    return { ellipsize: "end" };
}

function mapTextProps(input: HostProps): HostProps {
    const output: HostProps = {
        ...mergeTextStyle(
            input.fontWeight as FontWeightValue | undefined,
            input.fontStyle as FontStyleValue | undefined,
        ),
        ...mapTextAlign(input.textAlign as TextAlignValue | undefined),
        ...mapEllipsizeMode(input.ellipsizeMode as EllipsizeModeValue | undefined),
    };
    if (input.color !== undefined && input.textColor === undefined)
        output.textColor = input.color;
    if (input.fontSize !== undefined && input.textSizeSp === undefined)
        output.textSizeSp = input.fontSize;
    if (input.selectable !== undefined && input.textIsSelectable === undefined)
        output.textIsSelectable = input.selectable;
    if (
        input.allowFontPadding !== undefined &&
        input.includeFontPadding === undefined
    )
        output.includeFontPadding = input.allowFontPadding;
    if (input.numberOfLines !== undefined) {
        output.maxLines = input.numberOfLines;
        if (input.numberOfLines === 1) output.singleLine = true;
    }
    if (input.textTransform === "uppercase" && input.allCaps === undefined)
        output.allCaps = true;
    if (
        input.lineHeight !== undefined &&
        input.fontSize !== undefined &&
        input.lineSpacingExtra === undefined
    ) {
        output.lineSpacingExtra = Math.max(
            0,
            Number(input.lineHeight) - Number(input.fontSize),
        );
        output.lineSpacingMultiplier = 1;
    }
    return output;
}

function mapKeyboardType(
    value?: KeyboardTypeValue,
    secureTextEntry?: boolean,
    multiline?: boolean,
): string | number | undefined {
    if (secureTextEntry) return "password";
    if (multiline) return "multiline";
    if (value === "email-address") return "email";
    if (value === "numeric") return "number";
    if (value === "decimal-pad") return "decimal";
    if (value === "phone-pad") return "phone";
    return "text";
}

function mapReturnKeyType(
    value?: ReturnKeyTypeValue,
): string | number | undefined {
    if (value === "done") return "done";
    if (value === "go") return "go";
    if (value === "next") return "next";
    if (value === "search") return "search";
    if (value === "send") return "send";
    return undefined;
}

function mapTextInputProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.value !== undefined && input.text === undefined)
        output.text = String(input.value);
    else if (input.defaultValue !== undefined && input.text === undefined)
        output.text = String(input.defaultValue);
    if (input.placeholder !== undefined && input.hint === undefined)
        output.hint = input.placeholder;
    if (input.placeholderTextColor !== undefined && input.hintColor === undefined)
        output.hintColor = input.placeholderTextColor;
    if (
        input.selectTextOnFocus !== undefined &&
        input.selectAllOnFocus === undefined
    )
        output.selectAllOnFocus = input.selectTextOnFocus;
    if (input.caretHidden !== undefined && input.cursorVisible === undefined)
        output.cursorVisible = !input.caretHidden;
    if (input.editable !== undefined && input.enabled === undefined)
        output.enabled = input.editable;
    const inputType = mapKeyboardType(
        input.keyboardType as KeyboardTypeValue | undefined,
        input.secureTextEntry as boolean | undefined,
        input.multiline as boolean | undefined,
    );
    if (inputType !== undefined && input.inputType === undefined)
        output.inputType = inputType;
    const imeOptions = mapReturnKeyType(
        input.returnKeyType as ReturnKeyTypeValue | undefined,
    );
    if (imeOptions !== undefined && input.imeOptions === undefined)
        output.imeOptions = imeOptions;
    return output;
}

function mapResizeMode(value?: ResizeModeValue): string | undefined {
    switch (value) {
        case "cover":
            return "centerCrop";
        case "contain":
            return "fitCenter";
        case "stretch":
            return "fitXY";
        case "center":
            return "center";
        default:
            return undefined;
    }
}

function mapButtonProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.title !== undefined && input.text === undefined)
        output.text = input.title;
    return output;
}
function mapCompoundButtonProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.value !== undefined && input.checked === undefined)
        output.checked = input.value;
    return output;
}
function mapSwitchProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.thumbColor !== undefined && input.thumbTintColor === undefined)
        output.thumbTintColor = input.thumbColor;
    if (input.trackColor !== undefined && input.trackTintColor === undefined)
        output.trackTintColor = input.trackColor;
    return output;
}
function mapActivityIndicatorProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.animating !== undefined && input.indeterminate === undefined)
        output.indeterminate = input.animating;
    if (input.color !== undefined && input.progressTintColor === undefined)
        output.progressTintColor = input.color;
    if (input.hidesWhenStopped === true && input.animating === false) {
        output.display = "none";
        output.visibility = "gone";
    }
    return output;
}

function mapImageSource(source: unknown): string | undefined {
    if (typeof source === "string") return source;
    if (
        source &&
        typeof source === "object" &&
        typeof (source as { uri?: unknown }).uri === "string"
    )
        return (source as { uri: string }).uri;
    return undefined;
}

function mapImageProps(input: HostProps): HostProps {
    const output: HostProps = {};
    const src =
        typeof input.src === "string" ? input.src : mapImageSource(input.source);
    if (src !== undefined) output.src = src;
    const scaleType = mapResizeMode(
        input.resizeMode as ResizeModeValue | undefined,
    );
    if (scaleType !== undefined && input.scaleType === undefined)
        output.scaleType = scaleType;
    if (input.tintColor !== undefined) output.tintColor = input.tintColor;
    if (input.adjustViewBounds !== undefined)
        output.adjustViewBounds = input.adjustViewBounds;
    if (input.cropToPadding !== undefined)
        output.cropToPadding = input.cropToPadding;
    return output;
}

function cleanUndefined(object: HostProps) {
    for (const key of Object.keys(object))
        if (object[key] === undefined) delete object[key];
}

function normalizeProps<
    T extends { style?: StyleProp<RNStyle>; children?: React.ReactNode },
>(
    props: T | null | undefined,
    mapper?: (input: HostProps) => HostProps,
): HostProps {
    if (!props) return {};
    const { style, children, ...rest } = props as T & {
        style?: StyleProp<RNStyle>;
        children?: React.ReactNode;
    };
    const merged: HostProps = normalizeSizeInput({
        ...flattenStyle(style),
        ...rest,
    });
    const normalized: HostProps = {
        ...merged,
        ...mapCommonProps(merged),
        ...(mapper ? mapper(merged) : {}),
    };
    cleanUndefined(normalized);
    delete normalized.visible;
    delete normalized.disabled;
    delete normalized.pointerEvents;
    delete normalized.opacity;
    delete normalized.translateX;
    delete normalized.translateY;
    delete normalized.translateZ;
    delete normalized.accessibilityLabel;
    delete normalized.testID;
    delete normalized.nativeID;
    delete normalized.layoutWeight;
    delete normalized.orientation;
    delete normalized.transform;
    delete normalized.title;
    delete normalized.color;
    delete normalized.fontSize;
    delete normalized.fontWeight;
    delete normalized.fontStyle;
    delete normalized.textAlign;
    delete normalized.lineHeight;
    delete normalized.allowFontPadding;
    delete normalized.ellipsizeMode;
    delete normalized.numberOfLines;
    delete normalized.selectable;
    delete normalized.placeholder;
    delete normalized.placeholderTextColor;
    delete normalized.keyboardType;
    delete normalized.secureTextEntry;
    delete normalized.multiline;
    delete normalized.returnKeyType;
    delete normalized.selectTextOnFocus;
    delete normalized.caretHidden;
    delete normalized.editable;
    delete normalized.defaultValue;
    delete normalized.source;
    delete normalized.resizeMode;
    delete normalized.thumbColor;
    delete normalized.trackColor;
    delete normalized.animating;
    delete normalized.hidesWhenStopped;
    delete normalized.horizontal;
    delete normalized.contentContainerStyle;
    delete normalized.showsVerticalScrollIndicator;
    delete normalized.showsHorizontalScrollIndicator;
    if (children !== undefined) normalized.children = children;
    return normalized;
}

function createHostComponent<P extends { style?: StyleProp<RNStyle>; children?: React.ReactNode }>(type: string, mapper?: (input: HostProps) => HostProps) {
    const Component = React.forwardRef<any, P>((props, ref) => React.createElement(type, { ...normalizeProps(props, mapper), ref }));
    Component.displayName = type;
    return Component;
}

const mapViewLike = (input: HostProps) => input;
const mapTextLike = (input: HostProps) => mapTextProps(input);
const mapTextInputLike = (input: HostProps) => ({
    ...mapTextProps(input),
    ...mapTextInputProps(input),
});
const mapImageLike = (input: HostProps) => mapImageProps(input);
const mapButtonLike = (input: HostProps) => ({
    ...mapTextProps(input),
    ...mapButtonProps(input),
});
const mapCompoundButtonLike = (input: HostProps) => ({
    ...mapTextProps(input),
    ...mapCompoundButtonProps(input),
});
const mapSwitchLike = (input: HostProps) => ({
    ...mapTextProps(input),
    ...mapCompoundButtonProps(input),
    ...mapSwitchProps(input),
});
const mapProgressLike = (input: HostProps) => input;
const mapActivityIndicatorLike = (input: HostProps) =>
    mapActivityIndicatorProps(input);
const mapSliderLike = (input: HostProps) => input;

function resolvePressableStyle(
    style: PressableProps["style"],
    state: PressableStateCallbackType,
): StyleProp<ViewStyle> {
    return typeof style === "function" ? style(state) : style;
}
function resolvePressableChildren(
    children: PressableProps["children"],
    state: PressableStateCallbackType,
): ReactChildren {
    return typeof children === "function" ? children(state) : children;
}
function renderComponentOrElement(
    component: React.ComponentType<any> | React.ReactElement | null | undefined,
    props?: Record<string, unknown>,
): React.ReactNode {
    if (!component) return null;
    if (React.isValidElement(component)) return component;
    return React.createElement(component, props ?? {});
}

const NativeScrollView = createHostComponent<
    Omit<
        ScrollViewProps,
        | "horizontal"
        | "contentContainerStyle"
        | "showsVerticalScrollIndicator"
        | "showsHorizontalScrollIndicator"
    >
>("ScrollView", mapViewLike);
const NativeHorizontalScrollView = createHostComponent<
    Omit<
        HorizontalScrollViewProps,
        | "horizontal"
        | "contentContainerStyle"
        | "showsVerticalScrollIndicator"
        | "showsHorizontalScrollIndicator"
    >
>("HorizontalScrollView", mapViewLike);

export const View = createHostComponent<ViewProps>("View", mapViewLike);
export const LinearLayout = createHostComponent<ViewProps>(
    "LinearLayout",
    mapViewLike,
);
export const FrameLayout = createHostComponent<FrameLayoutProps>(
    "FrameLayout",
    mapViewLike,
);
export const RelativeLayout = createHostComponent<RelativeLayoutProps>(
    "RelativeLayout",
    mapViewLike,
);
export const PlainView = createHostComponent<PlainViewProps>(
    "PlainView",
    mapViewLike,
);
export const Text = createHostComponent<TextProps>("Text", mapTextLike);
export const TextView = createHostComponent<TextProps>("TextView", mapTextLike);
export const TextInput = createHostComponent<TextInputProps>(
    "EditText",
    mapTextInputLike,
);
export const EditText = TextInput;
export const Button = createHostComponent<ButtonProps>("Button", mapButtonLike);
export const ProgressBar = createHostComponent<ProgressBarProps>(
    "ProgressBar",
    mapProgressLike,
);
export const ProgressBarHorizontal = createHostComponent<ProgressBarProps>(
    "ProgressBarHorizontal",
    mapProgressLike,
);
export const ActivityIndicator = createHostComponent<ActivityIndicatorProps>(
    "ProgressBar",
    mapActivityIndicatorLike,
);
export const Slider = createHostComponent<SliderProps>(
    "SeekBar",
    mapSliderLike,
);
export const SeekBar = Slider;
export const Image = createHostComponent<ImageProps>("Image", mapImageLike);
export const ImageView = Image;
export const ImageButton = createHostComponent<ImageButtonProps>(
    "ImageButton",
    mapImageLike,
);
export const Switch = createHostComponent<SwitchProps>("Switch", mapSwitchLike);
export const CheckBox = createHostComponent<CheckBoxProps>(
    "CheckBox",
    mapCompoundButtonLike,
);
export const RadioButton = createHostComponent<RadioButtonProps>(
    "RadioButton",
    mapCompoundButtonLike,
);
export const RadioGroup = createHostComponent<RadioGroupProps>(
    "RadioGroup",
    mapViewLike,
);
export const ToggleButton = createHostComponent<ToggleButtonProps>(
    "ToggleButton",
    mapCompoundButtonLike,
);
export const Space = createHostComponent<SpaceProps>("Space", mapViewLike);
export const SafeAreaView = View;

export const ScrollView = (props: ScrollViewProps) => {
    const {
        horizontal,
        contentContainerStyle,
        showsVerticalScrollIndicator,
        showsHorizontalScrollIndicator,
        children,
        ...rest
    } = props;
    const hostProps: any = { ...rest };
    if (
        showsVerticalScrollIndicator !== undefined &&
        hostProps.verticalScrollBarEnabled === undefined
    )
        hostProps.verticalScrollBarEnabled = showsVerticalScrollIndicator;
    if (
        showsHorizontalScrollIndicator !== undefined &&
        hostProps.horizontalScrollBarEnabled === undefined
    )
        hostProps.horizontalScrollBarEnabled = showsHorizontalScrollIndicator;
    const HostComponent = horizontal
        ? NativeHorizontalScrollView
        : NativeScrollView;
    const content = contentContainerStyle
        ? React.createElement(View, { style: contentContainerStyle }, children)
        : children;
    return React.createElement(HostComponent, hostProps, content);
};
ScrollView.displayName = "ScrollView";

export const HorizontalScrollView = (props: HorizontalScrollViewProps) =>
    React.createElement(ScrollView, { ...props, horizontal: true });
HorizontalScrollView.displayName = "HorizontalScrollView";

export const Pressable = (props: PressableProps) => {
    const { style, children, onPressIn, onPressOut, onFocus, onBlur, ...rest } =
        props;
    const [pressed, setPressed] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const state: PressableStateCallbackType = { pressed, focused };
    return React.createElement(
        View,
        {
            ...rest,
            style: resolvePressableStyle(style, state),
            onPressIn: (event: PressEvent) => {
                setPressed(true);
                onPressIn?.(event);
            },
            onPressOut: (event: PressEvent) => {
                setPressed(false);
                onPressOut?.(event);
            },
            onFocus: (event: FocusEvent) => {
                setFocused(true);
                onFocus?.(event);
            },
            onBlur: (event: FocusEvent) => {
                setFocused(false);
                setPressed(false);
                onBlur?.(event);
            },
        },
        resolvePressableChildren(children, state),
    );
};
Pressable.displayName = "Pressable";

export const TouchableOpacity = (props: TouchableOpacityProps) => {
    const { activeOpacity = 0.2, style, ...rest } = props;
    return React.createElement(Pressable, {
        ...rest,
        style: (state: PressableStateCallbackType) => [
            resolvePressableStyle(style, state),
            state.pressed ? { opacity: activeOpacity } : null,
        ],
    });
};
TouchableOpacity.displayName = "TouchableOpacity";

export function FlatList<ItemT>(props: FlatListProps<ItemT>) {
    const {
        data,
        renderItem,
        keyExtractor,
        ListHeaderComponent,
        ListFooterComponent,
        ListEmptyComponent,
        ItemSeparatorComponent,
        ...scrollViewProps
    } = props;
    const items = data ?? [];
    return React.createElement(
        ScrollView,
        scrollViewProps,
        renderComponentOrElement(ListHeaderComponent),
        items.length === 0
            ? renderComponentOrElement(ListEmptyComponent)
            : items.map((item, index) =>
                React.createElement(
                    React.Fragment,
                    { key: keyExtractor ? keyExtractor(item, index) : String(index) },
                    renderItem({ item, index }),
                    index < items.length - 1
                        ? renderComponentOrElement(ItemSeparatorComponent)
                        : null,
                ),
            ),
        renderComponentOrElement(ListFooterComponent),
    );
}

export const HorizontalStackLayout = (props: ViewProps) =>
    React.createElement(View, {
        ...props,
        style: [{ flexDirection: "row" }, props.style],
    });
HorizontalStackLayout.displayName = "HorizontalStackLayout";
export const VerticalStackLayout = (props: ViewProps) =>
    React.createElement(View, {
        ...props,
        style: [{ flexDirection: "column" }, props.style],
    });
VerticalStackLayout.displayName = "VerticalStackLayout";
export const Row = HorizontalStackLayout;
export const Column = VerticalStackLayout;

export const StyleSheet = {
    create<T extends Record<string, RNStyle>>(styles: T): T {
        return styles;
    },
    flatten(style: StyleProp<RNStyle>): HostProps {
        return flattenStyle(style);
    },
    absoluteFillObject: {
        position: "absolute" as const,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    absoluteFill: {
        position: "absolute" as const,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
};

export const Animated = {
    ...AnimatedCore,
    View: createAnimatedComponent(View),
    Text: createAnimatedComponent(Text),
    Image: createAnimatedComponent(Image),
    ScrollView: createAnimatedComponent(ScrollView as any),
    FlatList: createAnimatedComponent(FlatList as any),
};

export default {
    View,
    LinearLayout,
    FrameLayout,
    RelativeLayout,
    ScrollView,
    HorizontalScrollView,
    PlainView,
    Text,
    TextView,
    TextInput,
    EditText,
    Image,
    ImageView,
    ImageButton,
    Button,
    ProgressBar,
    ProgressBarHorizontal,
    ActivityIndicator,
    Slider,
    SeekBar,
    Switch,
    CheckBox,
    RadioButton,
    RadioGroup,
    ToggleButton,
    Space,
    SafeAreaView,
    Pressable,
    TouchableOpacity,
    FlatList,
    HorizontalStackLayout,
    VerticalStackLayout,
    Row,
    Column,
    StyleSheet,
    Animated,
};
