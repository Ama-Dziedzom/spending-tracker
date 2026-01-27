import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    AiMagicIcon,
    ArrowRight01Icon,
    Tick02Icon,
    Wallet01Icon,
    BankIcon,
    Wallet03Icon,
    AddCircleHalfDotIcon,
} from '@hugeicons/core-free-icons';
import { Transaction, Wallet } from '../lib/supabase';
import { getUnmatchedTransactions, assignTransactionToWallet, formatCurrency, formatTransactionDate, detectTransferInfo, processTransfer } from '../lib/transaction-service';
import { getWallets } from '../lib/wallet-service';
import { useRouter } from 'expo-router';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onCreateWallet?: (tx: Transaction) => void;
}

export function LinkTransactionsBottomSheet({ isVisible, onClose, onSuccess, onCreateWallet }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const snapPoints = useMemo(() => ['70%', '90%'], []);

    const [unmatchedTxs, setUnmatchedTxs] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [isTransferMode, setIsTransferMode] = useState(false);
    const [targetWalletId, setTargetWalletId] = useState<string | null>(null); // For transfers, the 'other' side

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [txs, walletList] = await Promise.all([
                getUnmatchedTransactions(),
                getWallets()
            ]);
            setUnmatchedTxs(txs);
            setWallets(walletList);
        } catch (error) {
            console.error('Error fetching data for linking:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isVisible) {
            fetchData();
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            bottomSheetRef.current?.close();
            setSelectedTx(null);
            setIsTransferMode(false);
            setTargetWalletId(null);
        }
    }, [isVisible]);

    useEffect(() => {
        if (selectedTx) {
            const info = detectTransferInfo(selectedTx.description);
            setIsTransferMode(info.isTransferLikely);
        }
    }, [selectedTx]);

    const handleAssign = async (walletId: string) => {
        if (!selectedTx) return;

        setIsProcessing(true);
        try {
            let success = false;

            if (isTransferMode) {
                // If it's a transfer, we need to decide which is FROM and which is TO.
                // Usually the detected SMS is the "Arrival" (TO) or the "Departure" (FROM).
                // Let's assume the wallet the user selects in the list is the OTHER side.
                const info = detectTransferInfo(selectedTx.description);

                // If the description mentions "credited" or "received", the current tx is likely the 'TO' side.
                const isToSide = /credit|received|inflow/i.test(selectedTx.description.toLowerCase()) || selectedTx.type === 'income' || selectedTx.type === 'credit';

                const fromId = isToSide ? walletId : 'unknown'; // This logic needs refinement but let's start simple
                const toId = isToSide ? 'placeholder' : walletId;

                // For now, let's just use the processTransfer with a simplified assumption:
                // The wallet selected in the list is the "Source" (from) if it's an income transaction, 
                // and the "Destination" (to) if it's an expense transaction.
                // Actually, let's just make the user select the "Other" wallet.

                // To be robust: we need to know WHICH wallet the original transaction belongs to.
                // But it hasn't been assigned yet! That's the whole point of this sheet.
                // So in Transfer Mode, the user must select TWO wallets?
                // Or: Select Wallet A (where the SMS happened), then Select Wallet B (the other side).

                // Let's stick to the current UI: User selects ONE wallet.
                // If isTransferMode is ON, we'll ask them to select the TRANSACTION'S wallet first,
                // then the OTHER wallet.

                if (!targetWalletId) {
                    setTargetWalletId(walletId);
                    setIsProcessing(false);
                    return;
                }

                // First selection (targetWalletId) is SOURCE
                // Second selection (walletId) is DESTINATION
                success = await processTransfer(
                    selectedTx.id,
                    targetWalletId,
                    walletId,
                    selectedTx.amount,
                    selectedTx.description
                );
            } else {
                success = await assignTransactionToWallet(selectedTx.id, walletId);
            }

            if (success) {
                // Refresh local state
                const remaining = unmatchedTxs.filter(t => t.id !== selectedTx.id);
                setUnmatchedTxs(remaining);
                setSelectedTx(null);
                setTargetWalletId(null);
                setIsTransferMode(false);

                if (remaining.length === 0) {
                    onSuccess();
                    onClose();
                } else {
                    onSuccess(); // Update dashboard in background
                }
            } else {
                Alert.alert('Error', 'Failed to link transaction.');
            }
        } catch (error) {
            console.error('Error in handleAssign:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                transparent={true}
                opacity={0.5}
            />
        ),
        []
    );

    const getWalletIcon = (type: string) => {
        switch (type) {
            case 'bank': return BankIcon;
            case 'momo': return Wallet03Icon;
            case 'cash': return Wallet01Icon;
            default: return Wallet01Icon;
        }
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
            handleIndicatorStyle={{ backgroundColor: '#EDEDED', width: 60, height: 4 }}
        >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 40 }}>
                <View className="mt-4 mb-8">
                    <View className="flex-row items-center gap-3 mb-2">
                        <HugeiconsIcon icon={AiMagicIcon} size={28} color="#1642E5" />
                        <Text className="text-[24px] font-manrope-bold text-[#1642E5]">Smart Detection</Text>
                    </View>
                    <Text className="text-[16px] font-manrope text-[#7C7D80]">
                        {selectedTx ? 'Which wallet did this belong to?' : 'Assign detected transactions to a wallet.'}
                    </Text>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#1642E5" />
                    </View>
                ) : unmatchedTxs.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-[18px] font-manrope-medium text-[#7C7D80]">All transactions are linked! 🎉</Text>
                    </View>
                ) : selectedTx ? (
                    <View className="flex-1">
                        {/* Selected Transaction Card */}
                        <View className="bg-[#F8FAFF] border-[1.5px] border-[#DAE2FF] rounded-[24px] p-6 mb-10">
                            <Text className="text-[14px] font-manrope-bold text-[#1642E5] uppercase mb-4 tracking-widest">TRANSACTION DETAILS</Text>
                            <Text className="text-[20px] font-manrope-bold text-slate-900 mb-1">{selectedTx.description}</Text>
                            <Text className="text-[16px] font-manrope text-slate-500 mb-6">{formatTransactionDate(selectedTx.created_at)}</Text>

                            <View className="flex-row items-baseline">
                                <Text className="text-[18px] font-manrope-semibold text-[#1642E5] mr-1">GHS</Text>
                                <Text className="text-[36px] font-manrope-bold text-[#1642E5]">
                                    {Number(selectedTx.amount).toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center justify-between mb-6 px-1">
                            <View>
                                <Text className="text-[16px] font-manrope-bold text-slate-900">Mark as Transfer</Text>
                                <Text className="text-[14px] font-manrope text-slate-500">Moves money between wallets</Text>
                            </View>
                            <Pressable
                                onPress={() => {
                                    setIsTransferMode(!isTransferMode);
                                    setTargetWalletId(null);
                                }}
                                className={`w-12 h-6 rounded-full px-1 justify-center ${isTransferMode ? 'bg-[#1642E5]' : 'bg-slate-200'}`}
                            >
                                <View className={`w-4 h-4 rounded-full bg-white ${isTransferMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </Pressable>
                        </View>

                        <Text className="text-[14px] font-manrope-bold text-[#ADAEAF] uppercase mb-4 pl-1">
                            {isTransferMode
                                ? (targetWalletId ? 'SELECT DESTINATION WALLET' : 'SELECT SOURCE WALLET')
                                : 'SELECT WALLET'
                            }
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                            <View className="gap-4">
                                {wallets.length > 0 ? (
                                    wallets.map((wallet) => (
                                        <Pressable
                                            key={wallet.id}
                                            onPress={() => handleAssign(wallet.id)}
                                            disabled={isProcessing || targetWalletId === wallet.id}
                                            className={`bg-white border-[1.5px] rounded-[20px] p-5 flex-row items-center justify-between ${targetWalletId === wallet.id ? 'border-[#1642E5] bg-[#F8FAFF]' : 'border-[#F1F1F1]'}`}
                                        >
                                            <View className="flex-row items-center gap-4">
                                                <View className={`w-[44px] h-[44px] rounded-full items-center justify-center ${targetWalletId === wallet.id ? 'bg-[#1642E5]' : 'bg-[#EFF6FF]'}`}>
                                                    <HugeiconsIcon icon={getWalletIcon(wallet.type)} size={20} color={targetWalletId === wallet.id ? 'white' : '#1642E5'} />
                                                </View>
                                                <View>
                                                    <View className="flex-row items-center gap-2">
                                                        <Text className="text-[16px] font-manrope-bold text-[#5B5B5B]">{wallet.name}</Text>
                                                        {targetWalletId === wallet.id && (
                                                            <View className="bg-[#1642E5] px-2 py-0.5 rounded-full">
                                                                <Text className="text-[10px] font-manrope-bold text-white uppercase">Source</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text className="text-[14px] font-manrope text-[#7C7D80]">Balance: GHS {Number(wallet.current_balance).toFixed(2)}</Text>
                                                </View>
                                            </View>
                                            {isProcessing ? (
                                                <ActivityIndicator size="small" color="#1642E5" />
                                            ) : targetWalletId === wallet.id ? (
                                                <HugeiconsIcon icon={Tick02Icon} size={20} color="#1642E5" />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#CBD5E1" />
                                            )}
                                        </Pressable>
                                    ))
                                ) : (
                                    <View className="bg-slate-50 rounded-[20px] p-6 border-[1px] border-dashed border-slate-200 items-center">
                                        <Text className="text-[#7C7D80] font-manrope text-center mb-4">You haven't set up any wallets yet.</Text>
                                        <Pressable
                                            onPress={() => {
                                                if (onCreateWallet && selectedTx) {
                                                    onCreateWallet(selectedTx);
                                                } else {
                                                    onClose();
                                                    router.push('/wallets');
                                                }
                                            }}
                                            className="bg-[#1642E5] px-6 py-3 rounded-full"
                                        >
                                            <Text className="text-white font-manrope-bold">Create a Wallet</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {wallets.length > 0 && (
                                    <Pressable
                                        onPress={() => {
                                            if (onCreateWallet && selectedTx) {
                                                onCreateWallet(selectedTx);
                                            } else {
                                                onClose();
                                                router.push('/wallets');
                                            }
                                        }}
                                        className="border-[1.5px] border-dashed border-slate-200 rounded-[20px] p-5 flex-row items-center gap-4 mt-2"
                                    >
                                        <View className="w-[44px] h-[44px] rounded-full bg-slate-50 items-center justify-center">
                                            <HugeiconsIcon icon={AddCircleHalfDotIcon} size={20} color="#64748B" />
                                        </View>
                                        <Text className="text-[16px] font-manrope-semibold text-[#64748B]">Create new wallet</Text>
                                    </Pressable>
                                )}
                            </View>
                        </ScrollView>

                        <Pressable
                            onPress={() => setSelectedTx(null)}
                            className="mt-8 mb-4 h-[56px] items-center justify-center"
                        >
                            <Text className="text-[18px] font-manrope-bold text-[#1642E5]">Cancel</Text>
                        </Pressable>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                        <View className="gap-4">
                            {unmatchedTxs.map((tx) => (
                                <Pressable
                                    key={tx.id}
                                    onPress={() => setSelectedTx(tx)}
                                    className="bg-white border-[1px] border-slate-100 rounded-[20px] p-4 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center gap-3 flex-1">
                                        <View className="w-10 h-10 rounded-full bg-[#F8FAFF] items-center justify-center">
                                            <HugeiconsIcon icon={AiMagicIcon} size={20} color="#1642E5" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-[16px] font-manrope-bold text-slate-900" numberOfLines={1}>{tx.description}</Text>
                                            <Text className="text-[12px] font-manrope text-slate-500">{formatTransactionDate(tx.created_at)}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-[16px] font-manrope-bold text-slate-900 ml-4">
                                        {(tx.type === 'income' || tx.type === 'credit') ? '+' : '-'}GHS {Number(tx.amount).toFixed(2)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </BottomSheetView>
        </BottomSheet>
    );
}
