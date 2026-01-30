import { View, Text, Image, Pressable, ScrollView, Linking, Platform, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Message02Icon,
    AiMagicIcon,
    ArrowRight01Icon,
    AddCircleHalfDotIcon,
    Wallet01Icon,
    BankIcon,
    Wallet03Icon,
    Alert01Icon,
    Notification01Icon,
    Calendar01Icon,
} from '@hugeicons/core-free-icons';
import { getWallets, getTotalBalance } from '../../lib/wallet-service';
import { getRecentTransactions, TransactionWithWallet, formatCurrency, formatTransactionDate, formatTransactionTime, processTransfer, getCategoryByIdOrName } from '../../lib/transaction-service';
import { Wallet, supabase, Transaction } from '../../lib/supabase';
import { ActivityIndicator, Alert } from 'react-native';
import { LinkTransactionsBottomSheet } from '../../components/link-transactions-bottom-sheet';
import { SelectWalletTypeBottomSheet } from '../../components/select-wallet-type-bottom-sheet';
import { ConfigureWalletBottomSheet } from '../../components/configure-wallet-bottom-sheet';
import { TransactionDetailBottomSheet } from '../../components/transaction-detail-bottom-sheet';
import { createWallets, CreateWalletInput } from '../../lib/wallet-service';
import { assignTransactionToWallet } from '../../lib/transaction-service';

import { COLORS } from '../../constants/theme';

