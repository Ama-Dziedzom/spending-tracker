import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Tick02Icon,
    BankIcon,
    Wallet01Icon,
    Wallet03Icon,
    Delete01Icon,
    CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';
import { Wallet } from '../lib/supabase';
import { updateWallet, deleteWallet } from '../lib/wallet-service';

interface Props {
    isVisible: boolean;
    wallet: Wallet | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditWalletBottomSheet({ isVisible, wallet, onClose, onSuccess }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['50%', '70%'], []);

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('0.00');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isVisible && wallet) {
            setName(wallet.name);
            setBalance(Number(wallet.current_balance).toFixed(2));
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible, wallet]);

    const handleSave = async () => {
        if (!wallet) return;
        setIsSaving(true);
        try {
            const success = await updateWallet(wallet.id, {
                name,
                current_balance: parseFloat(balance) || 0
            });

            if (success) {
                onSuccess();
                onClose();
            } else {
                Alert.alert('Error', 'Failed to update wallet.');
            }
        } catch (error) {
            console.error('Error updating wallet:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!wallet) return;

        Alert.alert(
            'Delete Wallet',
            'Are you sure you want to delete this wallet? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            const success = await deleteWallet(wallet.id);
                            if (success) {
                                onSuccess();
                                onClose();
                            } else {
                                Alert.alert('Error', 'Failed to delete wallet.');
                            }
                        } catch (error) {
                            console.error('Error deleting wallet:', error);
                            Alert.alert('Error', 'An unexpected error occurred.');
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
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
                <View className="mt-4 mb-8 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-[#F8FAFF] items-center justify-center">
                            <HugeiconsIcon icon={wallet ? getWalletIcon(wallet.type) : Wallet01Icon} size={20} color="#1642E5" />
                        </View>
                        <Text className="text-[24px] font-manrope-bold text-[#1642E5]">Edit Wallet</Text>
                    </View>
                    <Pressable onPress={handleDelete} disabled={isDeleting}>
                        <HugeiconsIcon icon={Delete01Icon} size={24} color="#F43F5E" />
                    </Pressable>
                </View>

                <View className="gap-6">
                    <View>
                        <Text className="text-[14px] font-manrope-bold text-[#ADAEAF] uppercase mb-2 ml-1">WALLET NAME</Text>
                        <View className="bg-[#F8FAFF] border-[1.5px] border-[#DAE2FF] rounded-[16px] p-4">
                            <BottomSheetTextInput
                                value={name}
                                onChangeText={setName}
                                className="text-[18px] font-manrope-semibold text-slate-900"
                                placeholder="Wallet Name"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="text-[14px] font-manrope-bold text-[#ADAEAF] uppercase mb-2 ml-1">CURRENT BALANCE</Text>
                        <View className="bg-[#F8FAFF] border-[1.5px] border-[#DAE2FF] rounded-[16px] p-4 flex-row items-center">
                            <Text className="text-[18px] font-manrope-semibold text-[#1642E5] mr-2">GHS</Text>
                            <BottomSheetTextInput
                                value={balance}
                                onChangeText={setBalance}
                                keyboardType="decimal-pad"
                                className="text-[24px] font-manrope-bold text-[#1642E5] flex-1"
                                placeholder="0.00"
                            />
                        </View>
                    </View>
                </View>

                <View className="flex-1 justify-end mt-10">
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving || !name}
                        className={`h-[60px] rounded-full items-center justify-center flex-row gap-2 ${isSaving || !name ? 'bg-slate-200' : 'bg-[#1642E5]'}`}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white text-[18px] font-manrope-bold">Save Changes</Text>
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} color="white" />
                            </>
                        )}
                    </Pressable>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}
