import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

export interface BandShape {
    /** y (Figma points on a 390 × 844 frame) where the band is still fully solid. */
    solidUntil: number;
    /** y where the band has fully faded into bg/canvas. Keep the fade at least ~100 long. */
    fadeEnd: number;
}

/**
 * Each screen's band, read from its Figma "Brand band" mask (15 Nov 2026):
 * fadeEnd = band height, solidUntil = solid stop × height. Text on the band
 * sits above solidUntil and is 100 % white; text below it uses dark tokens
 * (text/primary only where the band is at most 50 %).
 */
export const BAND = {
    /** Spending, Transactions, Wallets, Check, Notifications, Paste… (1002:203) */
    standard: { solidUntil: 270, fadeEnd: 600 },
    welcome: { solidUntil: 315, fadeEnd: 700 },
    /** Sign up, Log in, Code, Autopilot · iPhone / test (1000:102) */
    auth: { solidUntil: 201, fadeEnd: 420 },
    authAvatar: { solidUntil: 221, fadeEnd: 420 },
    authAndroid: { solidUntil: 242, fadeEnd: 420 },
    youreIn: { solidUntil: 273, fadeEnd: 520 },
    autopilotWorks: { solidUntil: 327, fadeEnd: 520 },
    /** Insights, Insight, Limits, Set a limit, Expected income, Delete account (1022:4574) */
    insights: { solidUntil: 225, fadeEnd: 500 },
    askStart: { solidUntil: 250, fadeEnd: 400 },
    askAnswer: { solidUntil: 135, fadeEnd: 266 },
    askListening: { solidUntil: 572, fadeEnd: 844 },
    settings: { solidUntil: 231, fadeEnd: 344 },
    profile: { solidUntil: 172, fadeEnd: 282 },
    autopilotSettings: { solidUntil: 233, fadeEnd: 360 },
    notificationSettings: { solidUntil: 223, fadeEnd: 333 },
    help: { solidUntil: 215, fadeEnd: 325 },
    changePhone: { solidUntil: 188, fadeEnd: 316 },
    /** Something went wrong, Session expired (1014:2246) */
    state: { solidUntil: 189, fadeEnd: 420 },
} as const satisfies Record<string, BandShape>;

interface Props extends Partial<BandShape> {
    /** Fully blue, no fade (launch, lock, update required, allow notifications). */
    full?: boolean;
    /** Autopilot · it works: the light ellipse behind the subtitle drops to 20 %. */
    softLightEllipse?: boolean;
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
const SOFT_LIGHT_ELLIPSE = 0.2;

/**
 * The blue band behind the top of a screen: brand/band with three soft
 * ellipses. Solid from the top to solidUntil, then a linear fade to
 * transparent at fadeEnd so bg/canvas shows through: never a hard edge.
 * Positioned absolutely; render it as the first child of the screen.
 *
 * Figma blurs each ellipse (Gaussian, stdDeviation 35–40). SVG filters don't
 * render reliably in React Native, so each blurred ellipse is drawn as a
 * radial gradient with the same centre and the blur's falloff.
 */
export function BrandBand({ solidUntil = BAND.standard.solidUntil, fadeEnd = BAND.standard.fadeEnd, full = false, softLightEllipse = false }: Props) {
    const { colors } = useTheme();
    const { width, height: screenH } = useWindowDimensions();
    const s = width / 390; // Figma frame width
    const h = full ? screenH : fadeEnd * s;
    const solid = full ? 1 : Math.min(1, Math.max(0, solidUntil / fadeEnd));
    if (__DEV__ && !full && fadeEnd - solidUntil < 100) console.warn(`BrandBand: fade of ${fadeEnd - solidUntil} is shorter than 100`);

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: h }]}>
            <Svg width={width} height={h}>
                <Defs>
                    {ELLIPSES.map((e, i) => {
                        const Rx = e.rx + 2.5 * e.blur;
                        const opacity = i === 0 && softLightEllipse ? SOFT_LIGHT_ELLIPSE : e.opacity;
                        return (
                            <RadialGradient key={i} id={`e${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                                <Stop offset={0} stopColor={e.color} stopOpacity={opacity} />
                                <Stop offset={Math.max(0, (e.rx - e.blur) / Rx)} stopColor={e.color} stopOpacity={opacity * 0.92} />
                                <Stop offset={e.rx / Rx} stopColor={e.color} stopOpacity={opacity * 0.5} />
                                <Stop offset={(e.rx + e.blur) / Rx} stopColor={e.color} stopOpacity={opacity * 0.16} />
                                <Stop offset={1} stopColor={e.color} stopOpacity={0} />
                            </RadialGradient>
                        );
                    })}
                    <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset={0} stopColor={RAW.onBand} stopOpacity={1} />
                        <Stop offset={solid} stopColor={RAW.onBand} stopOpacity={1} />
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
