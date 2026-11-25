import React, { useEffect, useState } from 'react';
import { ImageBackground, ScrollView, View, type ImageSourcePropType } from 'react-native';
import { CategoryTile, Icon, Tap, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { loadMoneyWindow, catOf, cedis, type MoneyWindow } from '@/lib/money-window';
import { flowOf, startOfWeek, startOfMonth } from '@/lib/spending-service';
import { categoryStyle } from '@/lib/category-style';
import { getAskHistory } from '@/lib/ask-history';
import { starters } from '@/lib/ask-engine';
import { PALETTE, withAlpha, type CategoryColor } from '@/constants/theme';
import { curLabel } from '@/lib/currency';

/**
 * Ask LogIt start (Figma "Ask LogIt · start v2", 1216:5886). A greeting and
 * the question, then your top spend as an illustration before any breakdown,
 * topic chips, and your recent questions. The mark lives in the card's place
 * of honour, so the header shows no logo here.
 */

/** Category → clay illustration (Figma "Illustration / Top spend / …"). */
const ART: Record<string, ImageSourcePropType> = {
    food: require('@/assets/illustrations/top-spend/food.png'),
    transport: require('@/assets/illustrations/top-spend/transport.png'),
    airtime: require('@/assets/illustrations/top-spend/airtime.png'),
    transfer: require('@/assets/illustrations/top-spend/people.png'),
    bills: require('@/assets/illustrations/top-spend/bills.png'),
    shopping: require('@/assets/illustrations/top-spend/shopping.png'),
    fees: require('@/assets/illustrations/top-spend/fees.png'),
    other: require('@/assets/illustrations/top-spend/other.png'),
};

/**
 * The card sits on the illustration's own pale lavender in light and dark
 * mode, so everything on it uses the light theme's colours (dark mode's
 * lighter category colours and blue lose contrast on it).
 */
const CARD = PALETTE.light;

const TOPICS: { id: string; label: string; q: string }[] = [
    { id: 'food', label: 'Food', q: 'How much did I spend on food this month?' },
    { id: 'transport', label: 'Transport', q: 'How much did I spend on transport this month?' },
    { id: 'airtime', label: 'Airtime', q: 'How much did I spend on airtime this month?' },
    { id: 'transfer', label: 'People', q: 'Who did I send the most money to?' },
    { id: 'bills', label: 'Bills', q: 'How much did I spend on bills this month?' },
];

interface TopSpend { category: string; amount: number; total: number; period: 'week' | 'month' }

/** The biggest category this week; this month if nothing's gone out yet this week. */
function topSpend(w: MoneyWindow, now = new Date()): TopSpend | null {
    for (const [period, from] of [['week', startOfWeek(now)], ['month', startOfMonth(now)]] as const) {
        const spent = w.txs.filter((t) => flowOf(t) === 'spent' && new Date(t.transaction_date) >= from);
        if (!spent.length) continue;
        const by = new Map<string, number>();
        for (const t of spent) by.set(catOf(t), (by.get(catOf(t)) ?? 0) + Number(t.amount));
        const [category, amount] = [...by.entries()].filter(([c]) => c !== 'other').sort((a, b) => b[1] - a[1])[0] ?? [...by.entries()][0];
        return { category, amount, total: [...by.values()].reduce((a, b) => a + b, 0), period };
    }
    return null;
}

/** A rough category for a past question, for its tile. */
function questionStyle(q: string): { tone: CategoryColor | 'accent'; icon: IconName } {
    const s = q.toLowerCase();
    for (const id of ['food', 'transport', 'airtime', 'bills', 'shopping', 'fees']) if (s.includes(id)) return categoryStyle(id) as { tone: CategoryColor; icon: IconName };
    if (/send|sent|who /.test(s)) return { tone: 'people', icon: 'people' };
    if (/afford|save|cut back|earn/.test(s)) return { tone: 'bills', icon: 'idea' };
    return { tone: 'accent', icon: 'chat' };
}

export function AskStart({ onAsk, onSeeAll }: { onAsk: (q: string) => void; onSeeAll: () => void }) {
    const { colors, shadows } = useTheme();
    const [name, setName] = useState<string | null>(null);
    const [top, setTop] = useState<TopSpend | null>(null);
    const [recent, setRecent] = useState<string[] | null>(null);

    useEffect(() => {
        let live = true;
        supabase.auth.getUser().then(({ data }) => {
            const full = data.user?.user_metadata?.full_name as string | undefined;
            if (live) setName(full?.split(' ')[0] ?? null);
        });
        loadMoneyWindow().then((w) => live && setTop(topSpend(w))).catch(() => {});
        getAskHistory().then((h) => live && setRecent(h.slice(0, 3).map((p) => p.q))).catch(() => live && setRecent([]));
        return () => { live = false; };
    }, []);

    const style = top ? categoryStyle(top.category) : null;
    const accent = style && style.tone !== 'muted' ? CARD.cat[style.tone] : CARD.brand['accent-text'];
    const label = style?.label ?? '';
    const rows = recent && recent.length ? recent : starters().slice(0, 3);

    return (
        <View style={{ gap: 22 }}>
            <View style={{ gap: 4, paddingHorizontal: 6 }}>
                <Text size={16} weight="semibold" tone="onBand" style={{ opacity: 0.8 }}>{name ? `Hi ${name}` : 'Hi there'}</Text>
                <Text weight="bold" size={30} tone="onBand" style={{ letterSpacing: -0.9, lineHeight: 36 }} accessibilityRole="header">What would you like to know?</Text>
            </View>

            {top && style && (
                <ImageBackground
                    source={ART[top.category] ?? ART.other}
                    resizeMode="cover"
                    style={{ height: 168, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', ...shadows.card }}
                    imageStyle={{ borderRadius: 24 }}
                    accessibilityLabel={`Your top spend ${top.period === 'week' ? 'this week' : 'this month'}: ${label}, ${curLabel()} ${cedis(top.amount)}`}
                >
                    <View style={{ padding: 20, gap: 4, flex: 1 }}>
                        <Text size={12} weight="bold" style={{ color: accent, letterSpacing: 0.6 }}>
                            {top.period === 'week' ? 'YOUR TOP SPEND THIS WEEK' : 'YOUR TOP SPEND THIS MONTH'}
                        </Text>
                        <Text size={26} weight="bold" style={{ color: CARD.text.primary, letterSpacing: -0.4 }}>{label}</Text>
                        <Text size={13} weight="medium" style={{ color: CARD.text.secondary }}>{curLabel()} {cedis(top.amount)} of {curLabel()} {cedis(top.total)} so far</Text>
                        <View style={{ flex: 1 }} />
                        <View style={{ alignSelf: 'flex-start' }}>
                            <Tap
                                onPress={() => onAsk(`Break down my ${label.toLowerCase()} spending ${top.period === 'week' ? 'this week' : 'this month'}`)}
                                accessibilityRole="button"
                                style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: CARD.brand.accent, opacity: pressed ? 0.85 : 1 })}
                            >
                                <Text size={13} weight="bold" style={{ color: CARD.brand['on-accent'] }}>Break it down</Text>
                            </Tap>
                        </View>
                    </View>
                </ImageBackground>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {TOPICS.map((t) => {
                    const s = categoryStyle(t.id);
                    const tone = s.tone === 'muted' ? null : s.tone;
                    const c = tone ? colors.cat[tone] : colors.text.secondary;
                    return (
                        <Tap
                            key={t.id}
                            onPress={() => onAsk(t.q)}
                            accessibilityRole="button"
                            accessibilityLabel={`Ask about ${t.label}`}
                            style={({ pressed }) => ({
                                flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingLeft: 12, paddingRight: 14, borderRadius: 999,
                                backgroundColor: tone ? colors.cat[`${tone}-tint`] : colors.bg.muted, borderWidth: 1, borderColor: withAlpha(c, 0.35), opacity: pressed ? 0.8 : 1,
                            })}
                        >
                            <Icon name={s.icon} size={16} color={c} />
                            <Text size={13} weight="bold">{t.label}</Text>
                        </Tap>
                    );
                })}
            </ScrollView>

            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                    <Text size={17} weight="bold" style={{ letterSpacing: -0.2 }} accessibilityRole="header">{recent && recent.length ? 'Recent questions' : 'Try asking'}</Text>
                    {recent && recent.length > 0 && (
                        <Tap onPress={onSeeAll} accessibilityRole="button" hitSlop={8}>
                            <Text size={13} weight="bold" tone="accent">See all</Text>
                        </Tap>
                    )}
                </View>
                {rows.map((q) => {
                    const st = questionStyle(q);
                    return (
                        <Tap
                            key={q}
                            onPress={() => onAsk(q)}
                            accessibilityRole="button"
                            style={({ pressed }) => ({
                                flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingLeft: 12, paddingRight: 14, paddingVertical: 12,
                                borderRadius: 18, backgroundColor: colors.bg.surface, opacity: pressed ? 0.8 : 1, ...shadows.small,
                            })}
                        >
                            <CategoryTile tone={st.tone === 'accent' ? 'accent' : st.tone} icon={st.icon} size={34} />
                            <Text size={13} weight="semibold" style={{ flex: 1 }}>{q}</Text>
                            <Icon name="sent" size={16} color={colors.text.tertiary} />
                        </Tap>
                    );
                })}
            </View>
        </View>
    );
}
