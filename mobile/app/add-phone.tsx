import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, FieldError, Screen, Text, TopBar } from '@/components/ui';
import { FONT, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { formatPhone, ghanaNetwork, phoneAuthMessage, toE164 } from '../lib/phone';

/**
 * Phone number (Figma 1013:2200). Change or add the number on this account:
 * same account, same user id, every transaction stays. The same code screen
 * as sign-up follows; the network hint confirms the number looks right.
 */
export default function PhoneNumberScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { loading, addPhoneToAccount } = useAuth();
    const [current, setCurrent] = useState<string | null>(null);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const e164 = useMemo(() => toE164(phone, '+233'), [phone]);
    const network = ghanaNetwork(e164);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.phone ? `+${data.user.phone.replace(/^\+/, '')}` : null));
    }, []);

    const send = async () => {
        if (!e164) {
            setError('Use a Ghana number with 9 digits after +233, like 55 018 2290.');
            return;
        }
        if (current && e164 === current) {
            setError('That’s already your number. Type the new one.');
            return;
        }
        const result = await addPhoneToAccount(e164);
        if (result.success) router.push({ pathname: '/otp', params: { mode: 'phone_change', phone: e164 } });
        else setError(phoneAuthMessage(result.error));
    };

    return (
        <Screen header={<TopBar title="Phone number" />} contentStyle={{ gap: 12 }} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
            <Text size={13} style={{ color: RAW.onBandSecondary, paddingHorizontal: 4 }}>
                We’ll text a code to your {current ? 'new ' : ''}number. Your transactions move with you.
            </Text>

            {current && (
                <Card gap={2} style={{ paddingVertical: 12 }}>
                    <Text size={11} tone="tertiary">Current</Text>
                    <Text size={15} weight="bold">{formatPhone(current)}</Text>
                </Card>
            )}

            <View style={{ gap: 6 }}>
                <Text size={11} weight="semibold" style={{ color: current ? colors.text.secondary : RAW.onBandSecondary }}>{current ? 'New number' : 'Your number'}</Text>
                <View
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16,
                        backgroundColor: colors.bg.surface, borderWidth: 1.5, borderColor: error ? colors.status.danger : colors.brand.accent,
                    }}
                >
                    <Text size={15} weight="semibold" tone="secondary">+233</Text>
                    <TextInput
                        value={phone}
                        onChangeText={(t) => { setPhone(t); setError(null); }}
                        placeholder="55 018 2290"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="phone-pad"
                        autoFocus
                        maxLength={14}
                        accessibilityLabel="New phone number"
                        style={{ flex: 1, fontFamily: FONT.bold, fontSize: 15, color: colors.text.primary, paddingVertical: 12 }}
                    />
                </View>
                {network && !error && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RAW.networkDot[network] }} />
                        <Text size={11} weight="semibold" tone="secondary">{network}</Text>
                    </View>
                )}
                {error && <FieldError message={error} />}
            </View>

            <Button label="Send code" busy={loading} busyLabel="Sending code" disabled={!phone.trim()} onPress={send} />
        </Screen>
    );
}
