import React from 'react';

export type LayoutSize =
    | number
    | `${number}dp`
    | `${number}px`
    | `${number}sp`
    | 'match_parent'
    | 'match'
    | 'fill_parent'
    | 'fill'
    | 'wrap_content'
    | 'wrap';

export type SizeValue = number | `${number}dp` | `${number}px` | `${number}sp`;
export type ColorValue = string | number;
export type VisibilityValue = 'visible' | 'invisible' | 'gone';
export type DisplayValue = 'flex' | 'none';
export type FlexDirectionValue = 'row' | 'column';
export type JustifyContentValue = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItemsValue = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type AlignSelfValue = 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type FontWeightValue = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyleValue = 'normal' | 'italic';
export type TextAlignValue = 'auto' | 'left' | 'center' | 'right';
export type EllipsizeModeValue = 'head' | 'middle' | 'tail' | 'clip';
export type ResizeModeValue = 'cover' | 'contain' | 'stretch' | 'center';
export type KeyboardTypeValue = 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad';
export type ReturnKeyTypeValue = 'done' | 'go' | 'next' | 'search' | 'send';
export type NativeNodeId = number;
export type ImageSource = number | { resource: number } | { androidResource: number };

export type StyleProp<T> = T | Array<T | null | false | undefined> | null | false | undefined;

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

    minWidth?: SizeValue;
    minHeight?: SizeValue;

    position?: 'relative' | 'absolute';
    top?: SizeValue;
    bottom?: SizeValue;
    left?: SizeValue;
    right?: SizeValue;

    flex?: number;
    flexGrow?: number;
    flexDirection?: FlexDirectionValue;
    justifyContent?: JustifyContentValue;
    alignItems?: AlignItemsValue;
    alignSelf?: AlignSelfValue;

    display?: DisplayValue;
}

export interface TransformStyle {
    opacity?: number;
    backgroundColor?: ColorValue;
    transform?: never;
    elevation?: SizeValue;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    rotationX?: number;
    rotationY?: number;
    translateX?: SizeValue;
    translateY?: SizeValue;
    translateZ?: SizeValue;
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
    textTransform?: 'none' | 'uppercase';
}

export interface ImageStyle extends LayoutStyle, TransformStyle {
    resizeMode?: ResizeModeValue;
    tintColor?: ColorValue;
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
    style?: StyleProp<ViewStyle | TextStyle | ImageStyle>;

    width?: LayoutSize;
    height?: LayoutSize;

    visible?: boolean;
    visibility?: VisibilityValue;
    display?: DisplayValue;
    disabled?: boolean;
    enabled?: boolean;
    pointerEvents?: 'none' | 'auto';
    focusable?: boolean;
    focusableInTouchMode?: boolean;
    selected?: boolean;
    activated?: boolean;

    opacity?: number;
    backgroundColor?: ColorValue;
    elevation?: SizeValue;
    rotation?: number;
    rotationX?: number;
    rotationY?: number;
    scaleX?: number;
    scaleY?: number;
    translateX?: SizeValue;
    translateY?: SizeValue;
    translateZ?: SizeValue;

    minWidth?: SizeValue;
    minHeight?: SizeValue;

    accessibilityLabel?: string;
    contentDescription?: string;
    testID?: string;
    nativeID?: string;
    tag?: string | number | boolean;
    keepScreenOn?: boolean;
    fitsSystemWindows?: boolean;

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
    flexDirection?: FlexDirectionValue;
    justifyContent?: JustifyContentValue;
    alignItems?: AlignItemsValue;
    alignSelf?: AlignSelfValue;

    position?: 'relative' | 'absolute';
    top?: SizeValue;
    bottom?: SizeValue;
    left?: SizeValue;
    right?: SizeValue;

    clickable?: boolean;

    onClick?: () => void;
    onLongClick?: (event: PressEvent) => void;
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
    textTransform?: 'none' | 'uppercase';
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

    onChangeText?: (text: string) => void;
    onSubmitEditing?: (event: SubmitEditingEvent) => void;
}

