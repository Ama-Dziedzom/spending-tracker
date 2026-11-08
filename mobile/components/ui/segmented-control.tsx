import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

interface Props<T extends string> {
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    /**
     * 'block' – full-width, radius 14, 13pt (Today / This week / This month).
     * 'pill'  – compact, fully rounded, 12pt (Light / Dark / Auto).
     */
    variant?: 'block' | 'pill';
}

export function SegmentedControl<T extends string>({ options, value, onChange, variant = 'block' }: Props<T>) {
    const { colors, shadows } = useTheme();
    const block = variant === 'block';

    return (
        <View
            accessibilityRole="tablist"
            style={{
                flexDirection: 'row',
                backgroundColor: colors.bg.muted,
                borderRadius: block ? 14 : 999,
                padding: block ? 4 : 3,
                gap: block ? 0 : 2,
                alignSelf: block ? 'stretch' : 'flex-start',
            }}
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                            if (!active) {
                                Haptics.selectionAsync().catch(() => {});
                                onChange(o.value);
                            }
                        }}
                        // 36/32 visual + hitSlop keeps the tap target ≥ 44
                        hitSlop={{ top: 4, bottom: 4 }}
                        style={[
                            {
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8,
                                paddingHorizontal: block ? 0 : 12,
                                borderRadius: block ? 11 : 999,
                            },
                            block && { flex: 1 },
                            active && {
                                backgroundColor: block ? colors.bg.raised : colors.bg.surface,
                                ...shadows.small,
                            },
                        ]}
                    >
                        <Text
                            size={block ? 13 : 12}
                            weight={active ? 'bold' : 'semibold'}
                            tone={active ? 'primary' : 'secondary'}
                        >
                            {o.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
