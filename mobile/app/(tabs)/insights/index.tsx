import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAND, AskBar, Banner, Card, Icon, ListGroup, ListRow, PAST_OPACITY, Screen, SegmentedControl, Sheet, Skeleton, Tap, TAB_BAR_SPACE, Text } from '@/components/ui';
import { WeekChart } from '@/components/insights/week-chart';
import { useTheme } from '@/lib/theme';
import { loadMoneyWindow, monthLong, cedis, type MoneyWindow } from '@/lib/money-window';
import { computeInsights, computeWeekInsights, DAYS_NEEDED, pickableMonths, pickableWeeks, weekRange, type Finding, type InsightsResult } from '@/lib/insights-engine';
import { startOfWeek } from '@/lib/spending-service';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { categoryStyle } from '@/lib/category-style';
import { shortDate } from '@/lib/format';
import { RAW, type CategoryColor, BAND_CHIP_ALPHA, withAlpha } from '@/constants/theme';

/** Room for the Ask bar that sits above the tab bar. */
const ASK_BAR_SPACE = 64;

/**
 * Insights (Figma 1022:4574 + 1176:5681). One sentence on the month, then
 * findings written as notes: tag, the change, the reason. The design's three
 * come first, the income cards after. Ask LogIt sits above the nav.
 */