export interface ButtonProps extends TextProps {
    title?: string;
}

export interface ImageProps extends CommonViewProps {
    style?: StyleProp<ImageStyle | ViewStyle>;
    source?: ImageSource;
    resizeMode?: ResizeModeValue;
    tintColor?: ColorValue;
    resizeMethod?: 'auto' | 'resize' | 'scale';
}

export interface ProgressBarProps extends CommonViewProps {
    indeterminate?: boolean;
    progress?: number;
    secondaryProgress?: number;
    max?: number;
    progressTintColor?: ColorValue;
}

export interface ActivityIndicatorProps extends CommonViewProps {
    animating?: boolean;
    color?: ColorValue;
    hidesWhenStopped?: boolean;
}

export interface SliderProps extends ProgressBarProps {
    thumbTintColor?: ColorValue;

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
    textOn?: string;
    textOff?: string;
    showText?: boolean;
}

export interface ScrollViewProps extends CommonViewProps {
    style?: StyleProp<ViewStyle>;
    fillViewport?: boolean;
    smoothScrollingEnabled?: boolean;

    onScroll?: (event: ScrollEvent) => void;
}

export interface HorizontalScrollViewProps extends ScrollViewProps { }
export interface CheckBoxProps extends CompoundButtonProps { }
export interface RadioButtonProps extends CompoundButtonProps { }
export interface SpaceProps extends CommonViewProps { }

export type RNStyle = ViewStyle | TextStyle | ImageStyle;

function flattenStyle(style: StyleProp<RNStyle>): HostProps {
    if (!style) return {};
    if (Array.isArray(style)) {
        const result: HostProps = {};
        for (const entry of style) Object.assign(result, flattenStyle(entry as StyleProp<RNStyle>));
        return result;
    }
    return { ...style };
}

function mergeTextStyle(fontWeight?: FontWeightValue, fontStyle?: FontStyleValue): HostProps {
    const isBold = typeof fontWeight === 'number'
        ? fontWeight >= 600
        : fontWeight === 'bold' || fontWeight === '600' || fontWeight === '700' || fontWeight === '800' || fontWeight === '900';
    const isItalic = fontStyle === 'italic';

    if (isBold && isItalic) return { textStyle: 'bold|italic' };
    if (isBold) return { textStyle: 'bold' };
    if (isItalic) return { textStyle: 'italic' };
    return {};
}

function mapDisplay(display?: DisplayValue, visible?: boolean, explicitVisibility?: VisibilityValue): HostProps {
    if (explicitVisibility) return { visibility: explicitVisibility };
    if (display === 'none' || visible === false) return { visibility: 'gone' };
    if (visible === true || display === 'flex') return { visibility: 'visible' };
    return {};
}

function mapDisabled(disabled?: boolean, enabled?: boolean): HostProps {
    if (disabled != null) return { enabled: !disabled };
    if (enabled != null) return { enabled };
    return {};
}

function mapPointerEvents(pointerEvents?: 'none' | 'auto', clickable?: boolean): HostProps {
    if (pointerEvents === 'none') return { clickable: false };
    if (pointerEvents === 'auto') return { clickable: true };
    if (clickable != null) return { clickable };
    return {};
}

function mapMarginsAndPadding(input: HostProps): HostProps {
    const output: HostProps = {};

    if (input.marginStart !== undefined && input.marginLeft === undefined) output.marginLeft = input.marginStart;
    if (input.marginEnd !== undefined && input.marginRight === undefined) output.marginRight = input.marginEnd;
    if (input.paddingStart !== undefined && input.paddingLeft === undefined) output.paddingLeft = input.paddingStart;
    if (input.paddingEnd !== undefined && input.paddingRight === undefined) output.paddingRight = input.paddingEnd;

    return output;
}

