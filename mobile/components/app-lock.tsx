import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBand, Icon, Tap, Text } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

/**
 * "Lock with Face ID" (Settings) and the Locked screen (Figma 1013:2165).
 * Shown on open when the lock is on; while LogIt is in the background the
 * same cover hides amounts in the app switcher. Stored on the device only.
 */
const KEY = 'logit.faceIdLock';

interface LockContext {
    enabled: boolean;
    /** Asks for Face ID before turning it on, so nobody locks themselves out. */
    setEnabled: (on: boolean) => Promise<boolean>;
    /** "Face ID", "Touch ID" or "Fingerprint", for labels. */
    method: string;
}

const Ctx = createContext<LockContext>({ enabled: false, setEnabled: async () => false, method: 'Face ID' });
export const useAppLock = () => useContext(Ctx);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
    const [enabled, setEnabledState] = useState(false);
    const [locked, setLocked] = useState(false);
    const [covered, setCovered] = useState(false);
    const [method, setMethod] = useState('Face ID');
    const enabledRef = useRef(false);
    const authing = useRef(false);

    const hasSession = async () => !!(await supabase.auth.getSession()).data.session;

    useEffect(() => {
        (async () => {
            const types: LocalAuthentication.AuthenticationType[] = await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => []);
            const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
            setMethod(face ? 'Face ID' : Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
            const on = (await AsyncStorage.getItem(KEY).catch(() => null)) === 'true';
            enabledRef.current = on;
            setEnabledState(on);
            if (on && (await hasSession())) setLocked(true);
        })();
    }, []);

    useEffect(() => {
        const sub = AppState.addEventListener('change', async (state) => {
            if (!enabledRef.current) return;
            if (state === 'inactive' || state === 'background') {
                // Cover amounts in the app switcher. Face ID itself makes the
                // app inactive, so don't cover during our own prompt.
                if (!authing.current) setCovered(true);
                if (state === 'background' && (await hasSession())) setLocked(true);
            } else if (state === 'active') {
                setCovered(false);
            }
        });
        return () => sub.remove();
    }, []);

    const unlock = useCallback(async (passcode: boolean) => {
        if (authing.current) return;
        authing.current = true;
        try {
            const r = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock LogIt',
                disableDeviceFallback: !passcode,
                fallbackLabel: passcode ? undefined : 'Use phone passcode',
                cancelLabel: 'Cancel',
            });
            if (r.success) setLocked(false);
        } finally {
            authing.current = false;
        }
    }, []);

    // Ask straight away when the lock appears.
    useEffect(() => { if (locked) unlock(false); }, [locked, unlock]);

    const setEnabled = useCallback(async (on: boolean) => {
        if (on) {
            const available = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
            if (!available) return false;
            authing.current = true;
            const r = await LocalAuthentication.authenticateAsync({ promptMessage: `Turn on ${method} lock` }).finally(() => { authing.current = false; });
            if (!r.success) return false;
        }
        await AsyncStorage.setItem(KEY, on ? 'true' : 'false').catch(() => {});
        enabledRef.current = on;
        setEnabledState(on);
        return true;
    }, [method]);

    return (
        <Ctx.Provider value={{ enabled, setEnabled, method }}>
            {children}
            {(locked || covered) && <LockedScreen method={method} interactive={locked} onUnlock={unlock} />}
        </Ctx.Provider>
    );
}

/** LogIt is locked (Figma 1013:2165): full band, nothing else visible. */
function LockedScreen({ method, interactive, onUnlock }: { method: string; interactive: boolean; onUnlock: (passcode: boolean) => void }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.brand.band }} accessibilityViewIsModal>
            <StatusBar style="light" />
            <BrandBand full />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: RAW.onBandFill, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="faceid" size={32} color={RAW.onBand} />
                </View>
                <Text variant="screenTitle" size={20} tone="onBand" align="center">LogIt is locked</Text>
                <Text size={13} align="center" style={{ color: RAW.onBandSecondary }}>Look at your phone to open</Text>
            </View>
            {interactive && (
                <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 24, gap: 14, alignItems: 'center' }}>
                    <Tap
                        onPress={() => onUnlock(false)}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                            alignSelf: 'stretch', minHeight: 50, borderRadius: 999, backgroundColor: RAW.onBand,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
                        })}
                    >
                        <Icon name="faceid" size={18} color={colors.brand.accent} />
                        <Text size={15} weight="bold" style={{ color: colors.brand.accent }}>Use {method}</Text>
                    </Tap>
                    <Tap onPress={() => onUnlock(true)} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }} style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text size={13} weight="bold" tone="onBand">Use phone passcode</Text>
                    </Tap>
                </View>
            )}
        </View>
    );
}
