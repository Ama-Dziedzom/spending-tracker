import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Icon, Text } from '@/components/ui';
import { AuthLayout, CardLink } from '@/components/onboarding/auth-layout';
import { CodeBoxes } from '@/components/onboarding/code-boxes';
import { useTheme } from '@/lib/theme';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { formatPhone, phoneAuthMessage } from '../lib/phone';
import { rememberPhone } from '@/lib/session';

const RESEND_SECONDS = 60;

/**
 * Code (Figma 1000:191) and Code · wrong or expired (1000:237). Fills itself
 * from the text on iPhone and Android; Verify wakes up at six digits (and
 * runs on its own then). Wrong: red boxes, one plain sentence, a new code is
 * one tap away.
 *
 * mode: 'phone' (sign up / log in by text), 'phone_change' (new number on this
 * account), 'email' (older email sign-up, followed by a password).
 */
export default function Code() {
    const router = useRouter();
    const { colors, shadows } = useTheme();
    const { email, fullName, phone, mode = 'email', intent } = useLocalSearchParams<{
        email?: string; fullName?: string; phone?: string; mode?: 'email' | 'phone' | 'phone_change'; intent?: 'signup' | 'login';
    }>();
    const { loading, verifyOtp, resendOtp, sendPhoneCode, verifyPhoneCode, addPhoneToAccount, verifyPhoneChange } = useAuth();
    const byText = mode === 'phone' || mode === 'phone_change';

    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(RESEND_SECONDS);
    const verifying = useRef(false);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const verify = useCallback(async (value: string) => {
        if (value.length < 6 || verifying.current) return;
        verifying.current = true;
        try {
            if (mode === 'phone' && phone) {
                const r = await verifyPhoneCode(phone, value);
                if (!r.success) { setError('That code didn’t work. Try again or get a new one.'); return; }
                await rememberPhone(phone);
                if (intent === 'signup') {
                    // Name was sent with the code request; save it again in case this number already had an account.
                    if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
                    router.replace('/onboarding/avatar');
                } else {
                    router.replace('/spending');
                }
                return;
            }
            if (mode === 'phone_change' && phone) {
                const r = await verifyPhoneChange(phone, value);
                if (!r.success) { setError('That code didn’t work. Try again or get a new one.'); return; }
                router.dismissTo('/profile');
                return;
            }
            if (!email) return;
            const r = await verifyOtp(email, value);
            if (!r.success) { setError('That code didn’t work. Try again or get a new one.'); return; }
            router.push({ pathname: '/password', params: { email, fullName, phone } });
        } finally {
            verifying.current = false;
        }
    }, [mode, phone, email, intent, fullName, router, verifyPhoneCode, verifyPhoneChange, verifyOtp]);

    const onChange = (v: string) => {
        setCode(v);
        if (error) setError(null);
        if (v.length === 6) verify(v);
    };

    const resend = async () => {
        if (cooldown > 0) return;
        setError(null);
        setCode('');
        const r = mode === 'phone'
            ? await sendPhoneCode(phone!, { create: intent === 'signup', fullName })
            : mode === 'phone_change'
                ? await addPhoneToAccount(phone!)
                : await resendOtp(email!);
        if (r.success) setCooldown(RESEND_SECONDS);
        else setError(byText ? phoneAuthMessage(r.error) : 'Couldn’t send a new code. Try again in a moment.');
    };

    const target = byText ? formatPhone(phone) : email;
    const mmss = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`;

    return (
        <AuthLayout
            title="Check your messages"
            subtitle={`We ${byText ? 'texted' : 'emailed'} a 6-digit code to ${target ?? 'you'}`}
            footer={
                <>
                    <Button label="Verify" size="xl" busy={loading} busyLabel="Checking" disabled={code.length < 6} onPress={() => verify(code)} style={code.length === 6 ? shadows.fab : undefined} />
                    {byText && !error && <CardLink label="Change number" onPress={() => router.back()} />}
                </>
            }
        >
            <CodeBoxes value={code} onChange={onChange} error={!!error} />
            {error ? (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} accessibilityRole="alert">
                        <Icon name="alert" size={16} color={colors.status.danger} />
                        <Text size={13} weight="semibold" tone="danger" style={{ flexShrink: 1 }}>{error}</Text>
                    </View>
                    {cooldown > 0
                        ? <Text size={13} tone="secondary" align="center">New code in {mmss}</Text>
                        : <CardLink label="Send a new code" onPress={resend} />}
                </>
            ) : cooldown > 0 ? (
                <Text size={13} tone="secondary" align="center">
                    Didn’t get it? <Text size={13} weight="bold">Resend in {mmss}</Text>
                </Text>
            ) : (
                <CardLink prefix="Didn’t get it?" label="Send a new code" onPress={resend} />
            )}
        </AuthLayout>
    );
}