function mapCommonProps(input: HostProps): HostProps {
    const output: HostProps = {
        ...mapDisplay(input.display as DisplayValue | undefined, input.visible as boolean | undefined, input.visibility as VisibilityValue | undefined),
        ...mapDisabled(input.disabled as boolean | undefined, input.enabled as boolean | undefined),
        ...mapPointerEvents(input.pointerEvents as 'none' | 'auto' | undefined, input.clickable as boolean | undefined),
        ...mapMarginsAndPadding(input),
    };

    if (input.opacity !== undefined && input.alpha === undefined) output.alpha = input.opacity;
    if (input.translateX !== undefined && input.translationX === undefined) output.translationX = input.translateX;
    if (input.translateY !== undefined && input.translationY === undefined) output.translationY = input.translateY;
    if (input.translateZ !== undefined && input.translationZ === undefined) output.translationZ = input.translateZ;
    if (input.minWidth !== undefined && input.minimumWidth === undefined) output.minimumWidth = input.minWidth;
    if (input.minHeight !== undefined && input.minimumHeight === undefined) output.minimumHeight = input.minHeight;
    if (input.accessibilityLabel !== undefined && input.contentDescription === undefined) output.contentDescription = input.accessibilityLabel;
    if (input.testID !== undefined && input.tag === undefined) output.tag = input.testID;
    if (input.nativeID !== undefined && input.tag === undefined) output.tag = input.nativeID;

    if (input.position === 'absolute') {
        if (input.top !== undefined) output.marginTop = input.top;
        if (input.bottom !== undefined) output.marginBottom = input.bottom;
        if (input.left !== undefined) output.marginLeft = input.left;
        if (input.right !== undefined) output.marginRight = input.right;
    }

    return output;
}

function appendGravityPart(parts: string[], value?: string) {
    if (!value || parts.includes(value)) return;
    parts.push(value);
}

function mapGravityFromFlex(flexDirection?: FlexDirectionValue, justifyContent?: JustifyContentValue, alignItems?: AlignItemsValue): string | undefined {
    const direction = flexDirection ?? 'column';
    const parts: string[] = [];

    if (direction === 'row') {
        if (justifyContent === 'center') appendGravityPart(parts, 'center_horizontal');
        else if (justifyContent === 'flex-end') appendGravityPart(parts, 'end');
        else if (justifyContent === 'flex-start') appendGravityPart(parts, 'start');

        if (alignItems === 'center') appendGravityPart(parts, 'center_vertical');
        else if (alignItems === 'flex-end') appendGravityPart(parts, 'bottom');
        else if (alignItems === 'flex-start') appendGravityPart(parts, 'top');
    } else {
        if (justifyContent === 'center') appendGravityPart(parts, 'center_vertical');
        else if (justifyContent === 'flex-end') appendGravityPart(parts, 'bottom');
        else if (justifyContent === 'flex-start') appendGravityPart(parts, 'top');

        if (alignItems === 'center') appendGravityPart(parts, 'center_horizontal');
        else if (alignItems === 'flex-end') appendGravityPart(parts, 'end');
        else if (alignItems === 'flex-start') appendGravityPart(parts, 'start');
    }

    return parts.length > 0 ? parts.join('|') : undefined;
}

function mapLayoutProps(input: HostProps): HostProps {
    const output: HostProps = {};

    const flex = input.flex ?? input.flexGrow;
    if (flex !== undefined && input.layoutWeight === undefined) output.layoutWeight = flex;

    const alignSelf = input.alignSelf as AlignSelfValue | undefined;
    if (alignSelf && alignSelf !== 'auto' && alignSelf !== 'stretch' && input.layoutGravity === undefined) {
        if (alignSelf === 'center') output.layoutGravity = 'center';
        else if (alignSelf === 'flex-start') output.layoutGravity = 'start';
        else if (alignSelf === 'flex-end') output.layoutGravity = 'end';
    }

    const flexDirection = input.flexDirection as FlexDirectionValue | undefined;
    if (flexDirection && input.orientation === undefined) output.orientation = flexDirection === 'row' ? 'horizontal' : 'vertical';

    const gravity = mapGravityFromFlex(
        flexDirection,
        input.justifyContent as JustifyContentValue | undefined,
        input.alignItems as AlignItemsValue | undefined,
    );

    if (gravity && input.gravity === undefined) output.gravity = gravity;

    return output;
}

