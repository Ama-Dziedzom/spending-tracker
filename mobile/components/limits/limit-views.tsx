import React from 'react';
import { View } from 'react-native';
import { Card, CategoryTile, Icon, ProgressMeter, Tap, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { Limit, LimitStatus } from '@/lib/limits';
import { categoryStyle } from '@/lib/category-style';
import { cedis } from '@/lib/money-window';

/** Meter colour: the category's own colour, status/warn once over (never danger). */
function useMeterColor(category: string, over: boolean) {
    const { colors } = useTheme();
    if (over) return colors.status.warn;
    const tone = categoryStyle(category).tone;
    return tone === 'muted' ? colors.text.tertiary : colors.cat[tone];
}

/**
 * Weekly limit card on an insight (Figma 1044:5105, 1044:5317). Spent, the
 * limit, what's left and a per-day hint so the number is usable. Over is
 * amber with no shame: "It happens."
 */
export function LimitCard({ limit, status, onEdit }: { limit: Limit; status: LimitStatus; onEdit: () => void }) {
    const { colors } = useTheme();
    const over = status.over > 0;
    const color = useMeterColor(limit.category, over);
    return (
        <Card gap={10}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shield" size={16} color={color} />
                <Text size={13} weight="bold" style={{ flex: 1 }}>Weekly limit</Text>
                <Tap onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit limit" hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
                    <Text size={13} weight="bold" tone="accent">Edit</Text>
                </Tap>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text size={17} weight="bold">GHS {cedis(status.spent)}</Text>
                <Text size={12} tone="secondary">of {cedis(limit.amount)}</Text>
                <View style={{ flex: 1 }} />
                <Text size={12} weight="semibold" style={{ color: over ? colors.status.warn : colors.text.secondary }}>
                    {over ? `GHS ${cedis(status.over)} over` : `GHS ${cedis(status.left)} left`}
                </Text>
            </View>
            <ProgressMeter progress={status.used} color={color} height={8} />
            <Text variant="meta" tone="tertiary">
                {over
                    ? `It happens. Resets ${status.resetsOn}, or raise the limit if this week was unusual.`
                    : `Resets ${status.resetsOn}. About GHS ${cedis(status.perDay)} a day left.`}
            </Text>
        </Card>
    );
}

/** One row on the Limits screen (Figma 1044:5436): same meter everywhere. */
export function LimitRow({ limit, status, onPress, divider }: { limit: Limit; status: LimitStatus; onPress: () => void; divider?: boolean }) {
    const { colors } = useTheme();
    const over = status.over > 0;
    const color = useMeterColor(limit.category, over);
    const s = categoryStyle(limit.category);
    return (
        <Tap
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${s.label}, GHS ${cedis(status.spent)} of ${cedis(limit.amount)}, ${over ? `${cedis(status.over)} over` : `${cedis(status.left)} left`}`}
            style={[{ gap: 8, paddingVertical: 12 }, divider ? { borderTopWidth: 1, borderTopColor: colors.line.default } : null]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CategoryTile tone={s.tone} icon={s.icon} size={32} />
                <Text size={14} weight="semibold" style={{ flex: 1 }}>{s.label}</Text>
                <Text size={12} weight="bold" style={{ color: over ? colors.status.warn : colors.text.secondary }}>
                    {over ? `GHS ${cedis(status.over)} over` : `GHS ${cedis(status.left)} left`}
                </Text>
            </View>
            <ProgressMeter progress={status.used} color={color} height={8} />
            <Text size={12} weight="medium" tone="tertiary">GHS {cedis(status.spent)} of {cedis(limit.amount)}</Text>
        </Tap>
    );
}
