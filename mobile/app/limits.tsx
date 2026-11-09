import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Icon, Screen, Skeleton, SkeletonRow, Tap, Text, TopBar } from '@/components/ui';
import { LimitRow } from '@/components/limits/limit-views';
import { SetLimitSheet } from '@/components/limits/set-limit-sheet';
import { useTheme } from '@/lib/theme';
import { getLimits, limitStatus, usualWeekly, WEEKDAYS, type Limit } from '@/lib/limits';
import { loadMoneyWindow, type MoneyWindow } from '@/lib/money-window';
import { RAW } from '@/constants/theme';

/**
 * Limits (Figma 1044:5410) and Limits · empty (1044:5488). All limits in
 * one place, from Settings › Money. Optional by design: most people will
 * set one from an insight.
 */
export default function Limits() {
    const { colors, shadows } = useTheme();
    const params = useLocalSearchParams<{ category?: string }>();
    const [limits, setLimits] = useState<Limit[] | null>(null);
    const [window, setWindow] = useState<MoneyWindow | null>(null);
    const [error, setError] = useState(false);
    const [sheet, setSheet] = useState<{ category: string | null; existing: Limit | null } | null>(null);

    const load = useCallback(async () => {
        try {
            const [l, w] = await Promise.all([getLimits(), loadMoneyWindow(true)]);
            setLimits(l);
            setWindow(w);
            setError(false);
        } catch (e) {
            console.error('Limits failed:', e);
            setError(true);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // "Set an airtime limit" from Ask opens straight onto that category.
    useEffect(() => {
        if (params.category && limits) {
            const existing = limits.find((l) => l.category === params.category) ?? null;
            setSheet({ category: params.category, existing });
        }
    }, [params.category, limits]);

    const usual = useCallback((c: string) => (window ? usualWeekly(window.txs, c) : 0), [window]);
    const resetDays = [...new Set((limits ?? []).map((l) => l.reset_day))];

    return (
        <>
            <Screen band={{ height: 500 }} header={<TopBar title="Limits" />} contentStyle={{ gap: 12 }}>
                {error && !limits ? (
                    <Banner tone="danger" title="Couldn’t load your limits" body="Check your connection and try again." action={{ label: 'Try again', onPress: load }} />
                ) : !limits || !window ? (
                    <Card gap={16}><Skeleton width={120} height={12} radius={6} /><SkeletonRow /><SkeletonRow /></Card>
                ) : limits.length === 0 ? (
                    <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.brand['accent-tint'], alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="shield" size={22} color={colors.brand['accent-text']} />
                        </View>
                        <Text size={15} weight="bold" align="center">No limits yet</Text>
                        <Text size={13} tone="secondary" align="center">
                            Set one from any insight, or pick a category. LogIt suggests a number from what you usually spend.
                        </Text>
                        <Button label="Add a limit" onPress={() => setSheet({ category: null, existing: null })} style={{ alignSelf: 'stretch' }} />
                    </Card>
                ) : (
                    <>
                        <Text size={13} weight="semibold" style={{ color: RAW.onBandSecondary, paddingHorizontal: 4 }}>
                            {resetDays.length === 1 ? `Weekly, reset every ${WEEKDAYS[resetDays[0] - 1]}` : 'Weekly'}
                        </Text>
                        <View style={{ backgroundColor: colors.bg.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 6, ...shadows.card }}>
                            {limits.map((l, i) => (
                                <LimitRow key={l.id} limit={l} status={limitStatus(l, window.txs)} divider={i > 0} onPress={() => setSheet({ category: l.category, existing: l })} />
                            ))}
                        </View>
                        <Tap
                            onPress={() => setSheet({ category: null, existing: null })}
                            accessibilityRole="button"
                            style={({ pressed }) => ({
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46,
                                borderRadius: 999, backgroundColor: colors.bg.surface, opacity: pressed ? 0.85 : 1, ...shadows.card,
                            })}
                        >
                            <Icon name="plus" size={16} color={colors.brand['accent-text']} />
                            <Text size={13} weight="bold" tone="accent">Add a limit</Text>
                        </Tap>
                    </>
                )}
            </Screen>

            <SetLimitSheet
                visible={!!sheet}
                category={sheet?.category ?? null}
                existing={sheet?.existing ?? null}
                usual={usual}
                taken={(limits ?? []).map((l) => l.category)}
                onClose={() => setSheet(null)}
                onSaved={load}
            />
        </>
    );
}