function mapTextAlign(textAlign?: TextAlignValue): HostProps {
    if (!textAlign || textAlign === 'auto') return {};
    if (textAlign === 'center') return { gravity: 'center_horizontal', textAlignment: 'center' };
    if (textAlign === 'right') return { gravity: 'right', textAlignment: 'viewEnd' };
    return { gravity: 'left', textAlignment: 'viewStart' };
}

function mapEllipsizeMode(value?: EllipsizeModeValue): HostProps {
    if (!value || value === 'clip') return {};
    if (value === 'head') return { ellipsize: 'start' };
    if (value === 'middle') return { ellipsize: 'middle' };
    return { ellipsize: 'end' };
}

function mapTextProps(input: HostProps): HostProps {
    const output: HostProps = {
        ...mergeTextStyle(input.fontWeight as FontWeightValue | undefined, input.fontStyle as FontStyleValue | undefined),
        ...mapTextAlign(input.textAlign as TextAlignValue | undefined),
        ...mapEllipsizeMode(input.ellipsizeMode as EllipsizeModeValue | undefined),
    };

    if (input.color !== undefined && input.textColor === undefined) output.textColor = input.color;
    if (input.fontSize !== undefined && input.textSizeSp === undefined) output.textSizeSp = input.fontSize;
    if (input.selectable !== undefined && input.textIsSelectable === undefined) output.textIsSelectable = input.selectable;
    if (input.allowFontPadding !== undefined && input.includeFontPadding === undefined) output.includeFontPadding = input.allowFontPadding;
    if (input.numberOfLines !== undefined) {
        output.maxLines = input.numberOfLines;
        if (input.numberOfLines === 1) output.singleLine = true;
    }
    if (input.textTransform === 'uppercase' && input.allCaps === undefined) output.allCaps = true;
    if (input.lineHeight !== undefined && input.fontSize !== undefined && input.lineSpacingExtra === undefined) {
        output.lineSpacingExtra = Math.max(0, Number(input.lineHeight) - Number(input.fontSize));
        output.lineSpacingMultiplier = 1;
    }

    return output;
}

function mapKeyboardType(value?: KeyboardTypeValue, secureTextEntry?: boolean, multiline?: boolean): string | number | undefined {
    if (secureTextEntry) return 'password';
    if (multiline) return 'multiline';
    switch (value) {
        case 'email-address': return 'email';
        case 'numeric': return 'number';
        case 'decimal-pad': return 'decimal';
        case 'phone-pad': return 'phone';
        case 'default':
        default:
            return 'text';
    }
}

function mapReturnKeyType(value?: ReturnKeyTypeValue): string | undefined {
    return value;
}

function mapTextInputProps(input: HostProps): HostProps {
    const output: HostProps = {};

    const resolvedValue = input.value ?? input.defaultValue;
    if (resolvedValue !== undefined && input.text === undefined) output.text = String(resolvedValue);
    if (input.placeholder !== undefined && input.hint === undefined) output.hint = input.placeholder;
    if (input.placeholderTextColor !== undefined && input.hintColor === undefined) output.hintColor = input.placeholderTextColor;
    if (input.selectTextOnFocus !== undefined && input.selectAllOnFocus === undefined) output.selectAllOnFocus = input.selectTextOnFocus;
    if (input.caretHidden !== undefined && input.cursorVisible === undefined) output.cursorVisible = !input.caretHidden;
    if (input.editable !== undefined && input.enabled === undefined) output.enabled = input.editable;

    const inputType = mapKeyboardType(
        input.keyboardType as KeyboardTypeValue | undefined,
        input.secureTextEntry as boolean | undefined,
        input.multiline as boolean | undefined,
    );

    if (inputType !== undefined && input.inputType === undefined) output.inputType = inputType;

    const imeOptions = mapReturnKeyType(input.returnKeyType as ReturnKeyTypeValue | undefined);
    if (imeOptions !== undefined && input.imeOptions === undefined) output.imeOptions = imeOptions;

    return output;
}

