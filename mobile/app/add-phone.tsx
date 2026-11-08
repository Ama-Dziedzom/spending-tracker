import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../lib/useAuth';
import { toE164, ghanaNetwork, phoneAuthMessage } from '../lib/phone';

/**
 * Add a phone number to an account that was made with email.
 * Same account, same user id: every transaction stays where it is, and from
 * now on you can log in with a texted code.
 */
export default function AddPhoneScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { loading, addPhoneToAccount } = useAuth();
    const [phone, setPhone] = useState('');
    const e164 = useMemo(() => toE164(phone, '+233'), [phone]);
    const network = ghanaNetwork(e164);

    const send = async () => {
        if (!e164) return;
        const result = await addPhoneToAccount(e164);
        if (result.success) {
            router.push({ pathname: '/otp', params: { mode: 'phone_change', phone: e164 } });
        } else {
            Alert.alert('Couldn’t send your code', phoneAuthMessage(result.error));
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <StatusBar style="dark" />
            <View className="px-6 pt-2 pb-4 flex-row items-center gap-3">
                <Pressable
                    onPress={() => router.back()}
                    className="w-11 h-11 rounded-full bg-[#F8FAFF] items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={COLORS.text.primary} />
                </Pressable>
                <Text className="text-[20px] font-manrope-bold text-slate-900">Phone number</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 px-6">
                <View className="w-12 h-12 rounded-2xl bg-[#E8ECFC] items-center justify-center mb-4">
                    <HugeiconsIcon icon={SmartPhone01Icon} size={24} color={COLORS.primary} />
                </View>
                <Text className="text-[15px] font-manrope text-slate-500 leading-6 mb-6">
                    Add your number to log in with a texted code. Your account and everything you’ve logged stay exactly as they are.
                </Text>

                <View className="h-14 px-5 rounded-full border-[1.5px] border-[#E8ECFC] flex-row items-center">
                    <Text className="text-[16px] font-manrope-medium text-slate-900">🇬🇭  +233</Text>
                    <View className="w-[1.5px] h-6 bg-[#E8ECFC] mx-3.5" />
                    <TextInput
                        className="flex-1 text-[16px] font-manrope-medium text-slate-900"
                        placeholder="24 412 3456"
                        placeholderTextColor="#C4C9D3"
                        keyboardType="phone-pad"
                        textContentType="telephoneNumber"
                        autoComplete="tel"
                        value={phone}
                        onChangeText={setPhone}
                        autoFocus
                    />
                </View>
                <Text className="text-[13px] font-manrope-medium text-slate-400 mt-2 ml-1">
                    {network ? `${network} number` : 'Your Ghana mobile number'}
                </Text>

                <View className="flex-1" />

                <Pressable
                    disabled={!e164 || loading}
                    onPress={send}
                    className="h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: !e164 || loading ? '#D5E0FF' : COLORS.primary, marginBottom: insets.bottom + 16 }}
                    accessibilityRole="button"
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[17px] font-manrope-semibold text-white">Send code</Text>}
                </Pressable>
            </KeyboardAvoidingView>
        </View>
    );
}
