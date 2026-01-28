import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowRight02Icon,
    BankIcon,
    Wallet01Icon,
    Wallet03Icon,
    Calendar03Icon,
    Clock01Icon,
} from '@hugeicons/core-free-icons';
import { Transaction, Wallet } from '../lib/supabase';
import { formatCurrency, formatTransactionDate, formatTransactionTime, updateTransactionCategory } from '../lib/transaction-service';
import { getCategoryById, getCategoryByName, getDefaultCategory, Category, CATEGORIES, getCategoryByIdOrName } from '../lib/categories';
import { CategoryPickerBottomSheet } from './category-picker-bottom-sheet';

interface TransactionWithWallet extends Transaction {
    wallet?: Wallet;
}

interface Props {
    isVisible: boolean;
    transaction: TransactionWithWallet | null;
    onClose: () => void;
    onCategoryUpdated: () => void;
}

export function TransactionDetailBottomSheet({ isVisible, transaction, onClose, onCategoryUpdated }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [lastVisible, setLastVisible] = useState(false);
    const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Category | undefined>();
    const snapPoints = useMemo(() => ['65%'], []);

    // Determine current category from transaction
    useEffect(() => {
        if (transaction?.category) {
            const cat = getCategoryByIdOrName(transaction.category);
            setCurrentCategory(cat || getDefaultCategory());
        } else {
            setCurrentCategory(getDefaultCategory());
        }
    }, [transaction]);

    useEffect(() => {
        if (isVisible && !lastVisible) {
            bottomSheetRef.current?.snapToIndex(0);
        } else if (!isVisible && lastVisible) {
            bottomSheetRef.current?.close();
        }
        setLastVisible(isVisible);
    }, [isVisible, lastVisible]);

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
            />
        ),
        []
    );

    const handleCategorySelect = async (categoryId: string) => {
        if (!transaction) return;

        setIsUpdating(true);
        try {
            const success = await updateTransactionCategory(transaction.id, categoryId);
            if (success) {
                const newCategory = getCategoryById(categoryId);
                setCurrentCategory(newCategory);
                onCategoryUpdated();
            } else {
                Alert.alert('Error', 'Failed to update category. Please try again.');
            }
        } catch (error) {
            console.error('Error updating category:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsUpdating(false);
            setIsCategoryPickerVisible(false);
        }
    };

    const getWalletIcon = (type?: string) => {
        switch (type) {
            case 'bank': return BankIcon;
            case 'momo': return Wallet03Icon;
            default: return Wallet01Icon;
        }
    };

    const isIncome = transaction?.type === 'income' || transaction?.type === 'credit';
    const amountColor = isIncome ? '#10B981' : '#1E293B';
    const amountPrefix = isIncome ? '+' : '-';

    if (!transaction) return null;

    return (
        <>
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
                <BottomSheetView style={{ flex: 1, paddingHorizontal: 24 }}>
                    {/* Amount Section */}
                    <View className="items-center pt-4 pb-6 border-b border-slate-100">
                        <View
                            className="w-16 h-16 rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: `${currentCategory?.color || '#94A3B8'}15` }}
                        >
                            <HugeiconsIcon
                                icon={currentCategory?.icon || getWalletIcon(transaction.wallet?.type)}
                                size={28}
                                color={currentCategory?.color || '#94A3B8'}
                            />
                        </View>
                        <Text
                            className="text-[36px] font-manrope-bold"
                            style={{ color: amountColor }}
                        >
                            {amountPrefix}{formatCurrency(transaction.amount).replace('GH₵ ', '')}
                        </Text>
                        <Text className="text-[14px] font-manrope text-slate-500 mt-1">
                            GHS • {isIncome ? 'Income' : 'Expense'}
                        </Text>
                    </View>

                    {/* Details Section */}
                    <View className="py-6">
                        {/* Description */}
                        <View className="mb-5">
                            <Text className="text-[12px] font-manrope-medium text-slate-400 uppercase mb-1">Description</Text>
                            <Text className="text-[16px] font-manrope-semibold text-slate-800" numberOfLines={2}>
                                {transaction.description}
                            </Text>
                        </View>

                        {/* Date & Time Row */}
                        <View className="flex-row mb-5">
                            <View className="flex-1 mr-4">
                                <Text className="text-[12px] font-manrope-medium text-slate-400 uppercase mb-1">Date</Text>
                                <View className="flex-row items-center gap-2">
                                    <HugeiconsIcon icon={Calendar03Icon} size={16} color="#64748B" />
                                    <Text className="text-[15px] font-manrope-medium text-slate-700">
                                        {formatTransactionDate(transaction.transaction_date || transaction.created_at)}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[12px] font-manrope-medium text-slate-400 uppercase mb-1">Time</Text>
                                <View className="flex-row items-center gap-2">
                                    <HugeiconsIcon icon={Clock01Icon} size={16} color="#64748B" />
                                    <Text className="text-[15px] font-manrope-medium text-slate-700">
                                        {formatTransactionTime(transaction.transaction_date || transaction.created_at)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Wallet */}
                        <View className="mb-5">
                            <Text className="text-[12px] font-manrope-medium text-slate-400 uppercase mb-1">Wallet</Text>
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                                    <HugeiconsIcon
                                        icon={getWalletIcon(transaction.wallet?.type)}
                                        size={16}
                                        color="#64748B"
                                    />
                                </View>
                                <Text className="text-[15px] font-manrope-medium text-slate-700">
                                    {transaction.wallet?.name || 'Unassigned'}
                                </Text>
                            </View>
                        </View>

                        {/* Category - Editable */}
                        <View>
                            <Text className="text-[12px] font-manrope-medium text-slate-400 uppercase mb-2">Category</Text>
                            <Pressable
                                onPress={() => setIsCategoryPickerVisible(true)}
                                disabled={isUpdating}
                                className="flex-row items-center justify-between p-4 rounded-[16px] border-[1.5px] border-[#F1F1F1] bg-white"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.03,
                                    shadowRadius: 8,
                                    elevation: 1,
                                }}
                            >
                                <View className="flex-row items-center gap-3">
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center"
                                        style={{ backgroundColor: `${currentCategory?.color || '#94A3B8'}15` }}
                                    >
                                        {isUpdating ? (
                                            <ActivityIndicator size="small" color={currentCategory?.color || '#94A3B8'} />
                                        ) : (
                                            <HugeiconsIcon
                                                icon={currentCategory?.icon}
                                                size={20}
                                                color={currentCategory?.color || '#94A3B8'}
                                            />
                                        )}
                                    </View>
                                    <Text className="text-[16px] font-manrope-semibold text-slate-800">
                                        {currentCategory?.name || 'Uncategorized'}
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-[14px] font-manrope-medium text-[#1642E5]">Change</Text>
                                    <HugeiconsIcon icon={ArrowRight02Icon} size={18} color="#1642E5" />
                                </View>
                            </Pressable>
                        </View>
                    </View>
                </BottomSheetView>
            </BottomSheet>

            {/* Category Picker */}
            <CategoryPickerBottomSheet
                isVisible={isCategoryPickerVisible}
                currentCategoryId={currentCategory?.id}
                onClose={() => setIsCategoryPickerVisible(false)}
                onSelect={handleCategorySelect}
            />
        </>
    );
}