function mapResizeMode(value?: ResizeModeValue): string | undefined {
    switch (value) {
        case 'cover': return 'centerCrop';
        case 'contain': return 'fitCenter';
        case 'stretch': return 'fitXY';
        case 'center': return 'center';
        default: return undefined;
    }
}

function mapImageSource(source?: ImageSource): number | undefined {
    if (typeof source === 'number') return source;
    if (source && typeof source === 'object') {
        if ('resource' in source && typeof source.resource === 'number') return source.resource;
        if ('androidResource' in source && typeof source.androidResource === 'number') return source.androidResource;
    }
    return undefined;
}

function mapImageProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.resizeMode !== undefined && input.scaleType === undefined) output.scaleType = mapResizeMode(input.resizeMode as ResizeModeValue | undefined);
    if (input.source !== undefined && input.imageResource === undefined) {
        const resource = mapImageSource(input.source as ImageSource | undefined);
        if (resource !== undefined) output.imageResource = resource;
    }
    return output;
}

function mapButtonProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.title !== undefined && input.text === undefined) output.text = input.title;
    return output;
}

function mapCompoundButtonProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.value !== undefined && input.checked === undefined) output.checked = input.value;
    return output;
}

function mapSwitchProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.thumbColor !== undefined && input.thumbTintColor === undefined) output.thumbTintColor = input.thumbColor;
    if (input.trackColor !== undefined && input.trackTintColor === undefined) output.trackTintColor = input.trackColor;
    return output;
}

function mapActivityIndicatorProps(input: HostProps): HostProps {
    const output: HostProps = {};
    if (input.animating !== undefined && input.indeterminate === undefined) output.indeterminate = input.animating;
    if (input.color !== undefined && input.progressTintColor === undefined) output.progressTintColor = input.color;
    if (input.hidesWhenStopped === true && input.animating === false) output.visibility = 'gone';
    return output;
}

function cleanUndefined(object: HostProps) {
    for (const key of Object.keys(object)) {
        if (object[key] === undefined) delete object[key];
    }
}

function normalizeProps<T extends { style?: StyleProp<RNStyle>; children?: React.ReactNode }>(
    props: T | null | undefined,
    mapper?: (input: HostProps) => HostProps,
): HostProps {
    if (!props) return {};

    const { style, children, ...rest } = props as T & { style?: StyleProp<RNStyle>; children?: React.ReactNode };
    const merged: HostProps = {
        ...flattenStyle(style),
        ...rest,
    };

    const normalized: HostProps = {
        ...merged,
        ...mapCommonProps(merged),
        ...mapLayoutProps(merged),
        ...(mapper ? mapper(merged) : {}),
    };

    cleanUndefined(normalized);

    delete normalized.visible;
    delete normalized.disabled;
    delete normalized.pointerEvents;
    delete normalized.display;
    delete normalized.opacity;
    delete normalized.translateX;
    delete normalized.translateY;
    delete normalized.translateZ;
    delete normalized.minWidth;
    delete normalized.minHeight;
    delete normalized.accessibilityLabel;
    delete normalized.testID;
    delete normalized.nativeID;
    delete normalized.position;
    delete normalized.top;
    delete normalized.bottom;
    delete normalized.left;
    delete normalized.right;
    delete normalized.marginStart;
    delete normalized.marginEnd;
    delete normalized.paddingStart;
    delete normalized.paddingEnd;
    delete normalized.flex;
    delete normalized.flexGrow;
    delete normalized.flexDirection;
    delete normalized.justifyContent;
    delete normalized.alignItems;
    delete normalized.alignSelf;
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

    if (children !== undefined) normalized.children = children;
    return normalized;
}

