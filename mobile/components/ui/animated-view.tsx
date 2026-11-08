import type React from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import Animated, { type EntryExitAnimationFunction, type BaseAnimationBuilder } from 'react-native-reanimated';

type Layout = BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction;

/**
 * Reanimated 4's Animated.View props don't resolve in this project's TS setup
 * (existing screens cast with `as any`, e.g. app/sms-settings.tsx). This keeps
 * the workaround in one place with the props we actually use.
 */
export const AnimatedView = Animated.View as unknown as React.ComponentType<
    Omit<ViewProps, 'style'> & {
        style?: StyleProp<ViewStyle> | StyleProp<ViewStyle>[] | object;
        entering?: Layout;
        exiting?: Layout;
    }
>;
