import React from 'react';
import { View } from 'react-native';
import { Text, PAST_OPACITY } from '@/components/ui';
import type { WeekTotal } from '@/lib/insights-engine';
import { monthShort } from '@/lib/money-window';

/**
 * Last 6 weeks (Figma 1022:4663): 120 tall, 26 wide bars with 7 corners,
 * a quiet average line, dates under each bar. This week solid, earlier
 * weeks at 30 % (handoff §3).
 */
export function WeekChart({ weeks, average, color }: { weeks: WeekTotal[]; average: number; color: string }) {
    const area = 96;
    const top = 86;
    const max = Math.max(1, average, ...weeks.map((w) => w.total));
    const avgY = area - (average / max) * top;

    const label = (w: WeekTotal, i: number) => {
        if (i === weeks.length - 1) return 'This week';
        const prev = weeks[i - 1];
        const newMonth = i === 0 || prev.start.getMonth() !== w.start.getMonth();
        return newMonth ? `${w.start.getDate()} ${monthShort(w.start)}` : String(w.start.getDate());
    };

    return (
        <View style={{ height: 120 }} accessible accessibilityLabel={`Last ${weeks.length} weeks, average GHS ${Math.round(average)}. This week GHS ${Math.round(weeks[weeks.length - 1]?.total ?? 0)}.`}>
            {average > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: avgY, height: 1.5, backgroundColor: color }} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: area }}>
                {weeks.map((w, i) => {
                    const current = i === weeks.length - 1;
                    const h = w.total > 0 ? Math.max(8, (w.total / max) * top) : 4;
                    return (
                        <View key={i} style={{ width: 26, height: h, borderRadius: 7, backgroundColor: color, opacity: current ? 1 : w.total > 0 ? PAST_OPACITY : 0.15 }} />
                    );
                })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                {weeks.map((w, i) => {
                    const current = i === weeks.length - 1;
                    return (
                        <View key={i} style={{ width: current ? 54 : 26, alignItems: current ? 'flex-end' : 'center', marginRight: current ? 0 : 0 }}>
                            <Text size={11} weight={current ? 'bold' : 'medium'} tone={current ? 'primary' : 'tertiary'} numberOfLines={1} style={{ width: current ? 54 : 40, textAlign: current ? 'right' : 'center' }}>
                                {label(w, i)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
