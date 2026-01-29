import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Modal, Dimensions } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowLeft02Icon,
    ArrowDown02Icon
} from '@hugeicons/core-free-icons';
import { getWalletAnalytics, getTransactionsByWallet, WalletAnalytics, TransactionWithWallet } from '../lib/transaction-service';
import { Wallet, supabase } from '../lib/supabase';
import { getCategoryColor, getCategoryIcon } from '../lib/categories';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TransactionDetailBottomSheet } from '../components/transaction-detail-bottom-sheet';

// Helper for money formatting
const formatMoney = (amount: any) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function WalletDetailsPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { walletId } = useLocalSearchParams<{ walletId: string }>();

    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletAnalytics, setWalletAnalytics] = useState<WalletAnalytics | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<TransactionWithWallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Transaction Detail State
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithWallet | null>(null);
    const [isDetailVisible, setIsDetailVisible] = useState(false);

    const fetchData = useCallback(async () => {
        if (!walletId) return;

        try {
            // Fetch wallet info
            const { data: walletData, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('id', walletId)
                .single();

            if (walletError) throw walletError;
            setWallet(walletData);

            const [analytics, transactions] = await Promise.all([
                getWalletAnalytics(walletId),
                getTransactionsByWallet(walletId)
            ]);

            setWalletAnalytics(analytics);
            setWalletTransactions(transactions);
        } catch (error) {
            console.error('Error fetching wallet details:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [walletId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (isLoading && !refreshing) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#0F4CFF" />
            </View>
        );
    }

    if (!wallet) {
        return (
            <View className="flex-1 bg-white items-center justify-center px-6">
                <Text className="text-xl font-manrope-bold text-slate-900">Wallet not found</Text>
                <Pressable onPress={() => router.back()} className="mt-4 bg-blue-600 px-6 py-3 rounded-2xl">
                    <Text className="text-white font-manrope-semibold">Go Back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#0F4CFF]">
            {/* Top section with Splash color / Gradient */}
            <LinearGradient
                colors={['#0F4CFF', '#1642E5', '#0E1F5B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="pb-20"
                style={{ height: Dimensions.get('window').height * 0.45, paddingTop: insets.top + 16 }}
            >
                {/* Header Nav */}
                <View className="flex-row items-center justify-between mb-10 px-8">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-11 h-11 bg-white/15 rounded-full items-center justify-center -ml-[11px]"
                    >
                        <HugeiconsIcon icon={ArrowLeft02Icon} size={22} color="#FFFFFF" />
                    </Pressable>
                </View>

                <View className="items-center px-8">
                    <Text className="text-white/80 text-[16px] font-manrope-bold mb-0.5 uppercase tracking-widest text-center">
                        {wallet.name} Balance
                    </Text>
                    <Text className="text-white text-[60px] font-manrope-bold mb-6 tracking-tight text-center">
                        GHS {formatMoney(wallet.current_balance)}
                    </Text>

                    <View className="flex-row items-center justify-center gap-8 w-full">
                        <View className="items-center">
                            <View className="flex-row items-center gap-2 mb-1">
                                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                                <Text className="text-white text-[18px] font-manrope-bold">
                                    GHS {formatMoney(walletAnalytics?.totalInflow)}
                                </Text>
                            </View>
                            <Text className="text-white/60 text-[12px] font-manrope-semibold uppercase tracking-wider">Total Inflow</Text>
                        </View>

                        <View className="w-[1px] h-6 bg-white/10" />

                        <View className="items-center">
                            <View className="flex-row items-center gap-2 mb-1">
                                <View className="w-2 h-2 rounded-full bg-rose-400" />
                                <Text className="text-white text-[18px] font-manrope-bold">
                                    GHS {formatMoney(walletAnalytics?.totalSpent)}
                                </Text>
                            </View>
                            <Text className="text-white/60 text-[12px] font-manrope-semibold uppercase tracking-wider">Total Outflow</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Bottom Sheet Section */}
            <View
                className="flex-1 bg-white -mt-12 rounded-t-[48px] pt-8 px-6 pb-10"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.2,
                    shadowRadius: 30,
                    elevation: 20
                }}
            >
                {/* Handle Bar */}
                <View className="w-14 h-1.5 bg-slate-100 rounded-full self-center mb-8" />

                <View className="flex-row items-center justify-between mb-8 px-2">
                    <View>
                        <Text className="text-[24px] font-manrope-bold text-slate-900">Spent Category</Text>
                        <Text className="text-slate-400 font-manrope-medium text-[14px]">
                            Breakdown of your expenses
                        </Text>
                    </View>
                    <Pressable className="bg-slate-50 px-4 py-2 rounded-2xl flex-row items-center gap-2">
                        <Text className="text-slate-600 text-[14px] font-manrope-semibold">Daily</Text>
                        <HugeiconsIcon icon={ArrowDown02Icon} size={16} color="#475569" />
                    </Pressable>
                </View>

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#0F4CFF"
                        />
                    }
                >
                    {(walletAnalytics?.categorySpending.length || 0) > 0 ? (
                        <View className="gap-6">
                            {walletAnalytics?.categorySpending.map((item, index) => (
                                <Animated.View
                                    key={item.category}
                                    {...{ entering: FadeInDown.delay(index * 100) } as any}
                                    className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 mb-2"
                                >
                                    <View className="flex-row items-start justify-between mb-6">
                                        <View className="flex-row items-center gap-4">
                                            <View
                                                className="w-14 h-14 rounded-full items-center justify-center"
                                                style={{ backgroundColor: `${getCategoryColor(item.category)}15` }}
                                            >
                                                <HugeiconsIcon
                                                    icon={getCategoryIcon(item.category)}
                                                    size={26}
                                                    color={getCategoryColor(item.category)}
                                                />
                                            </View>
                                            <View>
                                                <Text className="text-[18px] font-manrope-bold text-slate-900">{item.category}</Text>
                                                <Text className="text-slate-400 font-manrope-medium text-[15px]">
                                                    GHS {formatMoney(item.amount)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center gap-2">
                                            <View
                                                className="px-3 py-2 rounded-2xl"
                                                style={{ backgroundColor: `${getCategoryColor(item.category)}15` }}
                                            >
                                                <Text
                                                    className="text-[13px] font-manrope-bold"
                                                    style={{ color: getCategoryColor(item.category) }}
                                                >
                                                    {item.percentage.toFixed(1)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <View
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: getCategoryColor(item.category)
                                            }}
                                        />
                                    </View>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View className="py-20 items-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                            <Text className="text-[16px] text-slate-400 font-manrope">No tracked spending yet</Text>
                        </View>
                    )}

                    {/* Recent Activity Section */}
                    <View className="mt-12 mb-6">
                        <Text className="text-[24px] font-manrope-bold text-slate-900 mb-2 px-2">Wallet Activity</Text>
                        <Text className="text-slate-400 font-manrope-medium text-[14px] mb-6 px-2">
                            List of your recent transactions
                        </Text>

                        {walletTransactions.length > 0 ? (
                            <View className="gap-3">
                                {walletTransactions.map((tx, index) => {
                                    const effectiveCategory = (tx.is_transfer && (!tx.category || tx.category === 'transfer')) ? 'transfer' : (tx.category || 'other');
                                    const isIncome = tx.type === 'income' || tx.type === 'credit' || (tx.is_transfer && tx.transfer_side === 'to');

                                    return (
                                        <Pressable
                                            key={tx.id}
                                            onPress={() => {
                                                setSelectedTransaction(tx);
                                                setIsDetailVisible(true);
                                            }}
                                        >
                                            <Animated.View
                                                {...{ entering: FadeInDown.delay(index * 50) } as any}
                                                className="bg-white rounded-[24px] p-4 flex-row items-center justify-between border border-slate-50 shadow-sm mb-3"
                                            >
                                                <View className="flex-row items-center gap-4 flex-1">
                                                    <View
                                                        className="w-12 h-12 rounded-full items-center justify-center"
                                                        style={{ backgroundColor: `${getCategoryColor(effectiveCategory)}15` }}
                                                    >
                                                        <HugeiconsIcon
                                                            icon={getCategoryIcon(effectiveCategory)}
                                                            size={22}
                                                            color={getCategoryColor(effectiveCategory)}
                                                        />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-[16px] font-manrope-bold text-slate-900" numberOfLines={1}>
                                                            {tx.description}
                                                        </Text>
                                                        <Text className="text-slate-400 font-manrope-medium text-[13px]">
                                                            {new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text className={`text-[16px] font-manrope-bold ${isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>
                                                    {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
                                                </Text>
                                            </Animated.View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ) : (
                            <View className="py-10 items-center justify-center bg-slate-50 rounded-[24px] border border-dashed border-slate-100">
                                <Text className="text-slate-400 font-manrope">No activity recorded</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            <TransactionDetailBottomSheet
                isVisible={isDetailVisible}
                transaction={selectedTransaction}
                onClose={() => {
                    setIsDetailVisible(false);
                    setSelectedTransaction(null);
                }}
                onCategoryUpdated={fetchData}
            />
        </View>
    );
}
