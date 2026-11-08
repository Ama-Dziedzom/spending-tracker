import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft01Icon, InboxIcon, Message01Icon } from '@hugeicons/core-free-icons';
import { AddTransactionBottomSheet } from '../components/add-transaction-bottom-sheet';
import { COLORS } from '../constants/theme';
import {
    ReviewItem,
    ReviewPrefill,
    dismissReview,
    getPendingReviews,
    prefillFor,
    resolveReview,
} from '../lib/review-service';
import { useLiveRefresh } from '../lib/useLiveRefresh';

function formatReceived(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Today, ${time}`;
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

export default function ReviewScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [active, setActive] = useState<{ item: ReviewItem; prefill: ReviewPrefill } | null>(null);

    const load = useCallback(async () => {
        const data = await getPendingReviews();
        setItems(data);
        setIsLoading(false);
        setRefreshing(false);
    }, []);

    useLiveRefresh(() => load(), 'review');
    useEffect(() => {
        load();
    }, [load]);

    const handleDismiss = async (id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        const ok = await dismissReview(id);
        if (!ok) load();
    };

    const handleSaved = async (transactionId?: string) => {
        if (!active) return;
        const id = active.item.id;
        setItems((prev) => prev.filter((i) => i.id !== id));
        setActive(null);
        await resolveReview(id, transactionId);
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 pt-2 pb-4 flex-row items-center gap-3">
                <Pressable
                    onPress={() => router.back()}
                    className="w-11 h-11 rounded-full bg-[#F8FAFF] items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={COLORS.text.primary} />
                </Pressable>
                <Text className="text-[20px] font-manrope-bold text-slate-900">Needs review</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                <Text className="text-[15px] font-manrope text-slate-500 leading-6 mb-6">
                    LogIt couldn’t read these messages on its own. Add the real transactions in a few taps, and skip anything that isn’t one.
                </Text>

                {isLoading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : items.length === 0 ? (
                    <View className="items-center mt-16 px-6">
                        <View className="w-16 h-16 rounded-full bg-[#F8FAFF] items-center justify-center mb-4">
                            <HugeiconsIcon icon={InboxIcon} size={30} color={COLORS.primary} />
                        </View>
                        <Text className="text-[18px] font-manrope-bold text-slate-900 mb-1">All caught up</Text>
                        <Text className="text-[15px] font-manrope text-slate-500 text-center leading-6">
                            Messages LogIt can’t read will show up here, so nothing gets lost.
                        </Text>
                    </View>
                ) : (
                    items.map((item) => {
                        const guess = prefillFor(item);
                        return (
                            <View key={item.id} className="bg-[#F8FAFF] border border-[#DAE2FF] rounded-[24px] p-5 mb-4">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <HugeiconsIcon icon={Message01Icon} size={16} color={COLORS.text.secondary} />
                                    <Text className="text-[13px] font-manrope-semibold text-slate-500">
                                        {formatReceived(item.created_at)}
                                    </Text>
                                    {guess.amount ? (
                                        <Text className="ml-auto text-[15px] font-manrope-bold text-slate-900">
                                            GHS {guess.amount}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text className="text-[14px] font-manrope text-slate-700 leading-[21px] mb-4" numberOfLines={6}>
                                    {item.raw_sms}
                                </Text>
                                <View className="flex-row items-center gap-3">
                                    <Pressable
                                        onPress={() => setActive({ item, prefill: guess })}
                                        className="flex-1 h-[48px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: COLORS.primary }}
                                        accessibilityRole="button"
                                    >
                                        <Text className="text-white text-[15px] font-manrope-bold">Add it</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleDismiss(item.id)}
                                        className="flex-1 h-[48px] rounded-full items-center justify-center border border-[#DAE2FF] bg-white"
                                        accessibilityRole="button"
                                    >
                                        <Text className="text-slate-600 text-[15px] font-manrope-semibold">Not a transaction</Text>
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <AddTransactionBottomSheet
                isVisible={!!active}
                onClose={() => setActive(null)}
                onSuccess={handleSaved}
                prefill={active ? { ...active.prefill, rawSms: active.item.raw_sms } : undefined}
            />
        </View>
    );
}
