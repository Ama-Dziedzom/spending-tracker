import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BAND, Button, Card, FieldError, Icon, Screen, Tap, Text, TopBar } from '@/components/ui';
import { FONT, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { formatPhone, ghanaNetwork, phoneAuthMessage, phoneRule, toE164 } from '../lib/phone';
import { cur, type Country } from '../lib/currency';
import { CountrySheet } from '@/components/settings/country-sheet';

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
    const [country, setCountry] = useState<Country>(cur());
    const [picking, setPicking] = useState(false);
    const e164 = useMemo(() => toE164(phone, `+${country.dial}`), [phone, country]);
    const network = ghanaNetwork(e164);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrent(data.user?.phone ? `+${data.user.phone.replace(/^\+/, '')}` : null));
    }, []);

    const send = async () => {
        if (!e164) {
            setError(phoneRule(country));
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
        <Screen band={BAND.changePhone} header={<TopBar title="Phone number" />} contentStyle={{ gap: 12 }} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
            <Text size={13} weight="semibold" tone="onBand" style={{ paddingHorizontal: 4 }}>
                We’ll text a code to your {current ? 'new ' : ''}number. Your transactions move with you.
            </Text>

            {current && (
                <Card gap={2} style={{ paddingVertical: 12 }}>
                    <Text size={11} tone="tertiary">Current</Text>
                    <Text size={15} weight="bold">{formatPhone(current)}</Text>
                </Card>
            )}

            <View style={{ gap: 6 }}>
                <Text size={11} weight="semibold" tone="primary">{current ? 'New number' : 'Your number'}</Text>
                <View
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16,
                        backgroundColor: colors.bg.surface, borderWidth: 1.5, borderColor: error ? colors.status.danger : colors.brand.accent,
                    }}
                >
                    <Tap onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`${country.name}, +${country.dial}. Change country`} hitSlop={{ top: 10, bottom: 10, left: 8, right: 4 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
                        <Text size={15} weight="semibold" tone="secondary">{country.flag} +{country.dial}</Text>
                        <Icon name="down" size={14} color={colors.text.secondary} />
                    </Tap>
                    <TextInput
                        value={phone}
                        onChangeText={(t) => { setPhone(t); setError(null); }}
                        placeholder={country.example}
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

            <CountrySheet
                visible={picking}
                onClose={() => setPicking(false)}
                selected={country.code}
                withDial
                title="Where’s your number from?"
                subtitle="The country of the new number. Your currency stays as it is; change it in Settings."
                onPick={(c) => { setPicking(false); setCountry(c); setError(null); }}
            />

            <Button label="Send code" busy={loading} busyLabel="Sending code" disabled={!phone.trim()} onPress={send} />
        </Screen>
    );
}
