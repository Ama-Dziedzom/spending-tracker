import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

/** Opacity for past periods (handoff §3 "Charts"). Tints are never used for bars. */
export const PAST_OPACITY = 0.3;

export interface DayBar {
    /** "M", "T", … */
    label: string;
    /** null = in the future (drawn as an empty muted bar). */
    value: number | null;
    current?: boolean;
}

interface DayBarsProps {
    bars: DayBar[];
    /** Tallest bar height. Figma: 92. */
    maxHeight?: number;
    /** Bar colour; brand/accent by default, cat/* on category screens. */
    color?: string;
    /** Opacity for bars before the current one. */
    pastOpacity?: number;
    onPressBar?: (index: number) => void;
    /** Format the value above each bar. */
    format?: (v: number) => string;
}

/**
 * Vertical day bars (Spending · This week). Value on top, day letter below.
 * The current bar is solid; past bars use pastOpacity; future/zero bars are
 * short bg/muted stubs.
 */
export function DayBars({
    bars, maxHeight = 92, color, pastOpacity = PAST_OPACITY, onPressBar, format = (v) => String(Math.round(v)),
}: DayBarsProps) {
    const { colors } = useTheme();
    const fill = color ?? colors.brand.accent;
    const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
    const currentIndex = bars.findIndex((b) => b.current);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {bars.map((b, i) => {
                const has = b.value !== null && b.value > 0;
                const h = has ? Math.max(15, (b.value! / max) * maxHeight) : 10;
                const isPast = currentIndex >= 0 && i < currentIndex;
                const label = `${b.label}${has ? `, ${format(b.value!)}` : ''}`;
                const bar = (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                        <Text size={11} weight={b.current ? 'bold' : 'semibold'} tone={b.current ? 'primary' : 'tertiary'}>
                            {has ? format(b.value!) : ' '}
                        </Text>
                        <View
                            style={{
                                width: 34, height: h, borderRadius: 10,
                                backgroundColor: has ? fill : colors.bg.muted,
                                opacity: has && isPast ? pastOpacity : 1,
                            }}
                        />
                        <Text size={12} weight={b.current ? 'bold' : 'semibold'} tone={b.current ? 'primary' : 'tertiary'}>
                            {b.label}
                        </Text>
                    </View>
                );
                return onPressBar && has ? (
                    <Pressable key={i} onPress={() => onPressBar(i)} accessibilityRole="button" accessibilityLabel={label}>
                        {bar}
                    </Pressable>
                ) : (
                    <View key={i} accessible accessibilityLabel={label}>{bar}</View>
                );
            })}
        </View>
    );
}

export interface HBar {
    label: string;
    value: number;
    current?: boolean;
    /** Right-hand text; defaults to the value. */
    display?: string;
}

/**
 * Horizontal comparison bars (Ask answers, month compare, rankings).
 * Current row solid and bold; others at pastOpacity.
 */
export function HBars({ rows, color, pastOpacity = PAST_OPACITY, labelWidth = 30 }: {
    rows: HBar[]; color?: string; pastOpacity?: number; labelWidth?: number;
}) {
    const { colors } = useTheme();
    const fill = color ?? colors.brand.accent;
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <View style={{ gap: 12 }}>
            {rows.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${r.label}, ${r.display ?? r.value}`}>
                    <Text size={12} weight={r.current ? 'bold' : 'semibold'} tone={r.current ? 'primary' : 'tertiary'} style={{ width: labelWidth }}>
                        {r.label}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <View style={{ width: `${(r.value / max) * 100}%`, height: 10, borderRadius: 5, backgroundColor: fill, opacity: r.current ? 1 : pastOpacity }} />
                    </View>
                    <Text size={13} weight={r.current ? 'bold' : 'semibold'} tone={r.current ? 'primary' : 'secondary'}>
                        {r.display ?? String(r.value)}
                    </Text>
                </View>
            ))}
        </View>
    );
}
