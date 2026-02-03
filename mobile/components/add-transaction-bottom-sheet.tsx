import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    AddCircleHalfDotIcon,
    MinusSignCircleIcon,
    Wallet01Icon,
    Wallet03Icon,
    BankIcon,
    Money01Icon,
    Tick02Icon,
    ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { CATEGORIES, Category, suggestCategory } from '../lib/categories';
import { Wallet, supabase } from '../lib/supabase';
import { getWallets } from '../lib/wallet-service';
import { COLORS } from '../constants/theme';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type TransactionType = 'expense' | 'income';

const getWalletIcon = (type: string) => {
    switch (type) {
        case 'momo': return Wallet03Icon;
        case 'bank': return BankIcon;
        case 'cash': return Money01Icon;
        default: return Wallet01Icon;
    }
};

export function AddTransactionBottomSheet({ isVisible, onClose, onSuccess }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [lastVisible, setLastVisible] = useState(false);
    const snapPoints = useMemo(() => ['85%'], []);

    // Form state
    const [transactionType, setTransactionType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [step, setStep] = useState<'form' | 'category' | 'wallet'>('form');

    // Amount input ref for focus
    const amountInputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (isVisible && !lastVisible) {
            bottomSheetRef.current?.snapToIndex(0);
            loadWallets();
            // Auto-focus amount after a short delay
            setTimeout(() => {
                amountInputRef.current?.focus();
            }, 400);
        } else if (!isVisible && lastVisible) {
            bottomSheetRef.current?.close();
            resetForm();
        }
        setLastVisible(isVisible);
    }, [isVisible, lastVisible]);

    const loadWallets = async () => {
        setIsLoading(true);
        try {
            const data = await getWallets();
            setWallets(data);
            // Auto-select first wallet if available
            if (data.length > 0 && !selectedWallet) {
                setSelectedWallet(data[0]);
            }
        } catch (error) {
            console.error('Error loading wallets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setTransactionType('expense');
        setAmount('');
        setDescription('');
        setSelectedCategory(null);
        setSelectedWallet(null);
        setStep('form');
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
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    // Auto-suggest category when description changes
    useEffect(() => {
        if (description.length > 3 && !selectedCategory) {
            const suggested = suggestCategory(description, transactionType);
            if (suggested.id !== 'other') {
                setSelectedCategory(suggested);
            }
        }
    }, [description, transactionType]);

    const handleSave = async () => {
        // Validate
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Missing Description', 'Please enter a description for the transaction.');
            return;
        }
        if (!selectedWallet) {
            Alert.alert('Select Wallet', 'Please select a wallet for this transaction.');
            setStep('wallet');
            return;
        }

        Keyboard.dismiss();
        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'You must be logged in to add transactions.');
                return;
            }

            const parsedAmount = parseFloat(amount);
            const dbType = transactionType === 'expense' ? 'debit' : 'credit';
            const now = new Date().toISOString();

            // Create the transaction
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    description: description.trim(),
                    amount: parsedAmount,
                    type: dbType,
                    category: selectedCategory?.id || 'other',
                    wallet_id: selectedWallet.id,
                    transaction_date: now,
                    source: 'manual',
                })
                .select()
                .single();

            if (txError) {
                console.error('Error creating transaction:', txError);
                Alert.alert('Error', 'Failed to create transaction. Please try again.');
                return;
            }

            // Update wallet balance
            const balanceChange = transactionType === 'expense' ? -parsedAmount : parsedAmount;
            const newBalance = Number(selectedWallet.current_balance) + balanceChange;

            const { error: walletError } = await supabase
                .from('wallets')
                .update({
                    current_balance: newBalance,
                    updated_at: now,
                })
                .eq('id', selectedWallet.id);

            if (walletError) {
                console.error('Error updating wallet balance:', walletError);
                // Transaction was created, so we still show success but warn about balance
            }

            // Success
            resetForm();
            onClose();
            onSuccess();

            // Delayed success message
            setTimeout(() => {
                Alert.alert('Success', 'Transaction logged successfully!');
            }, 300);

        } catch (error) {
            console.error('Error saving transaction:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatAmountDisplay = (value: string) => {
        // Remove non-numeric except decimal
        const cleaned = value.replace(/[^0-9.]/g, '');
        // Only allow one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
    };

    const renderFormStep = () => (
        <>
            {/* Transaction Type Toggle */}
            <View className="flex-row gap-3 mb-8">
                <Pressable
                    onPress={() => setTransactionType('expense')}
                    className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[16px] border-2 ${transactionType === 'expense'
                        ? 'bg-[#FEE2E2] border-[#EF4444]'
                        : 'bg-white border-[#F1F1F1]'
                        }`}
                >
                    <HugeiconsIcon
                        icon={MinusSignCircleIcon}
                        size={22}
                        color={transactionType === 'expense' ? '#EF4444' : '#94A3B8'}
                    />
                    <Text className={`font-manrope-bold text-[16px] ${transactionType === 'expense' ? 'text-[#EF4444]' : 'text-slate-400'
                        }`}>
                        Expense
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => setTransactionType('income')}
                    className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[16px] border-2 ${transactionType === 'income'
                        ? 'bg-[#D1FAE5] border-[#10B981]'
                        : 'bg-white border-[#F1F1F1]'
                        }`}
                >
                    <HugeiconsIcon
                        icon={AddCircleHalfDotIcon}
                        size={22}
                        color={transactionType === 'income' ? '#10B981' : '#94A3B8'}
                    />
                    <Text className={`font-manrope-bold text-[16px] ${transactionType === 'income' ? 'text-[#10B981]' : 'text-slate-400'
                        }`}>
                        Income
                    </Text>
                </Pressable>
            </View>

            {/* Amount Input */}
            <View className="mb-6">
                <Text className="text-[13px] font-manrope-bold text-slate-400 uppercase tracking-widest mb-3">
                    AMOUNT
                </Text>
                <View className="flex-row items-center bg-[#F8FAFF] rounded-[20px] px-6 py-4 border-[1.5px] border-[#DAE2FF]">
                    <Text className={`text-[32px] font-manrope-bold mr-2 ${transactionType === 'expense' ? 'text-[#EF4444]' : 'text-[#10B981]'
                        }`}>
                        {transactionType === 'expense' ? '-' : '+'}
                    </Text>
                    <Text className="text-[32px] font-manrope-bold text-slate-300 mr-1">GHS</Text>
                    <TextInput
                        ref={amountInputRef}
                        value={amount}
                        onChangeText={(text) => setAmount(formatAmountDisplay(text))}
                        placeholder="0.00"
                        placeholderTextColor="#CBD5E1"
                        keyboardType="decimal-pad"
                        className="flex-1 text-[32px] font-manrope-bold text-slate-900"
                        style={{ fontFamily: 'Manrope-Bold' }}
                    />
                </View>
            </View>

            {/* Description Input */}
            <View className="mb-6">
                <Text className="text-[13px] font-manrope-bold text-slate-400 uppercase tracking-widest mb-3">
                    DESCRIPTION
                </Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What was this for?"
                    placeholderTextColor="#94A3B8"
                    className="bg-white rounded-[16px] px-5 py-4 text-[16px] font-manrope text-slate-900 border-[1.5px] border-[#F1F1F1]"
                    style={{ fontFamily: 'Manrope-SemiBold' }}
                />
            </View>

            {/* Category Selector */}
            <View className="mb-6">
                <Text className="text-[13px] font-manrope-bold text-slate-400 uppercase tracking-widest mb-3">
                    CATEGORY
                </Text>
                <Pressable
                    onPress={() => setStep('category')}
                    className="bg-white rounded-[16px] px-5 py-4 flex-row items-center justify-between border-[1.5px] border-[#F1F1F1]"
                >
                    {selectedCategory ? (
                        <View className="flex-row items-center gap-3">
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ backgroundColor: `${selectedCategory.color}15` }}
                            >
                                <HugeiconsIcon
                                    icon={selectedCategory.icon}
                                    size={20}
                                    color={selectedCategory.color}
                                />
                            </View>
                            <Text className="text-[16px] font-manrope-semibold text-slate-900">
                                {selectedCategory.name}
                            </Text>
                        </View>
                    ) : (
                        <Text className="text-[16px] font-manrope text-slate-400">
                            Select a category
                        </Text>
                    )}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#94A3B8" />
                </Pressable>
            </View>

            {/* Wallet Selector */}
            <View className="mb-8">
                <Text className="text-[13px] font-manrope-bold text-slate-400 uppercase tracking-widest mb-3">
                    WALLET
                </Text>
                <Pressable
                    onPress={() => setStep('wallet')}
                    className="bg-white rounded-[16px] px-5 py-4 flex-row items-center justify-between border-[1.5px] border-[#F1F1F1]"
                >
                    {selectedWallet ? (
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-[#EFF6FF] items-center justify-center">
                                <HugeiconsIcon
                                    icon={getWalletIcon(selectedWallet.type)}
                                    size={20}
                                    color={COLORS.primary}
                                />
                            </View>
                            <View>
                                <Text className="text-[16px] font-manrope-semibold text-slate-900">
                                    {selectedWallet.name}
                                </Text>
                                <Text className="text-[13px] font-manrope text-slate-400">
                                    Balance: GHS {Number(selectedWallet.current_balance).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-[16px] font-manrope text-slate-400">
                            Select a wallet
                        </Text>
                    )}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#94A3B8" />
                </Pressable>
            </View>

            {/* Save Button */}
            <Pressable
                onPress={handleSave}
                disabled={isSaving || !amount || !description}
                className={`rounded-[20px] py-5 items-center justify-center ${!amount || !description ? 'bg-slate-200' : 'bg-[#0F4CFF]'
                    }`}
                style={{
                    shadowColor: '#0F4CFF',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: !amount || !description ? 0 : 0.25,
                    shadowRadius: 16,
                }}
            >
                {isSaving ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className={`text-[18px] font-manrope-bold ${!amount || !description ? 'text-slate-400' : 'text-white'
                        }`}>
                        Log Transaction
                    </Text>
                )}
            </Pressable>
        </>
    );

    const renderCategoryStep = () => (
        <>
            <View className="flex-row items-center justify-between mb-6">
                <View>
                    <Text className="text-[24px] font-manrope-bold text-slate-900">Select Category</Text>
                    <Text className="text-[14px] font-manrope text-slate-500 mt-1">
                        Choose a category for this transaction
                    </Text>
                </View>
            </View>

            {/* Category Grid */}
            <View className="flex-row flex-wrap justify-between">
                {CATEGORIES.filter(c => transactionType === 'expense' ? c.id !== 'income' : true).map((category) => {
                    const isSelected = selectedCategory?.id === category.id;
                    return (
                        <Pressable
                            key={category.id}
                            onPress={() => {
                                setSelectedCategory(category);
                                setTimeout(() => setStep('form'), 150);
                            }}
                            className={`w-[48%] mb-4 p-4 rounded-[16px] border-[2px] ${isSelected
                                ? 'border-[#1642E5] bg-[#F1F4FF]'
                                : 'border-[#F1F1F1] bg-white'
                                }`}
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <View
                                    className="w-10 h-10 rounded-full items-center justify-center"
                                    style={{ backgroundColor: `${category.color}15` }}
                                >
                                    <HugeiconsIcon
                                        icon={category.icon}
                                        size={20}
                                        color={category.color}
                                    />
                                </View>
                                {isSelected && (
                                    <View className="w-6 h-6 rounded-full bg-[#1642E5] items-center justify-center">
                                        <HugeiconsIcon icon={Tick02Icon} size={14} color="white" />
                                    </View>
                                )}
                            </View>
                            <Text
                                className={`text-[14px] font-manrope-semibold ${isSelected ? 'text-[#1642E5]' : 'text-slate-700'
                                    }`}
                                numberOfLines={1}
                            >
                                {category.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Back Button */}
            <Pressable
                onPress={() => setStep('form')}
                className="mt-4 py-4 items-center"
            >
                <Text className="text-[16px] font-manrope-semibold text-slate-500">Back to form</Text>
            </Pressable>
        </>
    );

    const renderWalletStep = () => (
        <>
            <View className="flex-row items-center justify-between mb-6">
                <View>
                    <Text className="text-[24px] font-manrope-bold text-slate-900">Select Wallet</Text>
                    <Text className="text-[14px] font-manrope text-slate-500 mt-1">
                        Choose which wallet to {transactionType === 'expense' ? 'deduct from' : 'add to'}
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View className="items-center justify-center py-20">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : wallets.length === 0 ? (
                <View className="items-center justify-center py-20 px-8">
                    <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
                        <HugeiconsIcon icon={Wallet01Icon} size={32} color="#CBD5E1" />
                    </View>
                    <Text className="text-slate-900 font-manrope-bold text-[18px] text-center mb-2">
                        No wallets yet
                    </Text>
                    <Text className="text-slate-400 font-manrope text-center">
                        Create a wallet first to log transactions.
                    </Text>
                </View>
            ) : (
                <View className="gap-3">
                    {wallets.map((wallet) => {
                        const isSelected = selectedWallet?.id === wallet.id;
                        return (
                            <Pressable
                                key={wallet.id}
                                onPress={() => {
                                    setSelectedWallet(wallet);
                                    setTimeout(() => setStep('form'), 150);
                                }}
                                className={`bg-white border-[1.5px] rounded-[20px] p-5 flex-row items-center justify-between ${isSelected ? 'border-[#1642E5] bg-[#F8FAFF]' : 'border-[#F1F1F1]'
                                    }`}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className={`w-[44px] h-[44px] rounded-full items-center justify-center ${isSelected ? 'bg-[#1642E5]' : 'bg-[#EFF6FF]'
                                        }`}>
                                        <HugeiconsIcon
                                            icon={getWalletIcon(wallet.type)}
                                            size={20}
                                            color={isSelected ? 'white' : COLORS.primary}
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-[16px] font-manrope-bold text-[#5B5B5B]">
                                            {wallet.name}
                                        </Text>
                                        <Text className="text-[14px] font-manrope text-[#7C7D80]">
                                            Balance: GHS {Number(wallet.current_balance).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                                {isSelected && (
                                    <HugeiconsIcon icon={Tick02Icon} size={20} color={COLORS.primary} />
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {/* Back Button */}
            <Pressable
                onPress={() => setStep('form')}
                className="mt-6 py-4 items-center"
            >
                <Text className="text-[16px] font-manrope-semibold text-slate-500">Back to form</Text>
            </Pressable>
        </>
    );

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
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
        >
            <BottomSheetScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step === 'form' && (
                    <View className="mb-6">
                        <Text className="text-[24px] font-manrope-bold text-slate-900">Log Transaction</Text>
                        <Text className="text-[14px] font-manrope text-slate-500 mt-1">
                            Manually record cash or missed transactions
                        </Text>
                    </View>
                )}

                {step === 'form' && renderFormStep()}
                {step === 'category' && renderCategoryStep()}
                {step === 'wallet' && renderWalletStep()}
            </BottomSheetScrollView>
        </BottomSheet>
    );
}
