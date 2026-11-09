import React, { useEffect } from 'react';
import { Image, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { biometrics } from '../utils/biometrics';
import { checkUpdateRequired } from '@/lib/app-config';
import { lastPhone } from '@/lib/session';

/**
 * Start: decides where to go (update needed, Face ID, logged in or not)
 * while the native splash is still showing; _layout hides the splash once
 * we've moved on. No minimum wait and no second loading screen.
 */
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

        checkUpdateRequired().then(async (update) => {
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

/**
 * Only seen if the start check outlasts _layout's 4s safety net: the same
 * wordmark on the same colours as the native splash (app.json), so it reads
 * as the splash still showing.
 */
function LaunchView() {
    const dark = useColorScheme() === 'dark';
    return (
        <View style={{ flex: 1, backgroundColor: dark ? '#081750' : '#1642E5', alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel="LogIt, loading">
            <StatusBar style="light" />
            <Image source={require('../assets/logit-app-icon/splash-icon.png')} style={{ width: 200, height: 200 }} resizeMode="contain" />
        </View>
    );
}
