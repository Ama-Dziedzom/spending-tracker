import React from 'react';
import { View } from 'react-native';
import { Button, CategoryTile, Chip, DayBars, InsetPanel, ListGroup, ListRow, Sheet, Text } from '@/components/ui';
import { ghs, heroAmount } from '@/lib/format';
import { joinNames, recapHeadline, recapRange, type WeekRecap } from '@/lib/week-recap';
import { curLabel } from '@/lib/currency';

/**
 * Week recap (Figma "Week recap · sheet" in 02 · Spending). Shown once, the
 * first time the app opens in a new week. Order follows the design: what the
 * week meant, the one number, the chart, one line explaining it, where the
 * money went, then a way out.
 */
export function WeekRecapSheet({ recap, onClose, onSeeAll }: {
    recap: WeekRecap | null;
    onClose: () => void;
    onSeeAll: () => void;
}) {
    return (
        <Sheet visible={!!recap} onClose={onClose}>
            {recap && <Body recap={recap} onClose={onClose} onSeeAll={onSeeAll} />}
        </Sheet>
    );
}

function Body({ recap: r, onClose, onSeeAll }: { recap: WeekRecap; onClose: () => void; onSeeAll: () => void }) {
    const diff = r.weekBefore - r.spent;
    let tag: React.ReactNode = null;
    if (r.weekBefore > 0 && Math.round(diff) !== 0) {
        tag = diff > 0
            ? <Chip variant="tag" tone="success" label={`${heroAmount(diff)} less than the week before`} />
            : <Chip variant="tag" tone="neutral" label={`${heroAmount(-diff)} more than the week before`} />;
    }
    const bigDay = r.days[r.bigDayIndex];
    const weekday = bigDay.date.toLocaleDateString('en-GB', { weekday: 'long' });

    return (
        <>
            <View style={{ gap: 6 }}>
                <View style={{ alignSelf: 'flex-start' }}>
                    <Chip variant="tag" tone="accent" label={`Last week · ${recapRange(r)}`} />
                </View>
                <Text variant="screenTitle" size={20} style={{ letterSpacing: -0.4 }} accessibilityRole="header">
                    {recapHeadline(r)}
                </Text>
            </View>

            <View style={{ gap: 4 }}>
                <Text size={13} weight="semibold" tone="secondary">Spent last week</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }} accessible accessibilityLabel={`Spent last week: ${ghs(r.spent)}`}>
                        <Text size={15} weight="bold" tone="secondary">{curLabel()}</Text>
                        <Text variant="hero" style={{ letterSpacing: -1.44 }}>{heroAmount(r.spent)}</Text>
                    </View>
                    {tag}
                </View>
            </View>

            <DayBars
                bars={r.days.map((d, i) => ({ label: d.letter, value: d.spent, current: i === r.bigDayIndex }))}
                format={(v) => heroAmount(v)}
                fadeOthers
            />

            {r.bigDayNames.length > 0 && (
                <InsetPanel style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 12, borderRadius: 16 }}>
                    <CategoryTile tone={r.bigDayStyle.tone} icon={r.bigDayStyle.icon} size={34} />
                    <Text size={13} weight="semibold" style={{ flex: 1 }}>
                        {weekday} was your big day: {joinNames(r.bigDayNames)}.
                    </Text>
                </InsetPanel>
            )}

            {r.categories.length > 0 && (
                <View>
                    <Text size={13} weight="bold" tone="secondary">Where it went</Text>
                    <ListGroup bare>
                        {r.categories.map((c) => (
                            <ListRow
                                key={c.id}
                                leading={<CategoryTile tone={c.style.tone} icon={c.style.icon} />}
                                title={c.style.label}
                                meta={[`${c.count} ${c.count === 1 ? 'payment' : 'payments'}`, c.names.join(', ')].filter(Boolean).join(' · ')}
                                value={heroAmount(c.amount)}
                            />
                        ))}
                    </ListGroup>
                </View>
            )}

            <View style={{ gap: 6 }}>
                <Button label="Start the new week" onPress={onClose} />
                <Button label="See last week’s transactions" variant="ghost" size="md" onPress={() => { onClose(); onSeeAll(); }} />
            </View>
        </>
    );
}
