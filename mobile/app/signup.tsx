import React, { useRef, useState } from 'react';
import { Linking, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { AuthLayout, FieldLabel, PhoneField, TextField } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { useAuth } from '../lib/useAuth';
import { phoneAuthMessage, toE164 } from '../lib/phone';
import { SUPPORT } from '@/constants/support';

/**
 * Sign up (Figma 1000:102). Two fields. The network hint confirms the number
 * is real before a text is spent.
 */
export default function SignUp() {
    const router = useRouter();
    const { shadows } = useTheme();
    const { loading, sendPhoneCode } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const phoneRef = useRef<TextInput>(null);
    const e164 = toE164(phone, '+233');

    const send = async () => {
        const n = name.trim();
        if (n.length < 2) { setNameError('Add the name you’d like to be greeted by.'); return; }
        if (!e164) { setPhoneError('Use a Ghana mobile number: 9 digits after +233, like 24 412 3456.'); return; }
        const result = await sendPhoneCode(e164, { create: true, fullName: n });
        if (result.success) {
            router.push({ pathname: '/otp', params: { mode: 'phone', intent: 'signup', phone: e164, fullName: n } });
        } else {
            setPhoneError(phoneAuthMessage(result.error));
        }
    };

    const link = (label: string, url: string) => (url
        ? <Text size={12} weight="bold" tone="tertiary" onPress={() => Linking.openURL(url).catch(() => {})} style={{ textDecorationLine: 'underline' }}>{label}</Text>
        : label);

    return (
        <AuthLayout
            title="Let’s get you set up"
            subtitle="Your name and phone number, that’s all."
            footer={
                <>
                    <Button label="Send code" size="xl" busy={loading} busyLabel="Sending code" disabled={!name.trim() || !phone.trim()} onPress={send} style={shadows.fab} />
                    <Text size={12} tone="tertiary" align="center">
                        By continuing you agree to LogIt’s {link('Terms', SUPPORT.termsUrl)} and {link('Privacy', SUPPORT.privacyPolicyUrl)}
                    </Text>
                </>
            }
        >
            <View style={{ gap: 8 }}>
                <FieldLabel>Full name</FieldLabel>
                <TextField
                    icon="user"
                    value={name}
                    onChangeText={(t) => { setName(t); setNameError(null); }}
                    placeholder="Ama Barnor"
                    autoCapitalize="words"
                    textContentType="name"
                    autoComplete="name"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    error={!!nameError}
                    accessibilityLabel="Full name"
                />
                {nameError && <Text size={13} weight="medium" tone="danger">{nameError}</Text>}
            </View>
            <View style={{ gap: 8 }}>
                <FieldLabel>Phone number</FieldLabel>
                <PhoneField value={phone} onChange={(v) => { setPhone(v); setPhoneError(null); }} onSubmit={send} error={phoneError} />
            </View>
        </AuthLayout>
    );
}
