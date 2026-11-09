import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { HIT_SLOP, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { Tap } from './tap';

interface RoundButtonProps {
    icon: IconName;
    onPress: () => void;
    /** Screen-reader label; required for icon-only buttons (handoff §12.3). */
    label: string;
    /** 'band' = translucent white on the blue band; 'card' = bg/muted inside a card. */
    tone?: 'band' | 'card';
    size?: number;
}

/** 38px round icon button (34 inside cards). hitSlop brings it to 44×44. */
export function RoundButton({ icon, onPress, label, tone = 'band', size }: RoundButtonProps) {
    const { colors } = useTheme();
    const d = size ?? (tone === 'band' ? 38 : 34);
    return (
        <Tap
            onPress={onPress}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                width: d,
                height: d,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tone === 'band' ? RAW.onBandFill : colors.bg.muted,
                opacity: pressed ? 0.7 : 1,
            })}
        >
            <Icon name={icon} size={tone === 'band' ? 20 : 18} color={tone === 'band' ? RAW.onBand : colors.text.primary} />
        </Tap>
    );
}

interface TopBarProps {
    title?: string;
    subtitle?: string;
    /** 'back' (default), 'close', or 'none'. */
    leading?: 'back' | 'close' | 'none';
    onLeading?: () => void;
    /** Custom left content (e.g. avatar + greeting on Spending). Replaces leading + title. */
    left?: React.ReactNode;
    right?: React.ReactNode;
}

/** Header on the blue band: back/close, 24 Bold title, optional right action. */
export function TopBar({ title, subtitle, leading = 'back', onLeading, left, right }: TopBarProps) {
    return (
        <View style={{ height: 40, marginTop: 10, marginBottom: 18, marginHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {left ?? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                    {leading !== 'none' && (
                        <RoundButton
                            icon={leading === 'close' ? 'close' : 'back'}
                            label={leading === 'close' ? 'Close' : 'Back'}
                            onPress={onLeading ?? (() => router.back())}
                        />
                    )}
                    {title && (
                        <View style={{ flexShrink: 1 }}>
                            <Text variant={subtitle ? 'cardTitle' : 'screenTitle'} tone="onBand">{title}</Text>
                            {subtitle && <Text variant="meta" weight="semibold" style={{ color: RAW.onBandTertiary }}>{subtitle}</Text>}
                        </View>
                    )}
                </View>
            )}
            {right}
        </View>
    );
}

/** Translucent pill action on the band, e.g. "Search" on Transactions. */
export function BandPill({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
    return (
        <Tap
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, minHeight: 44,
                borderRadius: 999, backgroundColor: RAW.onBandFill, opacity: pressed ? 0.7 : 1,
            })}
            hitSlop={HIT_SLOP}
        >
            <Icon name={icon} size={16} color={RAW.onBand} />
            <Text variant="row" size={13} weight="bold" tone="onBand">{label}</Text>
        </Tap>
    );
}
