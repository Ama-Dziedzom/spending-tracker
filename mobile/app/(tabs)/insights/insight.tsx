import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Icon, Screen, Skeleton, Tap, TAB_BAR_SPACE, Text, TopBar } from '@/components/ui';
import { LimitCard } from '@/components/limits/limit-views';
import { SetLimitSheet } from '@/components/limits/set-limit-sheet';
import { getLimits, limitStatus, usualWeekly, type Limit } from '@/lib/limits';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { WeekChart } from '@/components/insights/week-chart';
import { useTheme } from '@/lib/theme';
import { cedis, loadMoneyWindow } from '@/lib/money-window';
import { categoryDetail, type CategoryDetail } from '@/lib/insights-engine';
import { RAW } from '@/constants/theme';

/**
 * Insight detail (Figma 1022:4640). The number, six weeks with a quiet
 * average line, what changed in a sentence, then something to do.
 */
export default function InsightDetail() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const { colors } = useTheme();
    const { shadows } = useTheme();
    const [d, setD] = useState<CategoryDetail | null>(null);
    const [txs, setTxs] = useState<TransactionWithWallet[]>([]);
    const [limit, setLimit] = useState<Limit | null>(null);
    const [error, setError] = useState(false);
    const [limitOpen, setLimitOpen] = useState(false);

    const load = useCallback(async (force = false) => {
        if (!category) return;
        try {
            const [w, limits] = await Promise.all([loadMoneyWindow(force), getLimits()]);
            setTxs(w.txs);
            setD(categoryDetail(w.txs, category));
            setLimit(limits.find((l) => l.category === category) ?? null);
        } catch {
            setError(true);
        }
    }, [category]);

    useEffect(() => { setD(null); load(); }, [load]);
    const usual = useCallback((c: string) => usualWeekly(txs, c), [txs]);

    const label = d?.style.label ?? '';
    const color = d ? (d.style.tone === 'muted' ? colors.text.tertiary : colors.cat[d.style.tone]) : colors.brand.accent;
    const askAbout = label.toLowerCase();

    return (
        <Screen band={{ height: 500 }} bottomInset={TAB_BAR_SPACE} header={<TopBar title={label || ' '} />}>
            {error ? (
                <Banner tone="danger" title="Couldn’t load this" body="Check your connection and try again." action={{ label: 'Back', onPress: () => router.back() }} />
            ) : !d ? (
                <Card gap={12}><Skeleton width={90} height={14} radius={6} /><Skeleton width="100%" height={110} radius={12} /></Card>
            ) : (
                <>
                    <View style={{ paddingHorizontal: 6, paddingBottom: 4, gap: 2 }}>
                        <Text size={13} weight="semibold" style={{ color: RAW.onBandTertiary }}>This week</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text weight="extrabold" size={34} tone="onBand" style={{ letterSpacing: -1.02 }}>GHS {cedis(d.thisWeek)}</Text>
                            {Math.round(d.change) !== 0 && (
                                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: RAW.onBandChip }}>
                                    <Text size={12} weight="bold" tone="onBand">{d.change > 0 ? '+' : '−'}GHS {cedis(d.change)}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Card gap={12}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text size={14} weight="bold">Last 6 weeks</Text>
                            {d.average > 0 && <Text size={12} weight="semibold" tone="tertiary">Avg GHS {cedis(d.average)}</Text>}
                        </View>
                        <WeekChart weeks={d.weeks} average={d.average} color={color} />
                    </Card>

                    <Card gap={8}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon name="idea" size={18} color={colors.brand['accent-text']} />
                            <Text size={14} weight="bold">What changed</Text>
                        </View>
                        <Text size={14} weight="medium" tone="secondary" style={{ lineHeight: 20 }}>{d.whatChanged}</Text>
                    </Card>

                    {limit && <LimitCard limit={limit} status={limitStatus(limit, txs)} onEdit={() => setLimitOpen(true)} />}

                    {/* With a limit, the card replaces "Set a weekly limit" (Figma 1044:5105). */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {!limit && <Button label="Set a weekly limit" icon="shield" size="md" fill onPress={() => setLimitOpen(true)} />}
                        <Tap
                            onPress={() => router.push({ pathname: '/ask', params: { q: `How much did I spend on ${askAbout} this month?` } })}
                            accessibilityRole="button"
                            style={({ pressed }) => ({
                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44,
                                paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.bg.surface, opacity: pressed ? 0.85 : 1, ...shadows.card,
                            })}
                        >
                            <Icon name="sparkle" size={16} color={colors.brand['accent-text']} />
                            <Text size={13} weight="bold" tone="accent">Ask about {askAbout}</Text>
                        </Tap>
                    </View>
                </>
            )}
            <SetLimitSheet
                visible={limitOpen}
                category={category ?? null}
                existing={limit}
                usual={usual}
                onClose={() => setLimitOpen(false)}
                onSaved={() => load(true)}
            />
        </Screen>
    );
}
