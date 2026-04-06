import React from 'react';
export type LayoutSize = number | `${number}dp` | `${number}px` | `${number}sp` | 'match_parent' | 'match' | 'fill_parent' | 'fill' | 'wrap_content' | 'wrap';
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
export type ImageSource = number | {
    resource: number;
} | {
    androidResource: number;
};
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
export interface ViewStyle extends LayoutStyle, TransformStyle {
}
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
export interface ViewProps extends CommonViewProps {
}
export interface FrameLayoutProps extends CommonViewProps {
}
export interface RelativeLayoutProps extends CommonViewProps {
}
export interface PlainViewProps extends CommonViewProps {
}
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
export interface HorizontalScrollViewProps extends ScrollViewProps {
}
export interface CheckBoxProps extends CompoundButtonProps {
}
export interface RadioButtonProps extends CompoundButtonProps {
}
export interface SpaceProps extends CommonViewProps {
}
export type RNStyle = ViewStyle | TextStyle | ImageStyle;
export declare const View: {
    (props: ViewProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const LinearLayout: {
    (props: ViewProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const FrameLayout: {
    (props: FrameLayoutProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const RelativeLayout: {
    (props: RelativeLayoutProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ScrollView: {
    (props: ScrollViewProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const HorizontalScrollView: {
    (props: HorizontalScrollViewProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const PlainView: {
    (props: PlainViewProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Text: {
    (props: TextProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const TextView: {
    (props: TextProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const TextInput: {
    (props: TextInputProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const EditText: {
    (props: TextInputProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Button: {
    (props: ButtonProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Image: {
    (props: ImageProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ImageView: {
    (props: ImageProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ImageButton: {
    (props: ImageProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ProgressBar: {
    (props: ProgressBarProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ProgressBarHorizontal: {
    (props: ProgressBarProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const ActivityIndicator: {
    (props: ActivityIndicatorProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Slider: {
    (props: SliderProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const SeekBar: {
    (props: SliderProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Switch: {
    (props: SwitchProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const CheckBox: {
    (props: CheckBoxProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const RadioButton: {
    (props: RadioButtonProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const Space: {
    (props: SpaceProps): React.DOMElement<HostProps, Element>;
    displayName: string;
};
export declare const HStack: {
    (props: ViewProps): React.FunctionComponentElement<ViewProps>;
    displayName: string;
};
export declare const VStack: {
    (props: ViewProps): React.FunctionComponentElement<ViewProps>;
    displayName: string;
};
export declare const Row: {
    (props: ViewProps): React.FunctionComponentElement<ViewProps>;
    displayName: string;
};
export declare const Column: {
    (props: ViewProps): React.FunctionComponentElement<ViewProps>;
    displayName: string;
};
declare const _default: {
    View: {
        (props: ViewProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    LinearLayout: {
        (props: ViewProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    FrameLayout: {
        (props: FrameLayoutProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    RelativeLayout: {
        (props: RelativeLayoutProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ScrollView: {
        (props: ScrollViewProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    HorizontalScrollView: {
        (props: HorizontalScrollViewProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    PlainView: {
        (props: PlainViewProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Text: {
        (props: TextProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    TextView: {
        (props: TextProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    TextInput: {
        (props: TextInputProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    EditText: {
        (props: TextInputProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Button: {
        (props: ButtonProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Image: {
        (props: ImageProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ImageView: {
        (props: ImageProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ImageButton: {
        (props: ImageProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ProgressBar: {
        (props: ProgressBarProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ProgressBarHorizontal: {
        (props: ProgressBarProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    ActivityIndicator: {
        (props: ActivityIndicatorProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Slider: {
        (props: SliderProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    SeekBar: {
        (props: SliderProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Switch: {
        (props: SwitchProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    CheckBox: {
        (props: CheckBoxProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    RadioButton: {
        (props: RadioButtonProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    Space: {
        (props: SpaceProps): React.DOMElement<HostProps, Element>;
        displayName: string;
    };
    HStack: {
        (props: ViewProps): React.FunctionComponentElement<ViewProps>;
        displayName: string;
    };
    VStack: {
        (props: ViewProps): React.FunctionComponentElement<ViewProps>;
        displayName: string;
    };
    Row: {
        (props: ViewProps): React.FunctionComponentElement<ViewProps>;
        displayName: string;
    };
    Column: {
        (props: ViewProps): React.FunctionComponentElement<ViewProps>;
        displayName: string;
    };
};
export default _default;