// Get greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function Dashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [transactions, setTransactions] = useState<TransactionWithWallet[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [isLinkSheetVisible, setIsLinkSheetVisible] = useState(false);

    // Wallet Creation Flow State
    const [isSelectTypeSheetVisible, setIsSelectTypeSheetVisible] = useState(false);
    const [isConfigureSheetVisible, setIsConfigureSheetVisible] = useState(false);
    const [selectedWalletTypes, setSelectedWalletTypes] = useState<string[]>([]);
    const [isSavingWallet, setIsSavingWallet] = useState(false);
    const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
    const [transferState, setTransferState] = useState<{ isTransfer: boolean, sourceId: string | null } | null>(null);

    // Transaction Detail State
    const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<TransactionWithWallet | null>(null);
    const [isTransactionDetailVisible, setIsTransactionDetailVisible] = useState(false);

    const fetchData = async () => {
        try {
            const [walletsData, balanceData, transactionsData] = await Promise.all([
                getWallets(),
                getTotalBalance(),
                getRecentTransactions(5)
            ]);

            // Get count of unmatched transactions
            const { count, error: unmatchedError } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .is('wallet_id', null);

            if (unmatchedError) console.error('Error counting unmatched transactions:', unmatchedError);

            setWallets(walletsData);
            setTotalBalance(balanceData);
            setTransactions(transactionsData);
            setUnmatchedCount(count || 0);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleOpenMessages = async () => {
        try {
            if (Platform.OS === 'ios') {
                const messagesUrl = 'messages://';
                const canOpen = await Linking.canOpenURL(messagesUrl);
                if (canOpen) {
                    await Linking.openURL(messagesUrl);
                } else {
                    await Linking.openURL('sms:');
                }
            } else {
                await Linking.openURL('sms:');
            }
        } catch (error) {
            console.error('Error opening messages:', error);
            Alert.alert('Error', 'Could not open messages app. Please open it manually to copy your transaction SMS.');
        }
    };

    const handleCreateWalletFromLink = (tx: Transaction, isTransfer?: boolean, sourceId?: string | null) => {
        setActiveTransaction(tx);
        setTransferState(isTransfer ? { isTransfer, sourceId: sourceId || null } : null);
        setIsLinkSheetVisible(false);
        // Delay to allow link sheet to close
        setTimeout(() => {
            setIsSelectTypeSheetVisible(true);
        }, 800);
    };

    const handleSelectType = (types: string[]) => {
        setSelectedWalletTypes(types);
        setIsSelectTypeSheetVisible(false);
        setTimeout(() => {
            setIsConfigureSheetVisible(true);
        }, 800);
    };

    const handleConfigureWallet = async (data: any) => {
        setIsSavingWallet(true);
        try {
            const amount = activeTransaction ? Number(activeTransaction.amount) : 0;
            const isIncome = activeTransaction ? (activeTransaction.type === 'income' || activeTransaction.type === 'credit') : false;
            const desc = activeTransaction?.description?.toLowerCase() || '';

            // Determine target wallet type for adjustment to avoid double counting
            let targetTypeForAdjustment: string | null = null;
            if (activeTransaction) {
                if (selectedWalletTypes.length === 1) {
                    targetTypeForAdjustment = selectedWalletTypes[0];
                } else {
                    const isMomo = desc.includes('mtn') || desc.includes('momo') || desc.includes('telecel') || desc.includes('vodafone');
                    if (isMomo && selectedWalletTypes.includes('momo')) targetTypeForAdjustment = 'momo';
                    else if (!isMomo && selectedWalletTypes.includes('bank')) targetTypeForAdjustment = 'bank';
                    else targetTypeForAdjustment = selectedWalletTypes[0];
                }
            }

            const walletsToCreate: CreateWalletInput[] = [];

            if (data.momo) {
                let balance = parseFloat(data.momo.balance.toString().replace(/[^0-9.]/g, '')) || 0;
                // If this is the target wallet, adjust initial balance because assignTransactionToWallet will also apply it
                if (targetTypeForAdjustment === 'momo') {
                    balance = isIncome ? balance - amount : balance + amount;
                }

                walletsToCreate.push({
                    name: 'Mobile Money',
                    type: 'momo',
                    icon: 'wallet-03',
                    color: '#1642E5',
                    initial_balance: balance,
                    source_identifier: data.momo.provider,
                });
            }

            if (data.bank) {
                let balance = parseFloat(data.bank.balance.toString().replace(/[^0-9.]/g, '')) || 0;
                if (targetTypeForAdjustment === 'bank') {
                    balance = isIncome ? balance - amount : balance + amount;
                }

                walletsToCreate.push({
                    name: data.bank.name || 'Bank Wallet',
                    type: 'bank',
                    icon: 'bank',
                    color: '#1642E5',
                    initial_balance: balance,
                });
            }

            if (data.cash) {
                let balance = parseFloat(data.cash.balance.toString().replace(/[^0-9.]/g, '')) || 0;
                if (targetTypeForAdjustment === 'cash') {
                    balance = isIncome ? balance - amount : balance + amount;
                }

                walletsToCreate.push({
                    name: data.cash.name || 'Cash Wallet',
                    type: 'cash',
                    icon: 'money-01',
                    color: '#1642E5',
                    initial_balance: balance,
                });
            }

            let createdWallets: Wallet[] = [];
            if (walletsToCreate.length > 0) {
                createdWallets = await createWallets(walletsToCreate);
            }

            // If we are coming from a detected transaction, link it to the most relevant wallet
            if (activeTransaction && createdWallets.length > 0) {
                // Find the best wallet factor to link to (e.g. MoMo transaction to MoMo wallet)
                let targetWallet = createdWallets[0];

                if (createdWallets.length > 1) {
                    const isMomo = desc.includes('mtn') || desc.includes('momo') || desc.includes('telecel') || desc.includes('vodafone');
                    const momoWallet = createdWallets.find(w => w.type === 'momo');
                    const bankWallet = createdWallets.find(w => w.type === 'bank');

                    if (isMomo && momoWallet) targetWallet = momoWallet;
                    else if (!isMomo && bankWallet) targetWallet = bankWallet;
                }

                if (transferState?.isTransfer) {
                    // Logic: If source was already selected, this new wallet is the DESTINATION.
                    // If source was NOT selected, this new wallet is the SOURCE.
                    // However, usually they create a wallet because it's the one that RECEIVED or SENT the money.

                    if (transferState.sourceId) {
                        // We have a source, so this is to the NEW wallet
                        await processTransfer(
                            activeTransaction.id,
                            transferState.sourceId,
                            targetWallet.id,
                            Number(activeTransaction.amount),
                            activeTransaction.description
                        );
                    } else {
                        // This new wallet is the source, but we don't have a destination yet.
                        // In this case, maybe we should just assign it?
                        // Or better: for now, assume single assignment if flow is interrupted.
                        // But let's try to be smart: if it's a transfer, we usually need the other side.
                        await assignTransactionToWallet(activeTransaction.id, targetWallet.id);
                    }
                } else {
                    await assignTransactionToWallet(activeTransaction.id, targetWallet.id);
                }
            }

            // First handle success message and cleanup
            if (activeTransaction && createdWallets.length > 0) {
                // Small delay to allow sheet closing animation to start
                setTimeout(() => {
                    Alert.alert('Success', 'Wallet created and transaction linked!');
                }, 500);
            }

            setActiveTransaction(null);
            setTransferState(null);

        } catch (error) {
            console.error('Error saving wallet:', error);
            Alert.alert('Error', 'Failed to save your wallet. Please try again.');
        } finally {
            setIsSavingWallet(false);
        }
    };

    const handleCloseTransactionDetail = useCallback(() => {
        setIsTransactionDetailVisible(false);
        setSelectedTransactionForDetail(null);
    }, []);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />
            <LinearGradient
                colors={['#0F4CFF', '#1642E5', '#0E1F5B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FFFFFF"
                                colors={['#FFFFFF']}
                            />
                        }
                    >
                        <View style={{ paddingHorizontal: 24, paddingBottom: 60 }}>
                            {/* Header */}
                            <View className="flex-row items-center justify-between mt-4 mb-10">
                                <View>
                                    <Text className="text-[24px] font-manrope-bold text-white">Hello, Ama</Text>
                                    <Text className="text-[16px] font-manrope text-white/60">Welcome Back</Text>
                                </View>
                                <Pressable
                                    onPress={() => router.push('/notifications')}
                                    className="flex-row items-center bg-white/15 rounded-full p-1 pl-4 border border-white/10 shadow-sm"
                                >
                                    <HugeiconsIcon icon={Notification01Icon} size={20} color="#FFFFFF" />
                                    <View className="w-8 h-8 rounded-full overflow-hidden ml-3">
                                        <Image
                                            source={require('../../assets/images/ama-avatar.png')}
                                            className="w-full h-full"
                                        />
                                    </View>
                                </Pressable>
                            </View>

                            {/* Balance Section */}
                            {isLoading ? (
                                <View className="py-20 items-center">
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                </View>
                            ) : wallets.length === 0 ? (
                                <View className="items-center mb-14 mt-12">
                                    <View style={{ opacity: 1 }}>
                                        <Image
                                            source={require('../../assets/images/no-wallets.png')}
                                            style={{ width: 220, height: 125, marginBottom: 24 }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text className="text-[24px] font-manrope-bold text-white mt-2">
                                        No wallets yet
                                    </Text>
                                    <Text className="text-[16px] font-manrope text-white/60 text-center mt-2 px-10">
                                        Track your spending instantly.{"\n"}Get started by:
                                    </Text>
                                </View>
                            ) : (
                                <View className="items-center mb-4 mt-8">
                                    <Text className="text-white/60 text-[14px] font-manrope-bold uppercase tracking-[1px] mb-1">
                                        TOTAL BALANCE
                                    </Text>
                                    <Text className="text-white text-[48px] font-manrope-bold">
                                        GHS {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* White Container Content */}
                        <View className="flex-1 bg-white rounded-t-[48px] px-6 pt-2 pb-10" style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -15 },
                            shadowOpacity: 0.1,
                            shadowRadius: 20,
                            elevation: 20,
                        }}>
                            {/* Drag Handle */}
                            {/* <View className="w-12 h-1 bg-slate-100 rounded-full self-center mb-6" /> */}

                            {/* Smart Detection Banner */}
                            {!isLoading && unmatchedCount > 0 && (
                                <Pressable
                                    onPress={() => setIsLinkSheetVisible(true)}
                                    className="bg-[#F8FAFF] border-[1px] border-[#DAE2FF] rounded-[24px] p-5 mb-8 flex-row items-center gap-4"
                                >
                                    <View className="w-12 h-12 rounded-full bg-[#0F4CFF]/10 items-center justify-center">
                                        <HugeiconsIcon icon={AiMagicIcon} size={24} color="#0F4CFF" />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-[16px] font-manrope-bold text-slate-900">
                                                {unmatchedCount} smart detections
                                            </Text>
                                            <View className="bg-rose-500 w-2 h-2 rounded-full" />
                                        </View>
                                        <Text className="text-[14px] font-manrope text-slate-500">
                                            Assign them for proper tracking
                                        </Text>
                                    </View>
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#0F4CFF" />
                                </Pressable>
                            )}

                            {/* Recent Transactions Section */}
                            {transactions.length > 0 && !isLoading ? (
                                <View className="mb-6 mt-8">
                                    <View className="flex-row justify-between items-center mb-6">
                                        <Text className="text-[20px] font-manrope-bold text-slate-900">Recent Transactions</Text>
                                        <Pressable onPress={() => router.push('/transactions')}>
                                            <Text className="text-[18px] font-manrope-semibold" style={{ color: COLORS.primary }}>See all</Text>
                                        </Pressable>
                                    </View>
                                    <View className="gap-0.5">
                                        {transactions.map((tx) => {
                                            const category = getCategoryByIdOrName(tx.category);
                                            const isIncome = tx.type === 'income' || tx.type === 'credit';
                                            const categoryColor = category?.color || '#94A3B8';

                                            return (
                                                <Pressable
                                                    key={tx.id}
                                                    onPress={() => {
                                                        setSelectedTransactionForDetail(tx);
                                                        setIsTransactionDetailVisible(true);
                                                    }}
                                                    className="flex-row items-center justify-between p-4 bg-white rounded-[24px]"
                                                >
                                                    <View className="flex-row items-center gap-4 flex-1 mr-3">
                                                        <View
                                                            className="w-12 h-12 rounded-full items-center justify-center"
                                                            style={{ backgroundColor: `${categoryColor}15` }}
                                                        >
                                                            <HugeiconsIcon
                                                                icon={category?.icon || (tx.wallet?.type === 'bank' ? BankIcon : tx.wallet?.type === 'momo' ? Wallet03Icon : Wallet01Icon)}
                                                                size={20}
                                                                color={isIncome ? '#10B981' : categoryColor}
                                                            />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-[16px] font-manrope-bold text-slate-900" numberOfLines={1}>
                                                                {tx.description}
                                                            </Text>
                                                            <Text className="text-[13px] font-manrope text-slate-400">
                                                                {formatTransactionDate(tx.created_at)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text className={`text-[16px] font-manrope-bold ${isIncome ? 'text-slate-900' : 'text-rose-500'}`}>
                                                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount).replace('GH₵ ', '₵')}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ) : !isLoading && transactions.length === 0 && (
                                <View className="items-center py-20 px-8">
                                    <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
                                        <HugeiconsIcon icon={Wallet01Icon} size={32} color="#CBD5E1" />
                                    </View>
                                    <Text className="text-slate-900 font-manrope-bold text-[18px] text-center mb-2">No activity yet</Text>
                                    <Text className="text-slate-400 font-manrope text-center">Your recent transactions will show up here.</Text>
                                </View>
                            )}

                            {/* Actions - Only shown in empty states */}
                            {!isLoading && transactions.length === 0 && wallets.length > 0 && (
                                <View className="mt-4 gap-4">
                                    {/* Recommended: SMS Tracking */}
                                    <Pressable
                                        onPress={handleOpenMessages}
                                        className="bg-[#0F4CFF] rounded-[32px] p-6 relative overflow-hidden"
                                    >
                                        <View className="absolute -right-16 -top-12 opacity-[0.07]">
                                            <HugeiconsIcon icon={Message02Icon} size={202} color="white" fill="white" />
                                        </View>

                                        <View className="flex-row justify-between items-start mb-6">
                                            <View className="w-12 h-12 rounded-full bg-white items-center justify-center">
                                                <HugeiconsIcon icon={Message02Icon} size={24} color="#0F4CFF" />
                                            </View>
                                            <View className="bg-white/10 rounded-full px-3 py-2 flex-row items-center gap-1">
                                                <HugeiconsIcon icon={AiMagicIcon} size={14} color="white" />
                                                <Text className="text-white text-[12px] font-manrope-semibold">AI Detection</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-end justify-between">
                                            <View className="flex-1 mr-4">
                                                <Text className="text-white text-[20px] font-manrope-bold mb-1">
                                                    Share a transaction SMS
                                                </Text>
                                                <Text className="text-white/80 text-[16px] font-manrope">
                                                    Log SMS for auto-tracking
                                                </Text>
                                            </View>
                                            <View className="pb-1">
                                                <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="white" />
                                            </View>
                                        </View>
                                    </Pressable>

                                    {/* Manual Entry */}
                                    <Pressable
                                        onPress={() => router.push('/onboarding-link-wallet')}
                                        className="border-2 border-dashed border-slate-100 rounded-[24px] p-6 flex-row items-center gap-4"
                                    >
                                        <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center">
                                            <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} color="#64748B" />
                                        </View>
                                        <Text className="text-[18px] font-manrope-semibold text-slate-500">
                                            Add wallet manually
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </LinearGradient>

            <LinkTransactionsBottomSheet
                isVisible={isLinkSheetVisible}
                onClose={() => setIsLinkSheetVisible(false)}
                onSuccess={fetchData}
                onCreateWallet={handleCreateWalletFromLink}
            />

            <SelectWalletTypeBottomSheet
                isVisible={isSelectTypeSheetVisible}
                onClose={() => setIsSelectTypeSheetVisible(false)}
                onSelect={handleSelectType}
            />

            <ConfigureWalletBottomSheet
                isVisible={isConfigureSheetVisible}
                selectedWallets={selectedWalletTypes}
                onClose={() => setIsConfigureSheetVisible(false)}
                onConfigure={handleConfigureWallet}
                onFinish={() => {
                    setIsConfigureSheetVisible(false);
                    fetchData();
                }}
                isLoading={isSavingWallet}
                initialBalanceFromTransaction={activeTransaction?.amount?.toString()}
            />

            <TransactionDetailBottomSheet
                isVisible={isTransactionDetailVisible}
                transaction={selectedTransactionForDetail}
                onClose={handleCloseTransactionDetail}
                onCategoryUpdated={fetchData}
            />
        </View>
    );
}
