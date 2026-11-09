import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { RADIUS, SPACE } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';
import { Tap } from './tap';

interface CardProps {
    children: React.ReactNode;
    /** Hero cards (Spending, Transactions list) use 18 padding and radius 28; default 16 / 24. */
    hero?: boolean;
    padding?: number;
    gap?: number;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

/** bg/surface card, radius 24, soft shadow in light mode only. */
export function Card({ children, hero, padding, gap, onPress, style }: CardProps) {
    const { colors, shadows } = useTheme();
    const base: ViewStyle = {
        backgroundColor: colors.bg.surface,
        borderRadius: hero ? 28 : RADIUS.card,
        padding: padding ?? (hero ? 18 : SPACE.cardPadding),
        gap,
        ...shadows.card,
    };
    if (onPress) {
        return (
            <Tap onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
                {children}
            </Tap>
        );
    }
    return <View style={[base, style]}>{children}</View>;
}

/** Card title row: 17 Bold title, optional right action. */
export function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="cardTitle">{title}</Text>
            {right}
        </View>
    );
}

/** Muted inset panel inside a card (e.g. "Wednesday was your big day…", "GHS 200 came in"). */
export function InsetPanel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    const { colors } = useTheme();
    return (
        <View style={[{ backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
            {children}
        </View>
    );
}
