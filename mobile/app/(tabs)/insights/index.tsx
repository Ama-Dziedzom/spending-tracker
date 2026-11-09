import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AskBar, Banner, Card, Icon, ListGroup, ListRow, PAST_OPACITY, Screen, Sheet, Skeleton, Tap, TAB_BAR_SPACE, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { loadMoneyWindow, monthLong, cedis, type MoneyWindow } from '@/lib/money-window';
import { computeInsights, DAYS_NEEDED, pickableMonths, type Finding, type InsightsResult } from '@/lib/insights-engine';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { categoryStyle } from '@/lib/category-style';
import { shortDate } from '@/lib/format';
import { RAW, type CategoryColor } from '@/constants/theme';

/** Room for the Ask bar that sits above the tab bar. */
const ASK_BAR_SPACE = 64;

/**
 * Insights (Figma 1022:4574). One sentence on the month, then up to three
 * findings written as notes: tag, the change, the reason. Ask LogIt sits
 * above the nav.
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
    const [pickerOpen, setPickerOpen] = useState(false);

    // Recompute when the month changes, without refetching.
    useEffect(() => { if (window) setData(computeInsights(window, new Date(), month)); }, [window, month]);

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
    const isCurrent = month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear();
    const tickColor = colors.brand['accent-text'];
    const notEnough = !!data && data.daysOfData < DAYS_NEEDED && isCurrent;
    // Tab bar: bottom max(inset, 12) + 4, about 62 tall; the Ask bar sits 12 above it.
    const askBottom = Math.max(insets.bottom, 12) + 4 + 62 + 12;

    return (
        <View style={{ flex: 1 }}>
            <Screen
                band={{ height: 500 }}
                bottomInset={TAB_BAR_SPACE + ASK_BAR_SPACE}
                header={
                    <View style={{ height: 40, marginTop: 10, marginBottom: 16, marginHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text weight="bold" size={26} tone="onBand" style={{ letterSpacing: -0.52 }} accessibilityRole="header">Insights</Text>
                        {!notEnough && (
                            <Tap
                                onPress={() => setPickerOpen(true)}
                                accessibilityRole="button"
                                accessibilityLabel={`Showing ${monthLong(month)}. Choose a month`}
                                hitSlop={4}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: RAW.onBandFill, opacity: pressed ? 0.8 : 1 })}
                            >
                                <Icon name="calendar" size={14} color={RAW.onBand} />
                                <Text size={13} weight="semibold" tone="onBand">{monthLong(month)}</Text>
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
                                <Text size={13} weight="semibold" style={{ color: RAW.onBandTertiary }}>
                                    {data.findings.length} {data.findings.length === 1 ? 'thing' : 'things'} LogIt noticed
                                </Text>
                            )}
                            <Text weight="bold" size={22} tone="onBand" style={{ letterSpacing: -0.44, lineHeight: 26 }}>{data.headline}</Text>
                        </View>
                        {data.findings.length === 0 && (
                            <Card><Text tone="secondary">{isCurrent ? 'Nothing stands out yet this month. Quiet is good. LogIt will point things out as they change.' : `Nothing stood out in ${monthLong(month)}.`}</Text></Card>
                        )}
                        {data.findings.map((f, i) => <FindingCard key={i} finding={f} onAsk={ask} monthName={isCurrent ? null : monthLong(month)} />)}
                    </>
                )}
            </Screen>

            <View style={{ position: 'absolute', left: 16, right: 16, bottom: askBottom }}>
                <AskBar compact onPress={() => ask()} onMic={() => router.push({ pathname: '/ask', params: { voice: '1' } })} />
            </View>

            <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a month">
                <ListGroup bare>
                    {(window ? pickableMonths(window, now) : []).map(({ start, spent }) => {
                        const selected = start.getTime() === month.getTime();
                        return (
                            <ListRow
                                key={start.toISOString()}
                                title={start.getFullYear() === now.getFullYear() ? monthLong(start) : `${monthLong(start)} ${start.getFullYear()}`}
                                meta={spent > 0 ? `GHS ${cedis(spent)} spent` : 'Nothing logged'}
                                trailing={selected ? <Icon name="tick" size={18} color={tickColor} /> : 'none'}
                                onPress={() => { setMonth(start); setPickerOpen(false); }}
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
function Tag({ tone, icon, label }: { tone: CategoryColor | 'muted'; icon: Parameters<typeof Icon>[0]['name']; label: string }) {
    const { colors } = useTheme();
    const tint = tone === 'muted' ? colors.bg.muted : colors.cat[`${tone}-tint`];
    const fg = tone === 'muted' ? colors.text.secondary : colors.cat[tone];
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

    const first = f.name.split(' ')[0];
    return (
        <Card gap={10} onPress={() => onAsk(`Who did I send the most money to ${monthName ? `in ${monthName}` : 'this month'}?`)}>
            {top(<Tag tone="people" icon="people" label="People" />, f.period)}
            <Text weight="bold" size={18} style={{ letterSpacing: -0.18 }}>{first} got GHS {cedis(f.total)} in {f.sends} {f.sends === 1 ? 'send' : 'sends'}</Text>
            <Text size={13} weight="medium" tone="secondary">More than anyone else {f.current ? 'this month' : `in ${f.period}`}.</Text>
        </Card>
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
