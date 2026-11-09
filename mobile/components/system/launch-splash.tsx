import React, { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { AnimatedView } from '@/components/ui/animated-view';

/**
 * Launch · dot lands (Figma, App icon page → "Splash · motion").
 *
 * The native splash shows "logıt" without its dot (assets/logit-app-icon/
 * splash-icon.png). This overlay draws the same wordmark in the same place,
 * so the hand-off can't be seen, then drops the yellow corner onto the i.
 * It holds until LogIt has moved to the right screen (`ready`), then fades
 * up and out into the app. About 1.25s when the app is ready in time.
 */

// The splash image: a 512 artboard drawn 200pt wide, centred (app.json
// expo-splash-screen imageWidth). Paths are the W2 wordmark, outlined.
const SIZE = 200;
const K = SIZE / 512;
const LETTERS = [
    'M71.5652 328.391V186.348H101.5V328.391H71.5652Z',
    'M168.87 330.543C159.087 330.543 150.217 328.391 142.261 324.087C134.435 319.652 128.239 313.652 123.674 306.087C119.109 298.521 116.826 290.043 116.826 280.652C116.826 271.261 119.109 262.848 123.674 255.413C128.239 247.978 134.435 242.108 142.261 237.804C150.087 233.369 158.957 231.152 168.87 231.152C178.783 231.152 187.652 233.304 195.478 237.608C203.304 241.913 209.5 247.848 214.065 255.413C218.631 262.848 220.913 271.261 220.913 280.652C220.913 290.043 218.631 298.521 214.065 306.087C209.5 313.652 203.304 319.652 195.478 324.087C187.652 328.391 178.783 330.543 168.87 330.543ZM168.87 303.348C173.174 303.348 176.957 302.434 180.217 300.608C183.478 298.652 185.957 295.978 187.652 292.587C189.478 289.065 190.391 285.087 190.391 280.652C190.391 276.217 189.478 272.369 187.652 269.108C185.826 265.717 183.283 263.108 180.022 261.282C176.891 259.326 173.174 258.348 168.87 258.348C164.696 258.348 160.978 259.326 157.717 261.282C154.457 263.108 151.913 265.717 150.087 269.108C148.261 272.5 147.348 276.413 147.348 280.848C147.348 285.152 148.261 289.065 150.087 292.587C151.913 295.978 154.457 298.652 157.717 300.608C160.978 302.434 164.696 303.348 168.87 303.348Z',
    'M270.348 371.043C259.913 371.043 250.717 369.217 242.761 365.565C234.935 362.043 228.739 357.022 224.174 350.5L242.565 332.109C245.957 336.152 249.739 339.217 253.913 341.304C258.217 343.391 263.37 344.435 269.37 344.435C276.804 344.435 282.609 342.609 286.783 338.956C291.087 335.304 293.239 330.152 293.239 323.5V299.239L298.326 278.5L293.826 257.761V233.304H323.174V322.717C323.174 332.5 320.891 340.978 316.326 348.152C311.761 355.326 305.5 360.935 297.544 364.978C289.587 369.022 280.522 371.043 270.348 371.043ZM268.978 325.456C260.239 325.456 252.478 323.369 245.696 319.195C238.913 315.022 233.565 309.348 229.652 302.174C225.739 295 223.783 287.043 223.783 278.304C223.783 269.435 225.739 261.478 229.652 254.435C233.565 247.261 238.913 241.652 245.696 237.609C252.478 233.435 260.239 231.348 268.978 231.348C275.5 231.348 281.304 232.587 286.391 235.065C291.609 237.413 295.783 240.804 298.913 245.239C302.174 249.543 304 254.565 304.391 260.304V296.5C304 302.109 302.174 307.13 298.913 311.565C295.783 315.869 291.609 319.261 286.391 321.739C281.174 324.217 275.37 325.456 268.978 325.456ZM274.652 298.848C278.826 298.848 282.413 297.935 285.413 296.109C288.544 294.282 290.891 291.869 292.457 288.869C294.152 285.739 295 282.217 295 278.304C295 274.391 294.152 270.869 292.457 267.739C290.891 264.609 288.544 262.13 285.413 260.304C282.413 258.478 278.826 257.565 274.652 257.565C270.609 257.565 267.022 258.478 263.891 260.304C260.761 262.13 258.348 264.609 256.652 267.739C254.957 270.869 254.109 274.391 254.109 278.304C254.109 281.956 254.957 285.413 256.652 288.674C258.348 291.804 260.696 294.282 263.696 296.109C266.826 297.935 270.478 298.848 274.652 298.848Z',
    'M338.304 328.391V233.304H368.239V328.391H338.304Z',
    'M396.804 328.391V193.978H426.739V328.391H396.804ZM375.283 258.739V233.304H448.261V258.739H375.283Z',
];
const DOT = 'M335.311 184.452H371.233V220.374C361.706 220.374 352.569 216.59 345.832 209.853C339.096 203.116 335.311 193.979 335.311 184.452Z';
// The dot's box on the 512 artboard
const DOT_BOX = { x: 335.311, y: 184.452, size: 35.922 };

const LIGHT_BG = '#1642E5';
const DARK_BG = '#081750';

const DROP_DELAY = 300;
const DROP_MS = 850;
const MIN_SHOW_MS = 1600;
/** Never hold people on the splash: go after this even if the start check is slow. */
const MAX_SHOW_MS = 6000;
const EXIT_MS = 380;

export function LaunchSplash({ ready, onShown, onDone }: {
    /** True once the first real screen is showing. */
    ready: boolean;
    /** Called when the overlay is on screen: hide the native splash then. */
    onShown: () => void;
    /** Called after the exit: unmount the overlay. */
    onDone: () => void;
}) {
    const dark = useColorScheme() === 'dark';
    const reduceMotion = useReducedMotion();

    const drop = useSharedValue(reduceMotion ? 1 : 0);
    const turn = useSharedValue(reduceMotion ? 1 : 0);
    const dotOpacity = useSharedValue(reduceMotion ? 1 : 0);
    const exit = useSharedValue(0);

    const [minShown, setMinShown] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (!reduceMotion) {
            dotOpacity.value = withDelay(DROP_DELAY, withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }));
            drop.value = withDelay(DROP_DELAY, withSpring(1, { duration: DROP_MS, dampingRatio: 0.55 }));
            turn.value = withDelay(DROP_DELAY, withSpring(1, { duration: DROP_MS, dampingRatio: 0.7 }));
        }
        const a = setTimeout(() => setMinShown(true), reduceMotion ? 300 : MIN_SHOW_MS);
        const b = setTimeout(() => setTimedOut(true), MAX_SHOW_MS);
        return () => { clearTimeout(a); clearTimeout(b); };
    }, []);

    useEffect(() => {
        if (exiting || !((minShown && ready) || timedOut)) return;
        setExiting(true);
        exit.value = withTiming(1, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
            if (finished) runOnJS(onDone)();
        });
    }, [minShown, ready, timedOut, exiting]);

    const dotStyle = useAnimatedStyle(() => ({
        opacity: dotOpacity.value,
        transform: [
            { translateY: interpolate(drop.value, [0, 1], [-30, 0]) },
            { rotate: `${interpolate(turn.value, [0, 1], [-90, 0])}deg` },
        ],
    }));
    const markStyle = useAnimatedStyle(() => ({
        opacity: 1 - exit.value,
        transform: [{ scale: interpolate(exit.value, [0, 1], [1, 1.06]) }],
    }));
    const bgStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={exiting ? 'none' : 'auto'} onLayout={onShown}
            accessible accessibilityLabel="LogIt, loading">
            <StatusBar style="light" />
            <AnimatedView style={[StyleSheet.absoluteFill, { backgroundColor: dark ? DARK_BG : LIGHT_BG }, bgStyle]} />
            <View style={styles.center}>
                <AnimatedView style={[{ width: SIZE, height: SIZE }, markStyle]}>
                    <Svg width={SIZE} height={SIZE} viewBox="0 0 512 512">
                        {LETTERS.map((d, i) => <Path key={i} d={d} fill="#FFFFFF" />)}
                    </Svg>
                    <AnimatedView style={[{
                        position: 'absolute',
                        left: DOT_BOX.x * K,
                        top: DOT_BOX.y * K,
                        width: DOT_BOX.size * K,
                        height: DOT_BOX.size * K,
                    }, dotStyle]}>
                        <Svg width="100%" height="100%" viewBox={`${DOT_BOX.x} ${DOT_BOX.y} ${DOT_BOX.size} ${DOT_BOX.size}`}>
                            <Path d={DOT} fill="#FFCC00" />
                        </Svg>
                    </AnimatedView>
                </AnimatedView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