export default function Insights() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [data, setData] = useState<InsightsResult | null>(null);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [window, setWindow] = useState<MoneyWindow | null>(null);
    /** First day of the month being looked at. */
    const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
    /** Week or month view; week is its Monday (Figma 1180:5728). */
    const [mode, setMode] = useState<'week' | 'month'>('week');
    const [week, setWeek] = useState(() => startOfWeek(new Date()));
    const [pickerOpen, setPickerOpen] = useState(false);
    /** The switch inside the picker; applied when a row is picked. */
    const [pickerMode, setPickerMode] = useState<'week' | 'month'>('week');

    // Recompute when the period changes, without refetching.
    useEffect(() => {
        if (!window) return;
        setData(mode === 'week' ? computeWeekInsights(window, week, new Date()) : computeInsights(window, new Date(), month));
    }, [window, month, week, mode]);

    const load = useCallback(async (force = false) => {
        try {
            setWindow(await loadMoneyWindow(force));
            setError(false);
        } catch (e) {
            console.error('Insights failed:', e);
            setError(true);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useLiveRefresh(() => load(true), 'insights');

    const ask = (q?: string) => router.push(q ? { pathname: '/ask', params: { q } } : '/ask');
    const now = new Date();
    const isCurrent = mode === 'week'
        ? week.getTime() === startOfWeek(now).getTime()
        : month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear();
    const periodLabel = mode === 'week' ? (isCurrent ? 'This week' : weekRange(week)) : monthLong(month);
    /** For Ask questions about a past period: "October", "the week of 10 Nov". */
    const pastName = isCurrent ? null : mode === 'week' ? `the week of ${week.getDate()} ${monthLong(week).slice(0, 3)}` : monthLong(month);
    const tickColor = colors.brand['accent-text'];
    const notEnough = !!data && data.daysOfData < DAYS_NEEDED && isCurrent;
    // Tab bar: bottom max(inset, 12) + 4, about 62 tall; the Ask bar sits 12 above it.
    const askBottom = Math.max(insets.bottom, 12) + 4 + 62 + 12;

    return (
        <View style={{ flex: 1 }}>
            <Screen
                band={BAND.insights}
                bottomInset={TAB_BAR_SPACE + ASK_BAR_SPACE}
                header={
                    <View style={{ height: 40, marginTop: 10, marginBottom: 16, marginHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text weight="bold" size={26} tone="onBand" style={{ letterSpacing: -0.52 }} accessibilityRole="header">Insights</Text>
                        {!notEnough && (
                            <Tap
                                onPress={() => { setPickerMode(mode); setPickerOpen(true); }}
                                accessibilityRole="button"
                                accessibilityLabel={`Showing ${periodLabel}. Choose a period`}
                                hitSlop={4}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: withAlpha(colors.brand['ink-button'], BAND_CHIP_ALPHA), opacity: pressed ? 0.8 : 1 })}
                            >
                                <Icon name="calendar" size={14} color={RAW.onBand} />
                                <Text size={13} weight="semibold" tone="onBand">{mode === 'week' ? weekRange(week) : monthLong(month)}</Text>
                                <Icon name="down" size={12} color={RAW.onBand} />
                            </Tap>
                        )}
                    </View>
                }
                scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={RAW.onBand} colors={[RAW.onBand]} /> }}
            >
                {error && !data ? (
                    <Banner tone="danger" title="Couldn’t load insights" body="Check your connection and try again." action={{ label: 'Try again', onPress: () => load(true) }} />
                ) : !data ? (
                    <>
                        <View style={{ paddingHorizontal: 6, gap: 8, paddingBottom: 6 }}>
                            <Skeleton width={140} height={11} radius={5} style={{ opacity: 0.5 }} />
                            <Skeleton width="85%" height={22} radius={8} style={{ opacity: 0.5 }} />
                        </View>
                        <Card gap={12}><Skeleton width={70} height={20} radius={999} /><Skeleton width="60%" height={28} radius={8} /><Skeleton width="90%" height={12} radius={5} /></Card>
                        <Card gap={12}><Skeleton width={100} height={20} radius={999} /><Skeleton width="70%" height={18} radius={6} /></Card>
                    </>
                ) : notEnough ? (
                    <NotEnoughData days={data.daysOfData} />
                ) : (
                    <>
                        <View style={{ paddingHorizontal: 6, paddingBottom: 6, gap: 6 }}>
                            {data.findings.length > 0 && (
                                <Text size={13} weight="semibold" tone="onBand">
                                    {data.findings.length} {data.findings.length === 1 ? 'thing' : 'things'} LogIt noticed
                                </Text>
                            )}
                            <Text weight="bold" size={22} tone="onBand" style={{ letterSpacing: -0.44, lineHeight: 26 }}>{data.headline}</Text>
                        </View>
                        {data.findings.length === 0 && (
                            <Card><Text tone="secondary">{isCurrent ? `Nothing stands out yet this ${mode}. Quiet is good. LogIt will point things out as they change.` : `Nothing stood out in ${pastName}.`}</Text></Card>
                        )}
                        {data.findings.map((f, i) => <FindingCard key={i} finding={f} onAsk={ask} monthName={pastName} />)}
                    </>
                )}
            </Screen>

            <View style={{ position: 'absolute', left: 16, right: 16, bottom: askBottom }}>
                <AskBar compact onPress={() => ask()} onMic={() => router.push({ pathname: '/ask', params: { voice: '1' } })} />
            </View>

            <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a period">
                <SegmentedControl
                    options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
                    value={pickerMode}
                    onChange={setPickerMode}
                />
                <ListGroup bare>
                    {pickerMode === 'week'
                        ? (window ? pickableWeeks(window, now) : []).map(({ start, spent, current }, i) => {
                            const selected = mode === 'week' && start.getTime() === week.getTime();
                            const name = current ? 'This week' : i === 1 ? 'Last week' : weekRange(start);
                            const amount = spent > 0 ? `GHS ${cedis(spent)} ${current ? 'so far' : 'spent'}` : 'Nothing logged';
                            return (
                                <ListRow
                                    key={start.toISOString()}
                                    title={name}
                                    meta={current || i === 1 ? `${weekRange(start)} · ${amount}` : amount}
                                    trailing={selected ? <Icon name="tick" size={18} color={tickColor} /> : 'none'}
                                    onPress={() => { setMode('week'); setWeek(start); setPickerOpen(false); }}
                                    accessibilityLabel={`${name}${selected ? ', selected' : ''}`}
                                />
                            );
                        })
                        : (window ? pickableMonths(window, now) : []).map(({ start, spent }) => {
                            const selected = mode === 'month' && start.getTime() === month.getTime();
                            return (
                                <ListRow
                                    key={start.toISOString()}
                                    title={start.getFullYear() === now.getFullYear() ? monthLong(start) : `${monthLong(start)} ${start.getFullYear()}`}
                                    meta={spent > 0 ? `GHS ${cedis(spent)} spent` : 'Nothing logged'}
                                    trailing={selected ? <Icon name="tick" size={18} color={tickColor} /> : 'none'}
                                    onPress={() => { setMode('month'); setMonth(start); setPickerOpen(false); }}
                                    accessibilityLabel={`${monthLong(start)}${selected ? ', selected' : ''}`}
                                />
                            );
                        })}
                </ListGroup>
            </Sheet>
        </View>
    );
}

