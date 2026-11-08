import React, { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AnimatedView } from './animated-view';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

/** Ring spinner: faint track with a rotating arc. For actions, not content. */
export function Spinner({ size = 20, color }: { size?: number; color?: string }) {
    const { colors } = useTheme();
    const c = color ?? colors.brand['accent-text'];
    const rot = useSharedValue(0);
    useEffect(() => {
        rot.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1);
    }, [rot]);
    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
    const stroke = Math.max(2, size / 9);
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <AnimatedView style={[{ width: size, height: size }, style]} accessibilityRole="progressbar">
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={c} strokeOpacity={0.25} strokeWidth={stroke} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={r} stroke={c} strokeWidth={stroke} fill="none"
                    strokeDasharray={`${circ * 0.3} ${circ}`} strokeLinecap="round"
                />
            </Svg>
        </AnimatedView>
    );
}

/** Spinner with a line of text, e.g. "Loading older transactions…". */
export function InlineLoader({ label }: { label: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Spinner size={20} />
            <Text size={13} tone="secondary">{label}</Text>
        </View>
    );
}

/** Pulsing bg/muted block. Skeletons take the exact shape of the content they replace. */
export function Skeleton({ width, height, radius = 6, style }: {
    width: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();
    const o = useSharedValue(1);
    useEffect(() => {
        o.value = withRepeat(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
    }, [o]);
    const anim = useAnimatedStyle(() => ({ opacity: o.value }));
    return <AnimatedView style={[{ width, height, borderRadius: radius, backgroundColor: colors.bg.muted }, anim, style]} />;
}

/** Skeleton list row: 38 tile, two lines, value. */
export function SkeletonRow() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={38} height={38} radius={12} />
            <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={140} height={11} radius={5} />
                <Skeleton width={90} height={9} radius={5} />
            </View>
            <Skeleton width={56} height={12} radius={6} />
        </View>
    );
}

interface MeterProps {
    /** 0–1. Values above 1 fill the bar. */
    progress: number;
    /** Bar colour; defaults to brand/accent. Limits pass a cat/* colour, or status/warn when over. */
    color?: string;
    height?: number;
    /** Optional marker (0–1) for the warn threshold on limits. */
    marker?: number;
}

/** Progress meter for long work and limits. Going over uses status/warn, never danger. */
export function ProgressMeter({ progress, color, height = 8, marker }: MeterProps) {
    const { colors } = useTheme();
    const pct = Math.max(0, Math.min(1, progress));
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={{ height, borderRadius: 999, backgroundColor: colors.bg.muted, overflow: 'hidden', justifyContent: 'center' }}
        >
            <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.brand.accent }} />
            {marker !== undefined && (
                <View style={{ position: 'absolute', left: `${marker * 100}%`, width: 2, height, backgroundColor: colors.bg.surface }} />
            )}
        </View>
    );
}
