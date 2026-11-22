import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
    Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { LogItLabel, Text } from '@/components/ui';
import { AnimatedView } from '@/components/ui/animated-view';
import { useTheme } from '@/lib/theme';

/**
 * Ask LogIt thinking state (Figma "Ask LogIt · thinking v3"). Where the answer
 * will appear: the LogIt label, then a bubble with three dots rising in a wave
 * and a status line that fits the question, changing every 1.8 s.
 */

function Dot({ index, still }: { index: number; still: boolean }) {
    const { colors } = useTheme();
    const t = useSharedValue(0);
    useEffect(() => {
        if (still) return;
        // Rise and settle, one after another: a wave, then a short rest.
        t.value = withDelay(index * 140, withRepeat(withSequence(
            withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 420 }),
        ), -1));
    }, [index, still, t]);
    const style = useAnimatedStyle(() => ({
        opacity: 0.35 + 0.65 * t.value,
        transform: [{ translateY: -5 * t.value }, { scale: 1 + 0.15 * t.value }],
    }));
    return <AnimatedView style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand.accent }, style]} />;
}

export function ThinkingState({ count, question }: { count?: number; question: string }) {
    const { colors, shadows } = useTheme();
    const reduce = !!useReducedMotion();
    const lines = statusLines(question, count);
    const [i, setI] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setI((n) => (n + 1) % lines.length), 1800);
        return () => clearInterval(t);
    }, [lines.length]);

    return (
        <AnimatedView entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: 12 }} accessibilityLiveRegion="polite">
            <LogItLabel />
            <View
                style={{
                    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46,
                    paddingLeft: 16, paddingRight: 18, paddingVertical: 12,
                    borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: colors.bg.surface, ...shadows.bubble,
                }}
                accessible
                accessibilityLabel={`LogIt is working: ${lines[i]}`}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 16, paddingTop: 4 }}>
                    {[0, 1, 2].map((n) => <Dot key={n} index={n} still={reduce} />)}
                </View>
                <AnimatedView key={i} entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)}>
                    <Text size={14} weight="semibold" tone="secondary">{lines[i]}</Text>
                </AnimatedView>
            </View>
        </AnimatedView>
    );
}

/** Status lines that fit the question, so it feels like it's working on *this*. */
function statusLines(q: string, count?: number): string[] {
    const s = q.toLowerCase();
    const first = count ? `Looking through ${count} entries…` : 'Looking through your entries…';
    const middle =
        /week/.test(s) ? 'Comparing with last week…'
            : /month|october|november|december|january/.test(s) ? 'Comparing with last month…'
                : /afford|buy|payday|last until|save/.test(s) ? 'Checking what’s left until payday…'
                    : /who|send|sent|people/.test(s) ? 'Adding up who you sent money to…'
                        : 'Adding it all up…';
    const cat = (['food', 'transport', 'airtime', 'bills', 'shopping', 'fees'] as const).find((c) => s.includes(c));
    return [first, middle, cat ? `Totting up ${cat}…` : 'Spotting what stands out…', 'Almost there…'];
}
