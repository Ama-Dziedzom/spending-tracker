import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Spinner } from './loaders';
import { Text } from './text';
import { Tap } from './tap';

type Variant = 'primary' | 'secondary' | 'ink' | 'danger' | 'dangerSoft' | 'ghost';

interface ButtonProps {
    label: string;
    onPress: () => void;
    /**
     * primary   – brand/accent fill, white label (main CTA).
     * secondary – bg/muted fill, text/primary label (safe choice, "Keep").
     * ink       – brand/ink-button (navy; inverts in dark), e.g. "Check", "Discard".
     * danger    – status/danger, only for destructive confirmation.
     * dangerSoft – status/danger-tint fill, status/danger label ("Delete" on Transaction detail).
     * ghost     – no fill, brand/accent-text label ("Edit first" on Paste · read).
     */
    variant?: Variant;
    /**
     * 'xl' = 16pt, 52 tall (Welcome, sign-in); 'lg' = 15pt, 50 tall (full-width CTAs);
     * 'md' / 'sm' = 13pt, 44 tall (dialogs, inline). Nothing is shorter than 44 for a good thumb fit.
     */
    size?: 'xl' | 'lg' | 'md' | 'sm';
    icon?: IconName;
    busy?: boolean;
    /** Label shown while busy, e.g. "Sending code". */
    busyLabel?: string;
    disabled?: boolean;
    fill?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function Button({
    label, onPress, variant = 'primary', size = 'lg', icon, busy, busyLabel, disabled, fill, style,
}: ButtonProps) {
    const { colors } = useTheme();
    const palette = {
        primary: { bg: colors.brand.accent, fg: colors.brand['on-accent'] },
        secondary: { bg: colors.bg.muted, fg: colors.text.primary },
        ink: { bg: colors.brand['ink-button'], fg: colors.brand['on-ink-button'] },
        danger: { bg: colors.status.danger, fg: colors.brand['on-accent'] },
        dangerSoft: { bg: colors.status['danger-tint'], fg: colors.status.danger },
        ghost: { bg: 'transparent', fg: colors.brand['accent-text'] },
    }[variant];
    const pad = { xl: { v: 16, h: 20, font: 16 }, lg: { v: 15, h: 20, font: 15 }, md: { v: 10, h: 16, font: 13 }, sm: { v: 9, h: 16, font: 13 } }[size];
    const inactive = disabled || busy;

    return (
        <Tap
            onPress={onPress}
            disabled={inactive}
            hitSlop={size === 'lg' || size === 'xl' ? undefined : HIT_SLOP}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled, busy: !!busy }}
            accessibilityLabel={busy && busyLabel ? busyLabel : label}
            style={({ pressed }) => [
                {
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: palette.bg,
                    paddingVertical: pad.v, paddingHorizontal: pad.h,
                    borderRadius: 999,
                    minHeight: size === 'xl' ? 52 : size === 'lg' ? 50 : 44,
                    opacity: busy ? 0.85 : disabled ? 0.5 : pressed ? 0.85 : 1,
                },
                fill && { flex: 1 },
                style,
            ]}
        >
            {busy && variant === 'primary' && <Spinner size={18} color={palette.fg} />}
            {!busy && icon && <Icon name={icon} size={size === 'lg' || size === 'xl' ? 18 : 16} color={palette.fg} />}
            <Text weight="bold" size={pad.font} style={{ color: palette.fg }}>
                {busy && busyLabel ? busyLabel : label}
            </Text>
        </Tap>
    );
}

interface ChipProps {
    label: string;
    icon?: IconName;
    onPress?: () => void;
    /**
     * shortcut – bg/surface with a small shadow (Log cash / Paste a message / Set salary).
     * muted    – bg/muted (answer source "From 14 transactions").
     * tag      – tinted status/category tag (e.g. "42 less than last week").
     */
    variant?: 'shortcut' | 'muted' | 'tag';
    /** Share a row's width equally with its siblings (Spending shortcuts). */
    fill?: boolean;
    /** For 'tag': the tone. */
    tone?: 'success' | 'warn' | 'danger' | 'accent' | 'neutral';
    trailingChevron?: boolean;
}

export function Chip({ label, icon, onPress, variant = 'shortcut', tone = 'neutral', trailingChevron, fill }: ChipProps) {
    const { colors, shadows } = useTheme();

    let bg = colors.bg.surface;
    let fg = colors.text.primary;
    let iconColor = colors.brand['accent-text'];
    if (variant === 'muted') {
        bg = colors.bg.muted; fg = colors.text.secondary; iconColor = colors.text.secondary;
    } else if (variant === 'tag') {
        const t = {
            success: [colors.status['success-tint'], colors.status.success],
            warn: [colors.status['warn-tint'], colors.status.warn],
            danger: [colors.status['danger-tint'], colors.status.danger],
            accent: [colors.brand['accent-tint'], colors.brand['accent-text']],
            neutral: [colors.bg.muted, colors.text.secondary],
        }[tone];
        bg = t[0]; fg = t[1]; iconColor = t[1];
    }

    const body = (
        <View
            style={[
                { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: bg },
                variant === 'shortcut' && { paddingLeft: 11, paddingRight: 12, paddingVertical: 10, ...shadows.small },
                variant === 'muted' && { paddingLeft: 10, paddingRight: 12, paddingVertical: 7, gap: 6 },
                variant === 'tag' && { paddingHorizontal: 10, paddingVertical: 6 },
                // Anything you can tap is at least 44 tall for a good thumb fit.
                !!onPress && { minHeight: 44, paddingVertical: 0 },
                fill && { justifyContent: 'center', paddingLeft: 8, paddingRight: 8 },
            ]}
        >
            {icon && <Icon name={icon} size={variant === 'shortcut' ? 16 : 14} color={iconColor} />}
            <Text
                size={variant === 'shortcut' ? 13 : 12}
                weight={variant === 'tag' ? 'bold' : 'semibold'}
                style={{ color: fg }}
            >
                {label}
            </Text>
            {trailingChevron && <Icon name="next" size={12} color={fg} />}
        </View>
    );

    if (!onPress) return body;
    return (
        <Tap onPress={onPress} hitSlop={HIT_SLOP} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, ...(fill ? { flex: 1 } : {}) })}>
            {body}
        </Tap>
    );
}
