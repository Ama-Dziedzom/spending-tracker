import React, { useState } from 'react';
import { Pressable, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

type TapStyle = StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);

interface TapProps extends Omit<PressableProps, 'style'> {
    style?: TapStyle;
}

/**
 * Pressable that works under NativeWind. NativeWind's JSX interop drops a
 * style *function* on Pressable (`style={({ pressed }) => …}`), which left
 * buttons with no fill, no padding and no centring. Tap tracks the pressed
 * state itself and always passes a plain style, so the same function works.
 */
export function Tap({ style, onPressIn, onPressOut, ...rest }: TapProps) {
    const [pressed, setPressed] = useState(false);
    const resolved = typeof style === 'function' ? style({ pressed, hovered: false } as PressableStateCallbackType) : style;
    return (
        <Pressable
            {...rest}
            onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
            onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
            style={resolved}
        />
    );
}
