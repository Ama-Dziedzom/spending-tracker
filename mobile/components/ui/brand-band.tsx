import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

interface Props {
    /** Figma heights on an 844 frame: 600 on most screens, 700 on Welcome, 300 on chat. */
    height?: number;
    /** Fully blue, no fade (launch, listening and lock screens). */
    full?: boolean;
}

/**
 * The ellipses exactly as in the Figma "Brand band" (e.g. 1004:618), in
 * 390-wide frame points: centre, radii, colour, opacity, blur (stdDeviation).
 */
const ELLIPSES = [
    { cx: 180, cy: 300, rx: 220, ry: 120, color: RAW.bandEllipses[0], opacity: 0.45, blur: 40 },
    { cx: 350, cy: 70, rx: 130, ry: 110, color: RAW.bandEllipses[1], opacity: 0.4, blur: 35 },
    { cx: 40, cy: 50, rx: 100, ry: 90, color: RAW.bandEllipses[2], opacity: 0.45, blur: 35 },
] as const;

/**
 * The blue band behind the top of most screens: brand/band with three soft
 * ellipses. Solid to 45 % of its height, then fades to transparent so
 * bg/canvas shows through: never a hard edge (handoff §3). Positioned
 * absolutely; render it as the first child of the screen.
 *
 * Figma blurs each ellipse (Gaussian, stdDeviation 35–40). SVG filters don't
 * render reliably in React Native, so each blurred ellipse is drawn as a
 * radial gradient with the same centre and the blur's falloff.
 */
export function BrandBand({ height = 600, full = false }: Props) {
    const { colors } = useTheme();
    const { width, height: screenH } = useWindowDimensions();
    const s = width / 390; // Figma frame width
    const h = full ? screenH : height * s;

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: h }]}>
            <Svg width={width} height={h}>
                <Defs>
                    {ELLIPSES.map((e, i) => {
                        const Rx = e.rx + 2.5 * e.blur;
                        return (
                            <RadialGradient key={i} id={`e${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                                <Stop offset={0} stopColor={e.color} stopOpacity={e.opacity} />
                                <Stop offset={Math.max(0, (e.rx - e.blur) / Rx)} stopColor={e.color} stopOpacity={e.opacity * 0.92} />
                                <Stop offset={e.rx / Rx} stopColor={e.color} stopOpacity={e.opacity * 0.5} />
                                <Stop offset={(e.rx + e.blur) / Rx} stopColor={e.color} stopOpacity={e.opacity * 0.16} />
                                <Stop offset={1} stopColor={e.color} stopOpacity={0} />
                            </RadialGradient>
                        );
                    })}
                    <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset={0} stopColor={RAW.onBand} stopOpacity={1} />
                        <Stop offset={0.45} stopColor={RAW.onBand} stopOpacity={1} />
                        <Stop offset={1} stopColor={RAW.onBand} stopOpacity={full ? 1 : 0} />
                    </LinearGradient>
                    <Mask id="band" x={0} y={0} width={width} height={h} maskUnits="userSpaceOnUse">
                        <Rect x={0} y={0} width={width} height={h} fill="url(#fade)" />
                    </Mask>
                </Defs>
                <G mask="url(#band)">
                    <Rect x={0} y={0} width={width} height={h} fill={colors.brand.band} />
                    {ELLIPSES.map((e, i) => (
                        <Ellipse
                            key={i}
                            cx={e.cx * s}
                            cy={e.cy * s}
                            rx={(e.rx + 2.5 * e.blur) * s}
                            ry={(e.ry + 2.5 * e.blur) * s}
                            fill={`url(#e${i})`}
                        />
                    ))}
                </G>
            </Svg>
        </View>
    );
}
