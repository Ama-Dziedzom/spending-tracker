import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { biometrics } from '../utils/biometrics';

const { width, height } = Dimensions.get('window');
const MIN_SPLASH_MS = 2000;

export default function SplashScreen() {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        const resolveDestination = async (): Promise<'/(tabs)' | '/login' | '/welcome'> => {
            // Biometric users get routed through /login, which auto-triggers the
            // Face ID/fingerprint prompt on mount and can restore a session even
            // after the Supabase token has fully expired (see utils/biometrics.ts).
            if (await biometrics.isBiometricLoginEnabled()) {
                return '/login';
            }

            // No biometrics configured — fall back to checking the persisted
            // Supabase session directly so we don't force a manual re-login
            // just because the app reloaded.
            const { data: { session } } = await supabase.auth.getSession();
            return session ? '/(tabs)' : '/welcome';
        };

        Promise.all([
            resolveDestination(),
            new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
        ]).then(([destination]) => {
            if (!cancelled) router.replace(destination);
        });

        return () => { cancelled = true; };
    }, []);

    return (
        <View style={styles.container}>
            <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
                <Defs>
                    <RadialGradient
                        id="upperBlue"
                        cx={width * 0.55}
                        cy={0}
                        r={height * 0.65}
                        gradientUnits="userSpaceOnUse"
                    >
                        <Stop offset="0%" stopColor="#1642E5" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient
                        id="topLeftBlob"
                        cx={0}
                        cy={0}
                        r={height * 0.45}
                        gradientUnits="userSpaceOnUse"
                    >
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                        <Stop offset="40%" stopColor="#B7C4F7" stopOpacity="0.45" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient
                        id="topRightBlob"
                        cx={width * 0.8}
                        cy={-height * 0.05}
                        r={height * 0.55}
                        gradientUnits="userSpaceOnUse"
                    >
                        <Stop offset="0%" stopColor="#3558FF" stopOpacity="0.7" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                <Rect width={width} height={height} fill="#081750" />
                <Rect width={width} height={height} fill="url(#upperBlue)" />
                <Rect width={width} height={height} fill="url(#topLeftBlob)" />
                <Rect width={width} height={height} fill="url(#topRightBlob)" />
            </Svg>

            <Text style={styles.logo}>LogIt</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#081750',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        color: '#FFFFFF',
        fontSize: 48,
        fontFamily: 'Manrope-SemiBold',
    },
});
