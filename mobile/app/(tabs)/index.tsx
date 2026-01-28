import { View, Text, Image, Pressable, ScrollView, Linking, Platform, RefreshControl } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
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
            Linking.openURL('sms:').catch(() => { });
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

            // Wait for sheet to be mostly closed before refreshing data to avoid layout jumps/stuck backdrop
            setTimeout(() => {
                fetchData();
            }, 800);

        } catch (error) {
            console.error('Error saving wallet:', error);
            Alert.alert('Error', 'Failed to save your wallet. Please try again.');
        } finally {
            setIsSavingWallet(false);
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#1642E5"
                        colors={['#1642E5']}
                    />
                }
            >
                {/* Header */}
                <View className="flex-row items-center mt-4 mb-8">
                    <View className="w-12 h-12 rounded-full overflow-hidden mr-3">
                        <Image
                            source={require('../../assets/images/ama-avatar.png')}
                            className="w-full h-full"
                        />
                    </View>
                    <View>
                        <Text className="text-[16px] font-manrope text-slate-500">{getGreeting()}</Text>
                        <Text className="text-[24px] font-manrope-bold text-slate-900">Hi, Ama</Text>
                    </View>
                </View>

                {/* Smart Detection Banner */}
                {!isLoading && unmatchedCount > 0 && (
                    <Pressable
                        onPress={() => setIsLinkSheetVisible(true)}
                        className="bg-[#F8FAFF] border-[1px] border-[#DAE2FF] rounded-[24px] p-5 mb-8 flex-row items-center gap-4"
                    >
                        <View className="w-12 h-12 rounded-full bg-[#1642E5]/10 items-center justify-center">
                            <HugeiconsIcon icon={AiMagicIcon} size={24} color="#1642E5" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[16px] font-manrope-bold text-slate-900">
                                {unmatchedCount} smart detections
                            </Text>
                            <Text className="text-[14px] font-manrope text-slate-500">
                                Assign them to a wallet for proper tracking
                            </Text>
                        </View>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#1642E5" />
                    </Pressable>
                )}

                {/* Balance Section or Empty State */}
                {isLoading ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator size="large" color="#1642E5" />
                    </View>
                ) : wallets.length === 0 ? (
                    <View className="items-center mb-14 mt-16">
                        <View style={{ opacity: 1 }}>
                            <Image
                                source={require('../../assets/images/no-wallets.png')}
                                style={{ width: 220, height: 125, marginBottom: 24 }}
                                resizeMode="contain"
                            />
                        </View>
                        <Text className="text-[24px] font-manrope-semibold text-[#1642E5] mt-2">
                            No wallets yet
                        </Text>
                        <Text className="text-[16px] font-manrope text-[#6887F6] text-center mt-2 px-10">
                            Track your spending instantly.{"\n"}Get started by:
                        </Text>
                    </View>
                ) : (
                    <View className="bg-[#1642E5] rounded-[32px] p-8 mb-10 overflow-hidden relative">
                        {/* Background Circles */}
                        <View className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
                        <View className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/5" />

                        <Text className="text-white/60 text-[14px] font-manrope-bold uppercase tracking-widest mb-2">
                            TOTAL BALANCE
                        </Text>
                        <View className="flex-row items-baseline">
                            <Text className="text-white text-[16px] font-manrope-semibold mr-1">GHS</Text>
                            <Text className="text-white text-[48px] font-manrope-bold">
                                {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Wallets Quick Access (if wallets exist) */}
                {wallets.length > 0 && !isLoading && (
                    <View className="mb-10">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[20px] font-manrope-bold text-slate-900">My Wallets</Text>
                            <Pressable onPress={() => router.push('/wallets')}>
                                <Text className="text-[#1642E5] font-manrope-semibold">See all</Text>
                            </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                            {wallets.map((wallet) => (
                                <Pressable
                                    key={wallet.id}
                                    className="bg-white border-[1.5px] border-[#F1F1F1] rounded-[20px] p-5 mr-4 w-[160px]"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.02,
                                        shadowRadius: 10,
                                        elevation: 1,
                                    }}
                                >
                                    <View className="w-10 h-10 rounded-full bg-[#EFF6FF] items-center justify-center mb-4">
                                        <HugeiconsIcon
                                            icon={wallet.type === 'bank' ? BankIcon : wallet.type === 'momo' ? Wallet03Icon : Wallet01Icon}
                                            size={20}
                                            color="#1642E5"
                                        />
                                    </View>
                                    <Text className="text-[12px] font-manrope-medium text-[#7C7D80] mb-1 leading-tight" numberOfLines={1}>
                                        {wallet.name}
                                    </Text>
                                    <Text className="text-[16px] font-manrope-bold text-[#5B5B5B]">
                                        {Number(wallet.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Recent Transactions Section */}
                {transactions.length > 0 && !isLoading && (
                    <View className="mb-10">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-[20px] font-manrope-bold text-slate-900">Recent Transactions</Text>
                            <Pressable onPress={() => router.push('/transactions')}>
                                <Text className="text-[#1642E5] font-manrope-semibold">See all</Text>
                            </Pressable>
                        </View>
                        <View className="gap-4">
                            {transactions.map((tx) => (
                                <Pressable
                                    key={tx.id}
                                    onPress={() => {
                                        setSelectedTransactionForDetail(tx);
                                        setIsTransactionDetailVisible(true);
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
                                            style={{
                                                backgroundColor: getCategoryByIdOrName(tx.category)?.color
                                                    ? `${getCategoryByIdOrName(tx.category)?.color}15`
                                                    : 'rgba(244, 63, 94, 0.05)'
                                            }}
                                        >
                                            <HugeiconsIcon
                                                icon={getCategoryByIdOrName(tx.category)?.icon || (tx.wallet?.type === 'bank' ? BankIcon : tx.wallet?.type === 'momo' ? Wallet03Icon : Wallet01Icon)}
                                                size={20}
                                                color={(tx.type === 'income' || tx.type === 'credit') ? '#10B981' : (getCategoryByIdOrName(tx.category)?.color || '#F43F5E')}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[14px] font-manrope-bold text-slate-900" numberOfLines={1}>
                                                {tx.description}
                                            </Text>
                                            <Text className="text-[12px] font-manrope text-slate-500">
                                                {formatTransactionDate(tx.created_at)} • {tx.wallet?.name || 'Manual'}{getCategoryByIdOrName(tx.category) ? ` • ${getCategoryByIdOrName(tx.category)?.name}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className={`text-[16px] font-manrope-bold ${(tx.type === 'income' || tx.type === 'credit') ? 'text-emerald-500' : 'text-slate-900'}`}>
                                        {(tx.type === 'income' || tx.type === 'credit') ? '+' : '-'}{formatCurrency(tx.amount).replace('GH₵ ', '')}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View className="gap-8">
                    {transactions.length === 0 && (
                        <>
                            {/* Recommended: SMS Tracking - Only if no transactions yet */}
                            <Pressable
                                onPress={handleOpenMessages}
                                className="bg-[#1642E5] rounded-[32px] p-6 relative overflow-hidden"
                            >
                                {/* Background pattern */}
                                <View className="absolute -right-16 -top-12 opacity-[0.07]">
                                    <HugeiconsIcon icon={Message02Icon} size={202} color="white" fill="white" />
                                </View>

                                <View className="flex-row justify-between items-start mb-6">
                                    <View className="w-12 h-12 rounded-full bg-white items-center justify-center">
                                        <HugeiconsIcon icon={Message02Icon} size={24} color="#1642E5" />
                                    </View>
                                    <View className="bg-white/10 rounded-full px-3 py-2 flex-row items-center gap-1">
                                        <HugeiconsIcon icon={AiMagicIcon} size={14} color="white" />
                                        <Text className="text-white text-[12px] font-manrope-semibold">Recommended</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-end justify-between">
                                    <View className="flex-1 mr-4">
                                        <Text className="text-white text-[20px] font-manrope-bold mb-1">
                                            Share a transaction SMS
                                        </Text>
                                        <Text className="text-white/80 text-[16px] font-manrope">
                                            Log SMS transaction to auto-create
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
                                className="border-2 border-dashed border-slate-200 rounded-[24px] p-6 flex-row items-center gap-4"
                            >
                                <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center">
                                    <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} color="#64748B" />
                                </View>
                                <Text className="text-[18px] font-manrope-semibold text-slate-500">
                                    Add wallet manually
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </ScrollView>

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
                    // Small delay before refresh
                    setTimeout(() => fetchData(), 500);
                }}
                isLoading={isSavingWallet}
                initialBalanceFromTransaction={activeTransaction?.amount?.toString()}
            />

            <TransactionDetailBottomSheet
                isVisible={isTransactionDetailVisible}
                transaction={selectedTransactionForDetail}
                onClose={() => {
                    setIsTransactionDetailVisible(false);
                    setSelectedTransactionForDetail(null);
                }}
                onCategoryUpdated={fetchData}
            />
        </View>
    );
}