function createHostComponent<P extends { style?: StyleProp<RNStyle>; children?: React.ReactNode }>(
    type: string,
    mapper?: (input: HostProps) => HostProps,
) {
    const Component = (props: P) => React.createElement(type, normalizeProps(props, mapper));
    Component.displayName = type;
    return Component;
}

const mapViewLike = (input: HostProps) => input;
const mapTextLike = (input: HostProps) => mapTextProps(input);
const mapTextInputLike = (input: HostProps) => ({ ...mapTextProps(input), ...mapTextInputProps(input) });
const mapImageLike = (input: HostProps) => mapImageProps(input);
const mapButtonLike = (input: HostProps) => ({ ...mapTextProps(input), ...mapButtonProps(input) });
const mapCompoundButtonLike = (input: HostProps) => ({ ...mapTextProps(input), ...mapCompoundButtonProps(input) });
const mapSwitchLike = (input: HostProps) => ({ ...mapTextProps(input), ...mapCompoundButtonProps(input), ...mapSwitchProps(input) });
const mapProgressLike = (input: HostProps) => input;
const mapActivityIndicatorLike = (input: HostProps) => mapActivityIndicatorProps(input);
const mapSliderLike = (input: HostProps) => input;

export const View = createHostComponent<ViewProps>('View', mapViewLike);
export const LinearLayout = createHostComponent<ViewProps>('LinearLayout', mapViewLike);
export const FrameLayout = createHostComponent<FrameLayoutProps>('FrameLayout', mapViewLike);
export const RelativeLayout = createHostComponent<RelativeLayoutProps>('RelativeLayout', mapViewLike);
export const ScrollView = createHostComponent<ScrollViewProps>('ScrollView', mapViewLike);
export const HorizontalScrollView = createHostComponent<HorizontalScrollViewProps>('HorizontalScrollView', mapViewLike);
export const PlainView = createHostComponent<PlainViewProps>('PlainView', mapViewLike);

export const Text = createHostComponent<TextProps>('Text', mapTextLike);
export const TextView = createHostComponent<TextProps>('TextView', mapTextLike);
export const TextInput = createHostComponent<TextInputProps>('EditText', mapTextInputLike);
export const EditText = TextInput;
export const Button = createHostComponent<ButtonProps>('Button', mapButtonLike);

export const Image = createHostComponent<ImageProps>('ImageView', mapImageLike);
export const ImageView = Image;
export const ImageButton = createHostComponent<ImageProps>('ImageButton', mapImageLike);

export const ProgressBar = createHostComponent<ProgressBarProps>('ProgressBar', mapProgressLike);
export const ProgressBarHorizontal = createHostComponent<ProgressBarProps>('ProgressBarHorizontal', mapProgressLike);
export const ActivityIndicator = createHostComponent<ActivityIndicatorProps>('ProgressBar', mapActivityIndicatorLike);
export const Slider = createHostComponent<SliderProps>('SeekBar', mapSliderLike);
export const SeekBar = Slider;

export const Switch = createHostComponent<SwitchProps>('Switch', mapSwitchLike);
export const CheckBox = createHostComponent<CheckBoxProps>('CheckBox', mapCompoundButtonLike);
export const RadioButton = createHostComponent<RadioButtonProps>('RadioButton', mapCompoundButtonLike);
export const Space = createHostComponent<SpaceProps>('Space', mapViewLike);

export const HStack = (props: ViewProps) => React.createElement(View, normalizeProps({ ...props, flexDirection: 'row' }, mapViewLike));
HStack.displayName = 'HStack';

export const VStack = (props: ViewProps) => React.createElement(View, normalizeProps({ ...props, flexDirection: 'column' }, mapViewLike));
VStack.displayName = 'VStack';

export const Row = HStack;
export const Column = VStack;

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
    Button,
    Image,
    ImageView,
    ImageButton,
    ProgressBar,
    ProgressBarHorizontal,
    ActivityIndicator,
    Slider,
    SeekBar,
    Switch,
    CheckBox,
    RadioButton,
    Space,
    HStack,
    VStack,
    Row,
    Column,
};