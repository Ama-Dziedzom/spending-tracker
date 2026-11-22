import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
    Easing, FadeIn, FadeOut, ZoomOut, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { AnimatedView } from '@/components/ui/animated-view';

/**
 * Ask LogIt thinking loader (Figma "LogIt / Thinking orb" 1221:5945, screen
 * 1221:5950). A glassy blue sphere with a soft, shifting wobble while
 * light colours swirl inside it. No ring. Under it, a status line that moves
 * on every couple of seconds. When the answer lands, it shrinks away into the
 * answer's mark. Fixed brand colours: it's part of the logo family.
 */
const SIZE = 112;

/** One soft colour blob that circles inside the sphere. */
function Swirl({ color, opacity, size, offset, duration, reverse, still }: {
    color: string; opacity: number; size: number; offset: { x: number; y: number }; duration: number; reverse?: boolean; still: boolean;
}) {
    const turn = useSharedValue(0);
    useEffect(() => {
        if (still) return;
        turn.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1);
    }, [still, duration, turn]);
    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -1 : 1) * turn.value * 360}deg` }] }));
    const id = `swirl${color.slice(1)}`;
    return (
        <AnimatedView style={[{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE }, style]}>
            <Svg width={size} height={size} style={{ position: 'absolute', left: SIZE / 2 - size / 2 + offset.x, top: SIZE / 2 - size / 2 + offset.y }}>
                <Defs>
                    <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={color} stopOpacity={opacity} />
                        <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.6} />
                        <Stop offset="1" stopColor={color} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={`url(#${id})`} />
            </Svg>
        </AnimatedView>
    );
}

export function ThinkingOrb() {
    const reduce = useReducedMotion();
    const wobbleA = useSharedValue(0);
    const wobbleB = useSharedValue(0);
    const spin = useSharedValue(0);

    useEffect(() => {
        if (reduce) return;
        // Two wobbles on different clocks never line up, so the shape keeps changing
        // without an obvious loop.
        wobbleA.value = withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true);
        wobbleB.value = withRepeat(withTiming(1, { duration: 3700, easing: Easing.inOut(Easing.sin) }), -1, true);
        spin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1);
    }, [reduce, wobbleA, wobbleB, spin]);

    // Always a true circle (React Native squashes uneven corner radii into an oval).
    // The "liquid" change comes from a soft stretch that shifts direction as it turns.
    const body = useAnimatedStyle(() => {
        const a = wobbleA.value * 2 - 1;
        const b = wobbleB.value * 2 - 1;
        return {
            transform: [
                { rotate: `${spin.value * 360}deg` },
                { scaleX: 1 + 0.045 * a },
                { scaleY: 1 - 0.035 * a + 0.02 * b },
            ],
        };
    });
    // The shine stays near the top-left while the body turns.
    const gloss = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 360}deg` }] }));

    return (
        <AnimatedView exiting={ZoomOut.duration(260)} style={{ shadowColor: '#1642E5', shadowOpacity: 0.4, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 10 }}>
            <AnimatedView style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden', backgroundColor: '#1642E5', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' }, body]}>
                {/* Light colours only: on a phone they sit on top of the blue rather than
                    glowing through it, and a dark yellow over blue turns olive. */}
                <Swirl color="#8EA6FF" opacity={0.95} size={104} offset={{ x: -20, y: -18 }} duration={3200} still={!!reduce} />
                <Swirl color="#5FE3F5" opacity={0.75} size={84} offset={{ x: 0, y: 30 }} duration={2700} reverse still={!!reduce} />
                <Swirl color="#FFE680" opacity={0.6} size={50} offset={{ x: 30, y: 14 }} duration={4100} still={!!reduce} />
                <AnimatedView style={[{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE }, gloss]}>
                    <Svg width={SIZE} height={SIZE}>
                        <Defs>
                            <RadialGradient id="orbGloss" cx="50%" cy="50%" r="50%">
                                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
                                <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0.35} />
                                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                            </RadialGradient>
                            <RadialGradient id="orbRim" cx="50%" cy="50%" r="50%">
                                <Stop offset="0.72" stopColor="#0A1E73" stopOpacity={0} />
                                <Stop offset="1" stopColor="#0A1E73" stopOpacity={0.35} />
                            </RadialGradient>
                        </Defs>
                        {/* Darker edge + bright shine: reads as a glass sphere, not a flat disc */}
                        <Ellipse cx={SIZE / 2} cy={SIZE / 2} rx={SIZE / 2} ry={SIZE / 2} fill="url(#orbRim)" />
                        <Ellipse cx={38} cy={30} rx={24} ry={14} fill="url(#orbGloss)" />
                    </Svg>
                </AnimatedView>
            </AnimatedView>
        </AnimatedView>
    );
}

/**
 * The thinking state in the thread: the sphere, then a status line that
 * changes every 1.8 s. `count` is how many entries are being looked at.
 */
export function ThinkingState({ count, question }: { count?: number; question: string }) {
    const lines = statusLines(question, count);
    const [i, setI] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setI((n) => (n + 1) % lines.length), 1800);
        return () => clearInterval(t);
    }, [lines.length]);
    return (
        <View style={{ alignItems: 'center', gap: 18, paddingVertical: 28 }} accessible accessibilityLabel="LogIt is working on your answer" accessibilityLiveRegion="polite">
            <ThinkingOrb />
            <AnimatedView key={i} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
                <Text size={14} weight="semibold" tone="secondary" align="center">{lines[i]}</Text>
            </AnimatedView>
        </View>
    );
}

/** Status lines that fit the question, so it feels like it's working on *this*. */
function statusLines(q: string, count?: number): string[] {
    const s = q.toLowerCase();
    const first = count ? `Looking through ${count} entries…` : 'Looking through your entries…';
    const middle =
        /week/.test(s) ? 'Comparing with last week…'
            : /month|october|november|december|january/.test(s) ? 'Comparing with last month…'
                : /afford|buy|phone|save/.test(s) ? 'Checking what’s left until payday…'
                    : /who|send|sent|people/.test(s) ? 'Adding up who you sent money to…'
                        : 'Adding it all up…';
    const cat = (['food', 'transport', 'airtime', 'bills', 'shopping', 'fees'] as const).find((c) => s.includes(c));
    return [first, middle, cat ? `Totting up ${cat}…` : 'Spotting what stands out…', 'Almost there…'];
}
