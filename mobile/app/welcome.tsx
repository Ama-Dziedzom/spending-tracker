import React, { useEffect, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Path } from 'react-native-svg';
import {
    Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { Tap, Text, Wordmark } from '@/components/ui';
import { AnimatedView } from '@/components/ui/animated-view';

/**
 * Welcome (Figma "Welcome · C4 · Final" + "Welcome · motion 1–3", section
 * "Welcome · redesign"). A photo carries the screen; the story plays once:
 * a MobileMoney alert drops in over her phone, shrinks into "✓ Logged", and
 * fades, leaving the calm final frame. Swipe (or tap) to start.
 * Fixed colours on purpose: this screen is the same in light and dark.
 */
const NAVY = '#05081E';
const INK = '#14183A';
const INK2 = '#4A5072';
const BLUE = '#1642E5';
const PHOTO = require('@/assets/images/welcome-photo.png');

export default function Welcome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: W, height: H } = useWindowDimensions();
    const reduce = !!useReducedMotion();

    // Photo framing from Figma (680×1020 at −119, −405 on a 390-wide frame): face high, phone mid-frame.
    const photoW = W * (680 / 390);
    const photo = { width: photoW, height: photoW * 1.5, left: W * (-119 / 390), top: W * (-405 / 390) };

    // ── The story: alert → Logged → rest ─────────────────────────────────
    const bannerIn = useSharedValue(0);
    const bannerOut = useSharedValue(0);
    const pillIn = useSharedValue(0);
    const pillOut = useSharedValue(0);
    useEffect(() => {
        if (reduce) return;
        const tick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        bannerIn.value = withDelay(600, withSpring(1, { damping: 18, stiffness: 160 }));
        bannerOut.value = withDelay(1200, withTiming(1, { duration: 300, easing: Easing.in(Easing.quad) }));
        pillIn.value = withDelay(1250, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) }, (done) => { if (done) runOnJS(tick)(); }));
        pillOut.value = withDelay(1900, withTiming(1, { duration: 500, easing: Easing.in(Easing.quad) }));
    }, [reduce, bannerIn, bannerOut, pillIn, pillOut]);

    const bannerStyle = useAnimatedStyle(() => ({
        opacity: bannerIn.value * (1 - bannerOut.value),
        transform: [{ translateY: -24 * (1 - bannerIn.value) }, { scale: 1 - 0.4 * bannerOut.value }],
    }));
    const pillStyle = useAnimatedStyle(() => ({
        opacity: pillIn.value * (1 - pillOut.value),
        transform: [{ translateY: -12 * pillOut.value }, { scale: 0.8 + 0.2 * pillIn.value }],
    }));

    const bannerTop = H * (236 / 844);
    const done = () => router.push('/signup');

    return (
        <View style={{ flex: 1, backgroundColor: NAVY }}>
            <StatusBar style="light" />
            <Image source={PHOTO} resizeMode="cover" style={{ position: 'absolute', ...photo }} accessibilityIgnoresInvertColors />
            {/* Brand tint over the black-and-white photo */}
            <View style={{ position: 'absolute', ...photo, backgroundColor: 'rgba(22,66,229,0.42)' }} />
            <LinearGradient
                colors={['rgba(5,8,30,0.45)', 'rgba(5,8,30,0.05)', 'rgba(5,8,30,0.3)', NAVY, NAVY]}
                locations={[0, 0.2, 0.46, 0.62, 1]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            <View style={{ position: 'absolute', top: insets.top + 14, left: 33 }}>
                <Wordmark width={91} />
            </View>

            {!reduce && (
                <>
                    <AnimatedView style={[{ position: 'absolute', top: bannerTop, left: 36, right: 36 }, bannerStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingLeft: 12, paddingRight: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#000018', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 8 }}>
                            <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 4C7 4 3 7.3 3 11.4c0 2.2 1.2 4.2 3 5.5L5.3 20l4-1.9c.9.2 1.8.3 2.7.3 5 0 9-3.3 9-7.4S17 4 12 4Z" fill="#FFFFFF" /></Svg>
                            </View>
                            <View style={{ flex: 1, gap: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text size={13} weight="bold" style={{ color: INK }}>MobileMoney</Text>
                                    <Text size={11} weight="medium" style={{ color: INK2 }}>now</Text>
                                </View>
                                <Text size={12} weight="medium" style={{ color: INK, lineHeight: 16 }}>Payment of GHS 120.00 to AKOSUA MENSAH. Balance: GHS 26.83</Text>
                            </View>
                        </View>
                    </AnimatedView>
                    <AnimatedView style={[{ position: 'absolute', top: bannerTop + 32, left: 0, right: 0, alignItems: 'center' }, pillStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingLeft: 10, paddingRight: 14, borderRadius: 999, backgroundColor: '#FFFFFF', shadowColor: '#000018', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
                            <Svg width={16} height={16} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill="#1E8E4E" /><Path d="m7.5 12.5 3 3 6-6.5" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                            <Text size={13} weight="bold" style={{ color: INK }}>Logged · GHS 120.00</Text>
                        </View>
                    </AnimatedView>
                </>
            )}

            <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 24, alignItems: 'center', paddingHorizontal: 45 }}>
                <Text size={28} weight="bold" align="center" style={{ color: '#FFFFFF', letterSpacing: -0.6, lineHeight: 34 }} accessibilityRole="header">
                    Every MoMo text, logged.
                </Text>
                <Text size={14} weight="medium" align="center" style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 21, marginTop: 10 }}>
                    LogIt turns your MoMo and bank alerts into a clear picture of your money.
                </Text>
                <View style={{ marginTop: 36, alignSelf: 'stretch' }}>
                    <SwipeToStart onDone={done} reduce={reduce} />
                </View>
                <Tap onPress={() => router.push('/login')} accessibilityRole="button" hitSlop={10} style={{ marginTop: 20, minHeight: 32, justifyContent: 'center' }}>
                    <Text size={13} weight="semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>I have an account</Text>
                </Tap>
            </View>
        </View>
    );
}

/**
 * Swipe to start (Figma "Swipe · Get started"). Drag the knob across, or just
 * tap anywhere on it; screen readers get a plain "Get started" button.
 * Haptic tick when it completes; the » arrows shimmer once as a hint.
 */
function SwipeToStart({ onDone, reduce }: { onDone: () => void; reduce: boolean }) {
    const [trackW, setTrackW] = useState(300);
    const KNOB = 52, PAD = 6;
    const max = Math.max(0, trackW - KNOB - PAD * 2);
    const x = useSharedValue(0);
    const shimmer = useSharedValue(0);

    useEffect(() => {
        if (reduce) return;
        shimmer.value = withDelay(2600, withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 650 })));
    }, [reduce, shimmer]);

    const finish = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onDone();
        setTimeout(() => { x.value = withTiming(0, { duration: 200 }); }, 600);
    };
    const complete = () => {
        'worklet';
        x.value = withTiming(max, { duration: 160 }, (ok) => { if (ok) runOnJS(finish)(); });
    };

    const pan = Gesture.Pan()
        .activeOffsetX([-8, 8])
        .onChange((e) => { x.value = Math.min(max, Math.max(0, x.value + e.changeX)); })
        .onEnd(() => {
            if (x.value > max * 0.7) complete();
            else x.value = withSpring(0, { damping: 18, stiffness: 220 });
        });
    const tap = Gesture.Tap().onEnd(() => complete());
    const gesture = Gesture.Exclusive(pan, tap);

    const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
    const label = useAnimatedStyle(() => ({ opacity: 1 - (max ? x.value / max : 0) * 0.8 }));
    const arrows = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * shimmer.value, transform: [{ translateX: 3 * shimmer.value }] }));

    return (
        <GestureDetector gesture={gesture}>
            <View
                onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Get started"
                accessibilityHint="Opens sign up"
                onAccessibilityTap={onDone}
                accessibilityActions={[{ name: 'activate', label: 'Get started' }]}
                onAccessibilityAction={() => onDone()}
                style={{ height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', justifyContent: 'center' }}
            >
                <AnimatedView style={[{ position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingLeft: 20 }, label]} pointerEvents="none">
                    <Text size={16} weight="semibold" style={{ color: '#FFFFFF' }}>Get started</Text>
                </AnimatedView>
                <AnimatedView style={[{ position: 'absolute', right: 22 }, arrows]} pointerEvents="none">
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="m6 6 6 6-6 6M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                </AnimatedView>
                <AnimatedView style={[{ position: 'absolute', left: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }, knob]} pointerEvents="none">
                    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                </AnimatedView>
            </View>
        </GestureDetector>
    );
}
