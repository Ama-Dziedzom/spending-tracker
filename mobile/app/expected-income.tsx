import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, MoneyReceive01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { COLORS } from '../constants/theme';
import { Wallet } from '../lib/supabase';
import { getWallets } from '../lib/wallet-service';
import { formatCurrency } from '../lib/transaction-service';
import {
    ExpectedIncome,
    getExpectedIncome,
    ordinal,
    removeExpectedIncome,
    saveExpectedIncome,
} from '../lib/income-service';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function ExpectedIncomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<ExpectedIncome[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form
    const [editingId, setEditingId] = useState<string | undefined>();
    const [label, setLabel] = useState('Salary');
    const [amount, setAmount] = useState('');
    const [day, setDay] = useState(25);
    const [walletId, setWalletId] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [list, w] = await Promise.all([getExpectedIncome(), getWallets()]);
        setItems(list);
        setWallets(w);
        setWalletId((current) => current ?? w.find((x) => x.type === 'bank')?.id ?? w[0]?.id ?? null);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const resetForm = () => {
        setEditingId(undefined);
        setLabel('Salary');
        setAmount('');
        setDay(25);
    };

    const edit = (item: ExpectedIncome) => {
        setEditingId(item.id);
        setLabel(item.label);
        setAmount(String(item.amount));
        setDay(item.day_of_month);
        setWalletId(item.wallet_id);
    };

    const save = async () => {
        const value = parseFloat(amount.replace(/,/g, ''));
        if (!label.trim() || !value || value <= 0) {
            Alert.alert('Add the amount', 'Tell LogIt roughly how much comes in.');
            return;
        }
        setIsSaving(true);
        const ok = await saveExpectedIncome({ label: label.trim(), amount: value, day_of_month: day, wallet_id: walletId }, editingId);
        setIsSaving(false);
        if (!ok) {
            Alert.alert('Couldn’t save', 'Please try again.');
            return;
        }
        resetForm();
        load();
    };

    const remove = (item: ExpectedIncome) => {
        Alert.alert(`Stop expecting ${item.label}?`, 'LogIt will stop asking about it. Transactions already logged stay.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Stop',
                style: 'destructive',
                onPress: async () => {
                    await removeExpectedIncome(item.id);
                    if (editingId === item.id) resetForm();
                    load();
                },
            },
        ]);
    };

    const walletName = (id: string | null) => wallets.find((w) => w.id === id)?.name ?? 'Any wallet';

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
                <Text className="text-[20px] font-manrope-bold text-slate-900">Expected income</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
                    <Text className="text-[15px] font-manrope text-slate-500 leading-6 mb-6">
                        Some banks don’t text when money comes in. Tell LogIt what you expect, and on the day it’ll ask if it arrived. One tap logs it.
                    </Text>

                    {isLoading ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        items.map((item) => (
                            <Pressable
                                key={item.id}
                                onPress={() => edit(item)}
                                className={`flex-row items-center gap-4 p-4 rounded-[24px] mb-3 border ${editingId === item.id ? 'border-[#DAE2FF] bg-[#F8FAFF]' : 'border-slate-100 bg-white'}`}
                            >
                                <View className="w-11 h-11 rounded-full bg-emerald-50 items-center justify-center">
                                    <HugeiconsIcon icon={MoneyReceive01Icon} size={22} color="#10B981" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[16px] font-manrope-bold text-slate-900">{item.label}</Text>
                                    <Text className="text-[13px] font-manrope text-slate-500">
                                        About {formatCurrency(item.amount)} · {ordinal(item.day_of_month)} of the month · {walletName(item.wallet_id)}
                                    </Text>
                                </View>
                                <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={`Remove ${item.label}`}>
                                    <HugeiconsIcon icon={Delete02Icon} size={20} color="#94A3B8" />
                                </Pressable>
                            </Pressable>
                        ))
                    )}

                    {/* Form */}
                    <View className="mt-4 p-5 rounded-[28px] border border-slate-100 bg-[#FBFCFF]">
                        <Text className="text-[13px] font-manrope-bold text-slate-400 uppercase tracking-[1.5px] mb-4">
                            {editingId ? 'Edit' : 'Add expected income'}
                        </Text>

                        <Text className="text-[13px] font-manrope-semibold text-slate-500 mb-1">What is it?</Text>
                        <TextInput
                            value={label}
                            onChangeText={setLabel}
                            placeholder="Salary"
                            className="h-12 px-4 rounded-2xl bg-white border border-slate-100 text-[16px] font-manrope text-slate-900 mb-4"
                        />

                        <Text className="text-[13px] font-manrope-semibold text-slate-500 mb-1">About how much? (GHS)</Text>
                        <TextInput
                            value={amount}
                            onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))}
                            placeholder="4,500"
                            keyboardType="decimal-pad"
                            className="h-12 px-4 rounded-2xl bg-white border border-slate-100 text-[16px] font-manrope text-slate-900 mb-4"
                        />

                        <Text className="text-[13px] font-manrope-semibold text-slate-500 mb-2">Usually on the</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
                            {DAYS.map((d) => (
                                <Pressable
                                    key={d}
                                    onPress={() => setDay(d)}
                                    className="h-11 min-w-[52px] px-3 rounded-full items-center justify-center border"
                                    style={{ backgroundColor: d === day ? COLORS.primary : '#FFFFFF', borderColor: d === day ? COLORS.primary : '#E2E8F0' }}
                                >
                                    <Text className={`text-[14px] font-manrope-semibold ${d === day ? 'text-white' : 'text-slate-600'}`}>{ordinal(d)}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text className="text-[13px] font-manrope-semibold text-slate-500 mb-2">Comes into</Text>
                        <View className="flex-row flex-wrap gap-2 mb-5">
                            {wallets.map((w) => (
                                <Pressable
                                    key={w.id}
                                    onPress={() => setWalletId(w.id)}
                                    className="h-10 px-4 rounded-full items-center justify-center border"
                                    style={{ backgroundColor: w.id === walletId ? '#F0F4FF' : '#FFFFFF', borderColor: w.id === walletId ? COLORS.primary : '#E2E8F0' }}
                                >
                                    <Text className="text-[14px] font-manrope-semibold text-slate-700">{w.name}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            onPress={save}
                            disabled={isSaving}
                            className="h-12 rounded-2xl items-center justify-center"
                            style={({ pressed }) => ({ backgroundColor: COLORS.primary, opacity: pressed || isSaving ? 0.85 : 1 })}
                        >
                            <Text className="text-white font-manrope-bold text-[15px]">{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Save'}</Text>
                        </Pressable>
                        {editingId && (
                            <Pressable onPress={resetForm} className="h-11 items-center justify-center mt-1">
                                <Text className="font-manrope-semibold text-[14px] text-slate-500">Cancel</Text>
                            </Pressable>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
