import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop, LinearGradient, Rect } from 'react-native-svg';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

interface Props {
    /** 600 on most screens, 500 on settings-style screens, 300 on chat (handoff §3). */
    height?: number;
    /** Fully blue, no fade (listening and lock screens). */
    full?: boolean;
}

/**
 * The blue band behind the top of most screens: brand/band with three soft
 * ellipses, fading into bg/canvas from ~45 % of its height. Never a hard edge.
 * Positioned absolutely; render it as the first child of the screen.
 */
export function BrandBand({ height = 600, full = false }: Props) {
    const { colors } = useTheme();
    const { width, height: screenH } = useWindowDimensions();
    const h = full ? screenH : height;
    const [e1, e2, e3] = RAW.bandEllipses;

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: h }]}>
            <Svg width={width} height={h}>
                <Defs>
                    <RadialGradient id="e1" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={e1} stopOpacity={0.45} />
                        <Stop offset="1" stopColor={e1} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="e2" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={e2} stopOpacity={0.42} />
                        <Stop offset="1" stopColor={e2} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="e3" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={e3} stopOpacity={0.4} />
                        <Stop offset="1" stopColor={e3} stopOpacity={0} />
                    </RadialGradient>
                    <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.bg.canvas} stopOpacity={0} />
                        <Stop offset={full ? 1 : 0.45} stopColor={colors.bg.canvas} stopOpacity={0} />
                        <Stop offset="1" stopColor={colors.bg.canvas} stopOpacity={full ? 0 : 1} />
                    </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={width} height={h} fill={colors.brand.band} />
                <Ellipse cx={width * 0.85} cy={h * 0.08} rx={width * 0.55} ry={h * 0.22} fill="url(#e1)" />
                <Ellipse cx={width * 0.1} cy={h * 0.3} rx={width * 0.6} ry={h * 0.25} fill="url(#e2)" />
                <Ellipse cx={width * 0.5} cy={-h * 0.05} rx={width * 0.7} ry={h * 0.18} fill="url(#e3)" />
                <Rect x={0} y={0} width={width} height={h} fill="url(#fade)" />
            </Svg>
        </View>
    );
}
