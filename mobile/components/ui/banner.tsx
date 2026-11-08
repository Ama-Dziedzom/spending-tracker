import React from 'react';
import { Pressable, View } from 'react-native';
import { HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Tone = 'info' | 'warn' | 'success' | 'danger';

const DEFAULT_ICON: Record<Tone, IconName> = { info: 'check', warn: 'flash', success: 'receive', danger: 'alert' };

interface BannerProps {
    tone?: Tone;
    icon?: IconName;
    title: string;
    body?: string;
    action?: { label: string; onPress: () => void };
}

/**
 * Persistent, non-blocking state that sits in the flow at the top of a list.
 * Tinted fill, coloured icon, 14 Bold title, 12 body, action link.
 */
export function Banner({ tone = 'info', icon, title, body, action }: BannerProps) {
    const { colors } = useTheme();
    const map = {
        info: { bg: colors.brand['accent-tint'], fg: colors.brand['accent-text'] },
        warn: { bg: colors.status['warn-tint'], fg: colors.status.warn },
        success: { bg: colors.status['success-tint'], fg: colors.status.success },
        danger: { bg: colors.status['danger-tint'], fg: colors.status.danger },
    }[tone];
    // Action links are blue, except on danger banners where they match the tone.
    const actionColor = tone === 'danger' ? colors.status.danger : colors.brand['accent-text'];

    return (
        <View
            accessibilityRole={tone === 'danger' ? 'alert' : undefined}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 18, backgroundColor: map.bg }}
        >
            <Icon name={icon ?? DEFAULT_ICON[tone]} size={20} color={map.fg} />
            <View style={{ flex: 1, gap: 2 }}>
                <Text variant="row" weight="bold">{title}</Text>
                {body && <Text variant="meta" tone="secondary">{body}</Text>}
                {action && (
                    <Pressable onPress={action.onPress} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityRole="button">
                        <Text size={13} weight="bold" style={{ color: actionColor }}>{action.label}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

/**
 * Surface row with a tinted tile and an ink button, e.g. "2 messages to check · Check".
 * Used on Spending to open the Check queue.
 */
export function ActionBanner({ icon, tone = 'warn', title, body, actionLabel, onPress }: {
    icon: IconName; tone?: 'warn' | 'accent'; title: string; body?: string; actionLabel: string; onPress: () => void;
}) {
    const { colors, shadows } = useTheme();
    const tile = tone === 'warn'
        ? { bg: colors.status['warn-tint'], fg: colors.status.warn }
        : { bg: colors.brand['accent-tint'], fg: colors.brand['accent-text'] };
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderRadius: 24, backgroundColor: colors.bg.surface, ...shadows.card }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={20} color={tile.fg} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
                <Text variant="row" weight="bold">{title}</Text>
                {body && <Text variant="meta" tone="secondary">{body}</Text>}
            </View>
            <Pressable
                onPress={onPress}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                style={({ pressed }) => ({ backgroundColor: colors.brand['ink-button'], borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, opacity: pressed ? 0.85 : 1 })}
            >
                <Text size={13} weight="bold" style={{ color: colors.brand['on-ink-button'] }}>{actionLabel}</Text>
            </Pressable>
        </View>
    );
}

/** "Offline · 2 alerts will log when you're back". Sits on the band above the first card. */
export function OfflinePill({ label }: { label: string }) {
    const { colors } = useTheme();
    return (
        <View
            accessibilityRole="alert"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.bg.surface }}
        >
            <Icon name="wifiOff" size={16} color={colors.status.warn} />
            <Text variant="meta" weight="semibold" style={{ flex: 1 }}>{label}</Text>
        </View>
    );
}

/** Field error under an input: info icon + how to fix it, in status/danger. */
export function FieldError({ message }: { message: string }) {
    const { colors } = useTheme();
    return (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={14} color={colors.status.danger} />
            <Text variant="meta" style={{ flex: 1, color: colors.status.danger }}>{message}</Text>
        </View>
    );
}
