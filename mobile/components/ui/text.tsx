import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { FONT, RAW, TYPE } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

export type TextVariant = keyof typeof TYPE;
type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warn' | 'danger' | 'onAccent' | 'onInverse' | 'onBand';

interface Props extends TextProps {
    variant?: TextVariant;
    tone?: TextTone;
    /** Override the variant's weight. */
    weight?: keyof typeof FONT;
    size?: number;
    align?: TextStyle['textAlign'];
}

/**
 * Text using the v1 type roles (TYPE) and colour tokens. Wraps by default;
 * nothing is truncated unless a caller sets numberOfLines (handoff §12.2).
 */
export function Text({ variant = 'body', tone = 'primary', weight, size, align, style, ...rest }: Props) {
    const { colors } = useTheme();
    const color = {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        tertiary: colors.text.tertiary,
        accent: colors.brand['accent-text'],
        success: colors.status.success,
        warn: colors.status.warn,
        danger: colors.status.danger,
        onAccent: colors.brand['on-accent'],
        onInverse: colors.text['on-inverse'],
        onBand: RAW.onBand,
    }[tone];
    return (
        <RNText
            {...rest}
            style={[
                TYPE[variant],
                { color },
                weight && { fontFamily: FONT[weight] },
                size !== undefined && { fontSize: size },
                align && { textAlign: align },
                style,
            ]}
        />
    );
}
