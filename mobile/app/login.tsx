import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { AuthLayout, CardLink, FieldLabel, PhoneField, TextField } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { useAuth } from '../lib/useAuth';
import { biometrics } from '../utils/biometrics';
import { phoneAuthMessage, toE164 } from '../lib/phone';

/**
 * Log in (Figma 1000:149). Phone by default. Email and password stay for
 * accounts made before phone sign-in, and for anyone who turned on
 * biometric login with them.
 */
export default function Login() {
    const router = useRouter();
    const { shadows } = useTheme();
    const { loading, signIn, sendPhoneCode } = useAuth();
    const [method, setMethod] = useState<'phone' | 'email'>('phone');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<TextInput>(null);
    const e164 = toE164(phone, '+233');

    const biometricLogin = useCallback(async () => {
        const result = await biometrics.attemptBiometricLogin();
        if (result.success) router.replace('/spending');
        else if (result.requiresRelogin) setError('Your saved login has expired. Log in with your email and password once more.');
    }, [router]);

    // Biometric login was set up with an email account: offer it straight away.
    useEffect(() => {
        (async () => {
            if (!(await biometrics.isBiometricLoginEnabled())) return;
            setMethod('email');
            const saved = await biometrics.getBiometricUserEmail();
            if (saved) setEmail(saved);
            biometricLogin();
        })();
    }, [biometricLogin]);

    const sendCode = async () => {
        if (!e164) { setError('Use a Ghana mobile number: 9 digits after +233, like 24 412 3456.'); return; }
        const result = await sendPhoneCode(e164, { create: false });
        if (result.success) router.push({ pathname: '/otp', params: { mode: 'phone', intent: 'login', phone: e164 } });
        else setError(phoneAuthMessage(result.error));
    };

    const emailLogin = async () => {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Use the full email address you signed up with.'); return; }
        if (password.length < 6) { setError('Passwords are at least 6 characters. Check yours and try again.'); return; }
        const result = await signIn(email.trim(), password);
        if (result.success) router.replace('/spending');
        else setError('That email and password don’t match. Check both and try again.');
    };

    const switchTo = (m: 'phone' | 'email') => { setMethod(m); setError(null); };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle={method === 'phone' ? 'We’ll text you a code to log in.' : 'Log in with the email you signed up with.'}
            footer={
                <>
                    {method === 'phone' ? (
                        <Button label="Send code" size="xl" busy={loading} busyLabel="Sending code" disabled={!phone.trim()} onPress={sendCode} style={shadows.fab} />
                    ) : (
                        <Button label="Log in" size="xl" busy={loading} busyLabel="Logging in" disabled={!email.trim() || !password} onPress={emailLogin} style={shadows.fab} />
                    )}
                    <CardLink
                        label={method === 'phone' ? 'Log in with email instead' : 'Log in with your phone instead'}
                        onPress={() => switchTo(method === 'phone' ? 'email' : 'phone')}
                    />
                    <CardLink prefix="New to LogIt?" label="Create account" onPress={() => router.replace('/signup')} />
                </>
            }
        >
            {method === 'phone' ? (
                <View style={{ gap: 8 }}>
                    <FieldLabel>Phone number</FieldLabel>
                    <PhoneField value={phone} onChange={(v) => { setPhone(v); setError(null); }} autoFocus onSubmit={sendCode} error={error} />
                </View>
            ) : (
                <>
                    <View style={{ gap: 8 }}>
                        <FieldLabel>Email</FieldLabel>
                        <TextField
                            icon="mail"
                            value={email}
                            onChangeText={(t) => { setEmail(t); setError(null); }}
                            placeholder="you@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            accessibilityLabel="Email"
                        />
                    </View>
                    <View style={{ gap: 8 }}>
                        <FieldLabel>Password</FieldLabel>
                        <TextField
                            ref={passwordRef}
                            icon="lock"
                            value={password}
                            onChangeText={(t) => { setPassword(t); setError(null); }}
                            secureTextEntry
                            autoComplete="password"
                            textContentType="password"
                            returnKeyType="go"
                            onSubmitEditing={emailLogin}
                            error={!!error}
                            accessibilityLabel="Password"
                        />
                        {error && <Text size={13} weight="medium" tone="danger">{error}</Text>}
                    </View>
                </>
            )}
        </AuthLayout>
    );
}
