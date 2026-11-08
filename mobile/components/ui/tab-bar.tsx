import React from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/** Route name → icon. Spending is the `index` route. */
const TAB_ICONS: Record<string, IconName> = {
    index: 'pieChart',
    wallets: 'wallet',
    insights: 'insights',
};

/**
 * Hidden routes that live under a tab, so the bar stays visible and that tab
 * stays highlighted (handoff §6: Transactions keeps Spending highlighted).
 */
const TAB_PARENT: Record<string, string> = {
    transactions: 'index',
};

/** Space to leave below scroll content so it clears the floating bar. */
export const TAB_BAR_SPACE = 100;

interface Props extends BottomTabBarProps {
    /** Opens the Add sheet. */
    onAdd: () => void;
}

/**
 * Floating pill tab bar (Spending, Wallets, Insights) plus the round Add
 * button. Use as `tabBar={(p) => <FloatingTabBar {...p} onAdd={…} />}`.
 * Routes not in TAB_ICONS are hidden.
 */
export function FloatingTabBar({ state, descriptors, navigation, onAdd }: Props) {
    const { colors, shadows } = useTheme();
    const insets = useSafeAreaInsets();
    const currentName = state.routes[state.index]?.name;
    const activeTab = TAB_PARENT[currentName] ?? currentName;

    return (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}
        >
            <View
                accessibilityRole="tablist"
                style={{
                    flexDirection: 'row', gap: 2, padding: 6, borderRadius: 999,
                    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.line.default, ...shadows.tabBar,
                }}
            >
                {state.routes.map((route, index) => {
                    const icon = TAB_ICONS[route.name];
                    if (!icon) return null;
                    const { options } = descriptors[route.key];
                    const label = (options.title ?? route.name) as string;
                    const focused = route.name === activeTab;
                    const onTabRoot = state.index === index;
                    const color = focused ? colors.brand['accent-text'] : colors.text.secondary;

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: focused }}
                            accessibilityLabel={label}
                            onPress={() => {
                                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                                // From Transactions, tapping Spending goes back to Spending.
                                if (!onTabRoot && !e.defaultPrevented) {
                                    Haptics.selectionAsync().catch(() => {});
                                    navigation.navigate(route.name, route.params);
                                }
                            }}
                            style={{
                                alignItems: 'center', gap: 3, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
                                backgroundColor: focused ? colors.brand['accent-tint'] : 'transparent',
                            }}
                        >
                            <Icon name={icon} size={22} color={color} />
                            <Text variant="tabLabel" weight={focused ? 'bold' : 'semibold'} style={{ color }}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onAdd(); }}
                accessibilityRole="button"
                accessibilityLabel="Add"
                style={({ pressed }) => ({
                    width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: colors.brand.accent, opacity: pressed ? 0.9 : 1, ...shadows.fab,
                })}
            >
                <Icon name="plus" size={24} color={colors.brand['on-accent']} />
            </Pressable>
        </View>
    );
}
