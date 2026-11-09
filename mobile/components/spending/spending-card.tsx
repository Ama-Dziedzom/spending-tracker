import React from 'react';
import { Pressable, View } from 'react-native';
import {
    Card, CardHeader, CategoryTile, Chip, DayBars, InsetPanel, ListGroup, ProgressMeter,
    RoundButton, SegmentedControl, Skeleton, Text,
} from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { SpendingSummary } from '@/lib/spending-service';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { ghs, heroAmount, listAmount } from '@/lib/format';
import { TransactionRow } from './transaction-row';

export type Period = 'today' | 'week' | 'month';

export const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
] as const;

interface Props {
    summary: SpendingSummary;
    period: Period;
    onPeriod: (p: Period) => void;
    onMore: () => void;
    onDay: (date: Date) => void;
    onTransaction: (tx: TransactionWithWallet) => void;
    /** Hide the title row (salary prompt / first run put the switch first). */
    compact?: boolean;
    /** Ids that just arrived on refresh, tinted for a moment. */
    freshIds?: ReadonlySet<string>;
}

/** The Spending card (Figma 1002:203 / 351 / 475). */
export function SpendingCard({ summary, period, onPeriod, onMore, onDay, onTransaction, compact, freshIds }: Props) {
    return (
        <Card hero gap={16}>
            {!compact && (
                <CardHeader title="Spending" right={<RoundButton icon="more" label="More" tone="card" onPress={onMore} />} />
            )}
            <SegmentedControl options={PERIODS} value={period} onChange={onPeriod} />
            {period === 'week' && <WeekView summary={summary} onDay={onDay} onTransaction={onTransaction} freshIds={freshIds} />}
            {period === 'today' && <TodayView summary={summary} onTransaction={onTransaction} freshIds={freshIds} />}
            {period === 'month' && <MonthView summary={summary} />}
        </Card>
    );
}

function Total({ label, amount, tag }: { label: string; amount: number; tag?: React.ReactNode }) {
    return (
        <View style={{ gap: 4 }}>
            <Text size={13} weight="semibold" tone="secondary">{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }} accessible accessibilityLabel={`${label}: ${ghs(amount)}`}>
                    <Text size={15} weight="bold" tone="secondary">GHS</Text>
                    <Text variant="hero" style={{ letterSpacing: -1.44 }}>{heroAmount(amount)}</Text>
                </View>
                {tag}
            </View>
        </View>
    );
}

function WeekView({ summary, onDay, onTransaction, freshIds }: {
    summary: SpendingSummary;
    onDay: (d: Date) => void;
    onTransaction: (tx: TransactionWithWallet) => void;
    freshIds?: ReadonlySet<string>;
}) {
    const { colors } = useTheme();
    const w = summary.week;
    const quiet = w.spent === 0;
    const diff = w.lastWeekSameSpan - w.spent;

    let tag: React.ReactNode = null;
    if (quiet) tag = <Chip variant="tag" tone="success" label="Quiet week" />;
    else if (w.lastWeekSameSpan > 0 && Math.round(diff) !== 0) {
        tag = diff > 0
            ? <Chip variant="tag" tone="success" label={`${heroAmount(diff)} less than last week`} />
            : <Chip variant="tag" tone="neutral" label={`${heroAmount(-diff)} more than last week`} />;
    }

    const bars = w.days.map((d) => ({ label: d.letter, value: d.spent, current: d.isToday }));

    return (
        <>
            <Total label="Spent this week" amount={w.spent} tag={tag} />
            <DayBars
                bars={bars}
                format={(v) => heroAmount(v)}
                onPressBar={(i) => onDay(w.days[i].date)}
            />
            {quiet ? (
                <InsetPanel style={{ backgroundColor: colors.status['success-tint'], paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Text size={13} weight="semibold" style={{ flex: 1, color: colors.status.success }}>
                        Nothing has gone out since Monday. Alerts land here the moment they arrive.
                    </Text>
                </InsetPanel>
            ) : w.bigDay && (
                <InsetPanel>
                    <CategoryTile tone={w.bigDay.style.tone} icon={w.bigDay.style.icon} size={28} />
                    <Text size={13} weight="semibold" tone="secondary" style={{ flex: 1 }}>
                        {w.bigDay.date.toLocaleDateString('en-GB', { weekday: 'long' })} was your big day: {listNames(w.bigDay.names)}
                    </Text>
                </InsetPanel>
            )}
            {w.top.length > 0 && (
                <ListGroup bare>
                    {w.top.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} fresh={freshIds?.has(tx.id)} onPress={() => onTransaction(tx)} />
                    ))}
                </ListGroup>
            )}
            {(w.cameIn > 0 || w.moved > 0) && (
                <InsetPanel style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, flexWrap: 'wrap' }}>
                    {w.cameIn > 0 && <Text size={13} weight="bold" tone="success">{ghs(w.cameIn)} came in</Text>}
                    {w.cameIn > 0 && w.moved > 0 && <Text size={13} tone="tertiary">·</Text>}
                    {w.moved > 0 && <Text size={13} weight="semibold" tone="secondary">{heroAmount(w.moved)} moved, not counted</Text>}
                </InsetPanel>
            )}
        </>
    );
}

