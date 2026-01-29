import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowLeft02Icon,
    BankIcon,
    Wallet01Icon,
    Wallet03Icon,
    Calendar01Icon,
    FilterIcon,
} from '@hugeicons/core-free-icons';
import { TransactionWithWallet, formatCurrency, formatTransactionDate } from '../lib/transaction-service';
import { Transaction, supabase } from '../lib/supabase';
import { TransactionDetailBottomSheet } from '../components/transaction-detail-bottom-sheet';
import { getCategoryById, getCategoryColor, getCategoryIcon, getCategoryByIdOrName } from '../lib/categories';

const PAGE_SIZE = 20;

// Group transactions by date
function groupTransactionsByDate(transactions: TransactionWithWallet[]): { date: string; transactions: TransactionWithWallet[] }[] {
    const groups: { [key: string]: TransactionWithWallet[] } = {};

    transactions.forEach(tx => {
        const date = new Date(tx.created_at);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
    });

    // Convert to array and sort by date descending
    return Object.entries(groups)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, transactions]) => ({ date, transactions }));
}

// Format date for section headers
function formatSectionDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TransactionsPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [transactions, setTransactions] = useState<TransactionWithWallet[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Transaction Detail State
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithWallet | null>(null);
    const [isDetailVisible, setIsDetailVisible] = useState(false);

    const fetchTransactions = async (pageNum: number = 0, append: boolean = false) => {
        try {
            const from = pageNum * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await supabase
                .from('transactions')
                .select(`
                    *,
                    wallet:wallets(*),
                    transfer:transfers(
                        *,
                        from_wallet:wallets!from_wallet_id(*),
                        to_wallet:wallets!to_wallet_id(*)
                    )
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error('Error fetching transactions:', error);
                return;
            }

            const newTransactions = data || [];

            if (append) {
                setTransactions(prev => [...prev, ...newTransactions]);
            } else {
                setTransactions(newTransactions);
            }

            // Check if there are more transactions to load
            const totalFetched = (pageNum + 1) * PAGE_SIZE;
            setHasMore(count ? totalFetched < count : false);

        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTransactions(0);
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        fetchTransactions(0);
    }, []);

    const loadMore = () => {
        if (!isLoadingMore && hasMore) {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchTransactions(nextPage, true);
        }
    };

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 100;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMore();
        }
    };

    const groupedTransactions = groupTransactionsByDate(transactions);

    const renderTransactionItem = useCallback((tx: TransactionWithWallet) => {
        const effectiveCategory = (tx.is_transfer && (!tx.category || tx.category === 'transfer')) ? 'transfer' : (tx.category || 'other');
        const category = getCategoryByIdOrName(effectiveCategory);
        const categoryColor = category?.color;
        const categoryIcon = category?.icon;

        const isIncome = tx.type === 'income' || tx.type === 'credit' || (tx.is_transfer && tx.transfer_side === 'to');

        return (
            <Pressable
                key={tx.id}
                onPress={() => {
                    setSelectedTransaction(tx);
                    setIsDetailVisible(true);
                }}
                className="flex-row items-center justify-between p-4 bg-white border-[1px] border-slate-100 rounded-[20px]"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.02,
                    shadowRadius: 4,
                    elevation: 1,
                }}
            >
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                    <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: categoryColor ? `${categoryColor}15` : '#F8FAFC' }}
                    >
                        <HugeiconsIcon
                            icon={categoryIcon || (tx.wallet?.type === 'bank' ? BankIcon : tx.wallet?.type === 'momo' ? Wallet03Icon : Wallet01Icon)}
                            size={20}
                            color={isIncome ? '#10B981' : (categoryColor || '#64748B')}
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[14px] font-manrope-bold text-slate-900" numberOfLines={1}>
                            {tx.description}
                        </Text>
                        <Text className="text-[12px] font-manrope text-slate-500">
                            {tx.wallet?.name || 'Manual'}{category ? ` • ${category.name}` : ''}
                        </Text>
                    </View>
                </View>
                <Text className={`text-[16px] font-manrope-bold ${isIncome ? 'text-emerald-500' : 'text-slate-900'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount).replace('GH₵ ', '')}
                </Text>
            </Pressable>
        );
    }, [setSelectedTransaction, setIsDetailVisible]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
                {/* Header */}
                <View className="px-6 pt-4 pb-4">
                    <View className="flex-row items-center gap-4">
                        <Pressable
                            onPress={() => router.back()}
                            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
                        >
                            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} color="#1642E5" />
                        </Pressable>
                        <Text className="text-[#1642E5] font-manrope-bold text-[28px]">Transactions</Text>
                    </View>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#1642E5" />
                    </View>
                ) : transactions.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                            <HugeiconsIcon icon={Calendar01Icon} size={32} color="#94A3B8" />
                        </View>
                        <Text className="text-[20px] font-manrope-bold text-slate-900 mb-2">No transactions yet</Text>
                        <Text className="text-[16px] font-manrope text-slate-500 text-center">
                            Your transactions will appear here once you start tracking
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={400}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#1642E5"
                                colors={['#1642E5']}
                            />
                        }
                    >
                        {groupedTransactions.map((group) => (
                            <View key={group.date} className="mb-6">
                                {/* Date Header */}
                                <View className="flex-row items-center gap-2 mb-4">
                                    <HugeiconsIcon icon={Calendar01Icon} size={16} color="#94A3B8" />
                                    <Text className="text-[14px] font-manrope-semibold text-slate-500">
                                        {formatSectionDate(group.date)}
                                    </Text>
                                </View>

                                {/* Transactions for this date */}
                                <View className="gap-3">
                                    {group.transactions.map(renderTransactionItem)}
                                </View>
                            </View>
                        ))}

                        {/* Load More Indicator */}
                        {isLoadingMore && (
                            <View className="py-4 items-center">
                                <ActivityIndicator size="small" color="#1642E5" />
                            </View>
                        )}

                        {!hasMore && transactions.length > 0 && (
                            <View className="py-4 items-center">
                                <Text className="text-[14px] font-manrope text-slate-400">
                                    You've reached the end
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                <TransactionDetailBottomSheet
                    isVisible={isDetailVisible}
                    transaction={selectedTransaction}
                    onClose={() => {
                        setIsDetailVisible(false);
                        setSelectedTransaction(null);
                    }}
                    onCategoryUpdated={() => fetchTransactions(0)}
                />
            </View>
        </GestureHandlerRootView>
    );
}