/** Small tag: category tint, its icon, label in text/primary (Figma 1022:4593). */
function Tag({ tone, icon, label }: { tone: CategoryColor | 'muted' | 'accent'; icon: Parameters<typeof Icon>[0]['name']; label: string }) {
    const { colors } = useTheme();
    const tint = tone === 'muted' ? colors.bg.muted : tone === 'accent' ? colors.brand['accent-tint'] : colors.cat[`${tone}-tint`];
    const fg = tone === 'muted' ? colors.text.secondary : tone === 'accent' ? colors.brand['accent-text'] : colors.cat[tone];
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8, paddingRight: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tint }}>
            <Icon name={icon} size={14} color={fg} />
            <Text size={12} weight="bold">{label}</Text>
        </View>
    );
}

function FindingCard({ finding: f, onAsk, monthName }: { finding: Finding; onAsk: (q?: string) => void; /** Set when looking at a past month. */ monthName: string | null }) {
    const { colors } = useTheme();
    const top = (tag: React.ReactNode, meta: string) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {tag}
            <View style={{ flex: 1 }} />
            <Text size={12} weight="medium" tone="tertiary">{meta}</Text>
        </View>
    );

    if (f.kind === 'weeks') {
        // Figma 1180:5807: the change, the reason, then six weeks with the average line.
        return (
            <Card gap={12} onPress={() => onAsk(monthName ? `How much did I spend in ${monthName}?` : 'How does this week compare with last week?')}>
                {top(<Tag tone="accent" icon="calendar" label="Week by week" />, f.period)}
                <View style={{ gap: 4 }}>
                    <Text weight="extrabold" size={30} style={{ letterSpacing: -0.9 }}>{f.headline}</Text>
                    <Text size={13} weight="medium" tone="secondary">{f.body}</Text>
                </View>
                <WeekChart weeks={f.weeks} average={f.average} color={colors.brand.accent} lastLabel={f.lastLabel} />
                {f.average > 0 && <Text size={12} weight="semibold" tone="tertiary">Average GHS {cedis(f.average)} a week</Text>}
            </Card>
        );
    }

    if (f.kind === 'category') {
        const color = f.style.tone === 'muted' ? colors.text.tertiary : colors.cat[f.style.tone];
        const max = Math.max(1, ...f.bars);
        return (
            <Card
                gap={12}
                onPress={() => (monthName
                    ? onAsk(`How much did I spend on ${f.style.label.toLowerCase()} in ${monthName}?`)
                    : router.push({ pathname: '/insights/insight', params: { category: f.category } }))}
            >
                {top(<Tag tone={f.style.tone} icon={f.style.icon} label={f.style.label} />, f.period)}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text weight="extrabold" size={30} style={{ letterSpacing: -0.9 }}>{f.headline}</Text>
                        <Text size={13} weight="medium" tone="secondary">{f.body}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5 }} accessibilityElementsHidden>
                        {f.bars.map((v, i) => (
                            <View key={i} style={{ width: 12, height: Math.max(6, (v / max) * 60), borderRadius: 4, backgroundColor: color, opacity: i === f.bars.length - 1 ? 1 : PAST_OPACITY }} />
                        ))}
                    </View>
                </View>
            </Card>
        );
    }

    if (f.kind === 'subscriptions') {
        const s = categoryStyle('subscription');
        return (
            <Card gap={10} onPress={() => onAsk(`How much did I spend on subscriptions ${monthName ? `in ${monthName}` : 'this month'}?`)}>
                {top(<Tag tone={s.tone} icon={s.icon} label="Subscriptions" />, f.renewBy ? `Renew by ${shortDate(f.renewBy)}` : f.period ?? 'This month')}
                <Text weight="bold" size={18} style={{ letterSpacing: -0.18 }}>GHS {cedis(f.total)} a month on {f.apps.length} {f.apps.length === 1 ? 'app' : 'apps'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {f.apps.slice(0, 4).map((a) => (
                        <View key={a.name} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.bg.muted }}>
                            <Text size={12} weight="semibold" tone="secondary">{a.name} · {cedis(a.amount)}</Text>
                        </View>
                    ))}
                </View>
            </Card>
        );
    }

    const about = monthName ? `in ${monthName}` : 'this month';

    if (f.kind === 'inout') {
        // Figma 1176:5760: number and reason on the left, the last three months as paired bars on the right.
        // Only months with something logged; one month alone isn't a trend, so no chart.
        const months = f.months.filter((m) => m.cameIn > 0 || m.spent > 0).slice(-3);
        const showChart = months.length >= 2;
        const max = Math.max(1, ...months.flatMap((m) => [m.cameIn, m.spent]));
        const inColor = colors.status.success;
        const outColor = colors.brand.accent;
        return (
            <Card gap={12} onPress={() => onAsk(monthName ? `Did I spend more than I earned in ${monthName}?` : 'Am I spending more than I earn?')}>
                {top(<Tag tone="cash" icon="wallet" label="In vs out" />, f.period)}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text weight="extrabold" size={30} style={{ letterSpacing: -0.9 }}>{f.headline}</Text>
                        <Text size={13} weight="medium" tone="secondary">{f.body}</Text>
                    </View>
                    {showChart && <View
                        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
                        accessible
                        accessibilityLabel={months.map((m) => `${m.label}: GHS ${cedis(m.cameIn)} in, GHS ${cedis(m.spent)} out`).join('. ')}
                    >
                        {months.map((m, i) => {
                            const last = i === months.length - 1;
                            const h = (v: number) => (v > 0 ? Math.max(4, (v / max) * 54) : 2);
                            return (
                                <View key={m.label + i} style={{ alignItems: 'center', gap: 5 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, opacity: last ? 1 : PAST_OPACITY }}>
                                        <View style={{ width: 9, height: h(m.cameIn), borderRadius: 3, backgroundColor: inColor }} />
                                        <View style={{ width: 9, height: h(m.spent), borderRadius: 3, backgroundColor: outColor }} />
                                    </View>
                                    <Text size={11} weight={last ? 'bold' : 'medium'} tone={last ? 'primary' : 'tertiary'}>{m.label}</Text>
                                </View>
                            );
                        })}
                    </View>}
                </View>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                    <Legend color={inColor} label={`In · GHS ${cedis(f.cameIn)}`} />
                    <Legend color={outColor} label={`Out · GHS ${cedis(f.spent)}`} />
                </View>
            </Card>
        );
    }

    if (f.kind === 'drains') {
        return (
            <Card gap={12} onPress={() => onAsk(monthName ? `Where did most of my money go in ${monthName}?` : 'Where can I cut back this month?')}>
                {top(<Tag tone="shopping" icon="pieChart" label="Biggest drains" />, f.period)}
                <Text weight="bold" size={18} style={{ letterSpacing: -0.18 }}>{f.headline}</Text>
                <View style={{ gap: 10 }}>
                    {f.rows.map((r) => {
                        const color = r.style.tone === 'muted' ? colors.text.tertiary : colors.cat[r.style.tone];
                        return (
                            <View key={r.category} style={{ gap: 5 }} accessible accessibilityLabel={`${r.style.label}: GHS ${cedis(r.amount)}, ${Math.round(r.share * 100)}% of ${f.base === 'in' ? 'income' : 'spending'}`}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text size={13} weight="semibold">{r.style.label}</Text>
                                    <Text size={13} weight="semibold" tone="secondary">GHS {cedis(r.amount)} · {Math.round(r.share * 100)}%</Text>
                                </View>
                                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg.muted, overflow: 'hidden' }}>
                                    <View style={{ width: `${Math.min(100, r.share * 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
                                </View>
                            </View>
                        );
                    })}
                </View>
                <Text size={12} weight="medium" tone="tertiary">
                    {f.base === 'in' ? `Share of the GHS ${cedis(f.income)} that came in ${about}.` : `Share of the GHS ${cedis(f.income)} you spent ${about}.`}
                </Text>
            </Card>
        );
    }

    if (f.kind === 'savings') {
        const shown = f.rates.filter((r) => r.rate !== null);
        const max = Math.max(0.01, ...shown.map((r) => Math.abs(r.rate!)));
        return (
            <Card gap={12} onPress={() => onAsk('How can I save more each month?')}>
                {top(<Tag tone="loans" icon="loans" label="Savings rate" />, f.period)}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text weight="bold" size={18} style={{ letterSpacing: -0.18 }}>{f.headline}</Text>
                        <Text size={13} weight="medium" tone="secondary">{f.body}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5 }} accessibilityElementsHidden>
                        {f.rates.map((r, i) => (
                            <View
                                key={r.label + i}
                                style={{
                                    width: 10, borderRadius: 3,
                                    height: r.rate === null ? 3 : Math.max(4, (Math.abs(r.rate) / max) * 52),
                                    backgroundColor: r.rate === null ? colors.bg.muted : r.rate < 0 ? colors.status.danger : colors.status.success,
                                    opacity: i === f.rates.length - 1 ? 1 : PAST_OPACITY + 0.2,
                                }}
                            />
                        ))}
                    </View>
                </View>
            </Card>
        );
    }

    const first = f.name.split(' ')[0];
    return (
        <Card gap={10} onPress={() => onAsk(`Who did I send the most money to ${monthName ? `in ${monthName}` : 'this month'}?`)}>
            {top(<Tag tone="people" icon="people" label="People" />, f.period)}
            <Text weight="bold" size={18} style={{ letterSpacing: -0.18 }}>{first} got GHS {cedis(f.total)} in {f.sends} {f.sends === 1 ? 'send' : 'sends'}</Text>
            <Text size={13} weight="medium" tone="secondary">More than anyone else {f.current ? 'this month' : `in ${f.period}`}.</Text>
        </Card>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
            <Text size={12} weight="semibold" tone="secondary">{label}</Text>
        </View>
    );
}

/** Not enough data (Figma 1008:1411): honest about why and how long. */
function NotEnoughData({ days }: { days: number }) {
    const { colors } = useTheme();
    return (
        <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.brand['accent-tint'], alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="idea" size={22} color={colors.brand['accent-text']} />
            </View>
            <Text size={15} weight="bold" align="center">Insights need about a week</Text>
            <Text size={13} tone="secondary" align="center">
                LogIt has {days} {days === 1 ? 'day' : 'days'} of your money so far. Patterns appear after {DAYS_NEEDED}.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch', marginTop: 4 }} accessible accessibilityLabel={`${days} of ${DAYS_NEEDED} days`}>
                {Array.from({ length: DAYS_NEEDED }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < days ? colors.brand.accent : colors.bg.muted, opacity: i < days ? 0.7 : 1 }} />
                ))}
            </View>
            <Text size={12} weight="bold" tone="accent">{days} of {DAYS_NEEDED} days</Text>
        </Card>
    );
}