function TodayView({ summary, onTransaction, freshIds }: { summary: SpendingSummary; onTransaction: (tx: TransactionWithWallet) => void; freshIds?: ReadonlySet<string> }) {
    const t = summary.today;
    return (
        <>
            <Total
                label="Spent today"
                amount={t.spent}
                tag={t.payments > 0 ? <Chip variant="tag" tone="neutral" label={`${t.payments} ${t.payments === 1 ? 'payment' : 'payments'}`} /> : undefined}
            />
            {t.entries.length === 0 ? (
                <InsetPanel>
                    <Text size={13} weight="semibold" tone="secondary" style={{ flex: 1 }}>Nothing yet today.</Text>
                </InsetPanel>
            ) : (
                <ListGroup bare>
                    {t.entries.slice(0, 6).map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} fresh={freshIds?.has(tx.id)} onPress={() => onTransaction(tx)} />
                    ))}
                </ListGroup>
            )}
        </>
    );
}

function MonthView({ summary }: { summary: SpendingSummary }) {
    const { colors } = useTheme();
    const m = summary.month;
    const top = m.categories[0]?.amount ?? 0;
    const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });

    return (
        <>
            <Total
                label={`Spent in ${monthName}`}
                amount={m.spent}
                tag={m.cameIn > 0 ? <Chip variant="tag" tone="success" label={`${ghs(m.cameIn)} came in`} /> : undefined}
            />
            <View style={{ gap: 14 }}>
                {m.categories.slice(0, 4).map((c) => {
                    const barColor = c.style.tone === 'muted' ? colors.text.tertiary : colors.cat[c.style.tone];
                    const meta = c.id === 'transfer' ? `${c.count} ${c.count === 1 ? 'transfer' : 'transfers'}` : c.names.join(', ') || `${c.count} spends`;
                    return (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${c.style.label}, ${listAmount(c.amount)}`}>
                            <CategoryTile tone={c.style.tone} icon={c.style.icon} size={28} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                    <Text variant="row" weight="bold" size={13}>{c.style.label}</Text>
                                    <Text size={11} tone="tertiary" style={{ flex: 1 }} numberOfLines={1}>{meta}</Text>
                                    <Text size={13} weight="semibold">{heroAmount(c.amount)}</Text>
                                </View>
                                <ProgressMeter progress={top ? c.amount / top : 0} color={barColor} height={4} />
                            </View>
                        </View>
                    );
                })}
                {m.categories.length === 0 && (
                    <Text size={13} tone="secondary">Nothing spent this month yet.</Text>
                )}
            </View>
        </>
    );
}

function listNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Skeleton in the exact shape of the card (Figma 1002:848). */
export function SpendingCardSkeleton() {
    return (
        <Card hero gap={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width={90} height={18} />
                <Skeleton width={34} height={34} radius={999} />
            </View>
            <Skeleton width="100%" height={44} radius={14} />
            <Skeleton width={120} height={32} radius={8} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 92 }}>
                {[30, 44, 80, 16, 16, 16, 16].map((h, i) => <Skeleton key={i} width={34} height={h} radius={10} />)}
            </View>
            <Skeleton width="100%" height={44} radius={14} />
        </Card>
    );
}

/** A small link-style button used under cards ("See all transactions"). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12} style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <Text size={13} weight="bold" tone="accent">{label}</Text>
        </Pressable>
    );
}
