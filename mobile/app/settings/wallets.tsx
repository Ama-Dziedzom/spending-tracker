import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Wallet, getUnmatchedSources, mapSourceToName } from '@/lib/wallet-service';
import { WalletCreationSheet } from '@/components/wallet-creation-sheet';

export default function WalletsSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [unmatched, setUnmatched] = useState<{ source: string, count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // Bottom Sheet State
    const [showSheet, setShowSheet] = useState(false);
    const [activeSource, setActiveSource] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('wallets').select('*').eq('is_active', true);
        setWallets(data || []);

        const unmatchedSources = await getUnmatchedSources();
        setUnmatched(unmatchedSources);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 mb-8">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100">
                    <ChevronLeft size={24} color="#000" />
                </Pressable>
                <Text className="text-xl font-heading text-slate-900">Wallets</Text>
                <Pressable onPress={() => router.push('/onboarding')} className="p-2 -mr-2 rounded-full active:bg-slate-100">
                    <Plus size={24} color="#0F4CFF" />
                </Pressable>
            </View>

            <ScrollView className="flex-1 px-6">
                {/* Unmatched Transactions Section */}
                {unmatched.length > 0 && (
                    <View className="mb-10">
                        <View className="flex-row items-center gap-2 mb-4">
                            <AlertTriangle size={20} color="#D97706" />
                            <Text className="text-lg font-heading text-amber-900">Unmatched Transactions</Text>
                        </View>
                        <View className="gap-4">
                            {unmatched.map((item) => (
                                <View
                                    key={item.source}
                                    className="bg-amber-50 border-[1.5px] border-amber-100 rounded-[32px] p-5 flex-row items-center justify-between"
                                >
                                    <View className="flex-1">
                                        <Text className="font-heading text-[17px] text-amber-900">{mapSourceToName(item.source)}</Text>
                                        <Text className="font-ui text-[14px] text-amber-700">{item.count} transactions</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            setActiveSource(item.source);
                                            setShowSheet(true);
                                        }}
                                        className="bg-white px-4 py-2 rounded-full border border-amber-200"
                                    >
                                        <Text className="text-amber-700 font-heading text-[14px]">Create Wallet</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* My Wallets Section */}
                <View className="mb-10">
                    <Text className="text-lg font-heading text-slate-900 mb-4">My Wallets</Text>
                    <View className="gap-4">
                        {wallets.map((wallet) => (
                            <View
                                key={wallet.id}
                                className="bg-white border-[1.5px] border-[#DEE6FF] rounded-[32px] p-5 flex-row items-center gap-4"
                            >
                                <View className="w-12 h-12 rounded-2xl bg-[#F5F8FF] items-center justify-center">
                                    <Text className="text-xl">{wallet.icon}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-heading text-[17px] text-slate-900">{wallet.name}</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Text className="font-ui text-[13px] text-slate-400 capitalize">{wallet.type}</Text>
                                        <View className="w-1 h-1 rounded-full bg-slate-200" />
                                        <Text className="font-ui text-[13px] text-slate-400">0 transactions</Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="font-numbers text-[17px] text-slate-900">GHS {wallet.current_balance.toFixed(2)}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <WalletCreationSheet
                visible={showSheet}
                source={activeSource}
                onClose={() => setShowSheet(false)}
                onCreated={fetchData}
            />
        </View>
    );
}
