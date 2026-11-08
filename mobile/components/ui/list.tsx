import React from 'react';
import { Pressable, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { RADIUS, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon } from './icon';
import { Text } from './text';

/** 11 Bold uppercase label above a group. On the band it's white at 75 %. */
export function SectionLabel({ children, onBand }: { children: string; onBand?: boolean }) {
    return (
        <Text
            variant="sectionLabel"
            tone="tertiary"
            style={[{ marginLeft: 0 }, onBand && { color: RAW.onBandTertiary }]}
        >
            {children}
        </Text>
    );
}

/**
 * Grouped list on a surface card: rows separated by line/default dividers.
 * Pass ListRow children; dividers are added between them.
 */
export function ListGroup({ children, label, labelOnBand, style, bare }: {
    children: React.ReactNode;
    label?: string;
    labelOnBand?: boolean;
    style?: StyleProp<ViewStyle>;
    /** No card background (rows sit inside another card or sheet). */
    bare?: boolean;
}) {
    const { colors, shadows } = useTheme();
    const rows = React.Children.toArray(children).filter(Boolean);
    return (
        <View style={{ gap: 6 }}>
            {label && <SectionLabel onBand={labelOnBand}>{label}</SectionLabel>}
            <View
                style={[
                    !bare && { backgroundColor: colors.bg.surface, borderRadius: RADIUS.card, paddingHorizontal: 16, paddingVertical: 4, ...shadows.card },
                    style,
                ]}
            >
                {rows.map((row, i) => (
                    <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line.default } : undefined}>
                        {row}
                    </View>
                ))}
            </View>
        </View>
    );
}

interface ListRowProps {
    /** Leading tile (CategoryTile) or avatar. */
    leading?: React.ReactNode;
    title: string;
    meta?: string;
    /** Right-hand value: amount ("85.00", "+200.00") or a status word ("On"). */
    value?: string;
    valueTone?: 'primary' | 'secondary' | 'success';
    /** Amounts are 15 SemiBold; settings values are 13 Medium. */
    valueStyle?: 'amount' | 'setting';
    trailing?: 'chevron' | 'none' | React.ReactNode;
    toggle?: { value: boolean; onChange: (v: boolean) => void };
    onPress?: () => void;
    /** Vertical padding: 11 for transaction rows, 9 for settings. */
    dense?: boolean;
    accessibilityLabel?: string;
}

/** Tile, title, meta, value, chevron or toggle. Min height 44. Text wraps. */
export function ListRow({
    leading, title, meta, value, valueTone = 'primary', valueStyle = 'amount',
    trailing = 'none', toggle, onPress, dense, accessibilityLabel,
}: ListRowProps) {
    const { colors } = useTheme();
    const valueColor = valueTone === 'success' ? colors.status.success : valueTone === 'secondary' ? colors.text.secondary : colors.text.primary;

    const body = (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: dense ? 9 : 11, minHeight: 44 }}>
            {leading}
            <View style={{ flex: 1, gap: 1 }}>
                <Text variant="row">{title}</Text>
                {meta && <Text variant="meta" tone="secondary">{meta}</Text>}
            </View>
            {value !== undefined && (
                valueStyle === 'amount'
                    ? <Text weight="semibold" size={15} style={{ color: valueColor }}>{value}</Text>
                    : <Text weight="medium" size={13} style={{ color: valueColor }}>{value}</Text>
            )}
            {toggle && (
                <Switch
                    value={toggle.value}
                    onValueChange={toggle.onChange}
                    trackColor={{ false: colors.bg.muted, true: colors.brand.accent }}
                    thumbColor={colors.brand['on-accent']}
                    ios_backgroundColor={colors.bg.muted}
                    accessibilityLabel={title}
                />
            )}
            {trailing === 'chevron' && <Icon name="next" size={16} color={colors.text.tertiary} />}
            {trailing !== 'chevron' && trailing !== 'none' && trailing}
        </View>
    );

    if (!onPress) return body;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? [title, meta, value].filter(Boolean).join(', ')}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
            {body}
        </Pressable>
    );
}

/** Day header in transaction lists: "Today" left, "251.00 out" right. */
export function ListDayHeader({ title, summary }: { title: string; summary?: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 }}>
            <Text variant="row" weight="bold">{title}</Text>
            {summary && <Text variant="meta" weight="semibold" tone="tertiary">{summary}</Text>}
        </View>
    );
}
