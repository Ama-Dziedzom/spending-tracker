import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BrandBand, Icon, Spinner, Text } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { supabase } from '../lib/supabase';
import { biometrics } from '../utils/biometrics';
import { checkUpdateRequired } from '@/lib/app-config';
import { lastPhone } from '@/lib/session';

const MIN_SPLASH_MS = 2000;

/** Launch · loading (Figma 1000:29): full band, mark and name, a spinner near the bottom. */
export default function SplashScreen() {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        const resolveDestination = async (): Promise<'/spending' | '/login' | '/welcome' | '/session-expired'> => {
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
            if (session) return '/spending';
            // Signed out without choosing to (login lapsed): "Log in again".
            return (await lastPhone()) ? '/session-expired' : '/welcome';
        };

        Promise.all([
            checkUpdateRequired(),
            new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
        ]).then(async ([update]) => {
            if (cancelled) return;
            // Update required wins over everything (Figma 1014:2283).
            if (update.required) {
                router.replace({ pathname: '/update-required', params: { reason: update.reason ?? '' } });
                return;
            }
            const destination = await resolveDestination();
            if (!cancelled) router.replace(destination);
        }).catch((err) => {
            // Never strand people on the splash: if the session or biometrics
            // check fails, log why and send them to Welcome.
            console.warn('[splash] could not resolve start screen', err);
            if (!cancelled) router.replace('/welcome');
        });

        return () => { cancelled = true; };
    }, []);

    return <LaunchView />;
}

function LaunchView() {
    const { colors } = useTheme();
    const { height } = useWindowDimensions();
    // Figma positions on an 844 frame: mark at 330, spinner at 720.
    const y = (v: number) => (v / 844) * height;
    return (
        <View style={{ flex: 1, backgroundColor: colors.brand.band }}>
            <StatusBar style="light" />
            <BrandBand full />
            <View style={{ position: 'absolute', top: y(330), left: 0, right: 0, alignItems: 'center', gap: 14 }} accessible accessibilityLabel="LogIt, loading">
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: RAW.onBand, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="flash" size={36} color={colors.brand.accent} />
                </View>
                <Text weight="extrabold" size={34} tone="onBand" style={{ letterSpacing: -1.02 }}>LogIt</Text>
            </View>
            <View style={{ position: 'absolute', top: y(720), left: 0, right: 0, alignItems: 'center' }}>
                <Spinner size={28} color={RAW.onBand} />
            </View>
        </View>
    );
}
