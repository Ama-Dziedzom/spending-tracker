import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    BankIcon,
    Wallet01Icon,
    ArrowRight01Icon,
    AddCircleHalfDotIcon,
    Wallet03Icon,
} from '@hugeicons/core-free-icons';
import { getWallets, createWallets, CreateWalletInput } from '../../lib/wallet-service';
import { assignTransactionToWallet } from '../../lib/transaction-service';
import { Wallet, supabase } from '../../lib/supabase';
import { ConfigureWalletBottomSheet } from '../../components/configure-wallet-bottom-sheet';
import { SelectWalletTypeBottomSheet } from '../../components/select-wallet-type-bottom-sheet';
import { Alert } from 'react-native';

export default function Wallets() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{
        fromTransactionId?: string;
        initialAmount?: string;
        transactionType?: string;
    }>();

    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [isSelectTypeSheetVisible, setIsSelectTypeSheetVisible] = React.useState(false);
    const [isConfigureSheetVisible, setIsConfigureSheetVisible] = React.useState(false);
    const [selectedWalletTypes, setSelectedWalletTypes] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

    // If we have a transaction ID in the params, open the creation flow automatically
    React.useEffect(() => {
        if (params.fromTransactionId && !isConfigureSheetVisible && !isSelectTypeSheetVisible) {
            // Keep the context of the transaction
            setIsSelectTypeSheetVisible(true);
        }
    }, [params.fromTransactionId]);

    const fetchWallets = async () => {
        try {
            const data = await getWallets();
            setWallets(data);
        } catch (error) {
            console.error('Error fetching wallets:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchWallets();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWallets();
    };

    const handleSelectType = (types: string[]) => {
        setSelectedWalletTypes(types);
        setIsSelectTypeSheetVisible(false);
        // Ensure the first sheet is fully closed before opening the second one
        // Increase timeout to 800ms to allow for the full animation of the first sheet
        setTimeout(() => {
            setIsConfigureSheetVisible(true);
        }, 800);
    };

    const handleConfigure = async (data: any) => {
        setIsSaving(true);
        try {
            const walletsToCreate: CreateWalletInput[] = [];

            if (data.momo) {
                walletsToCreate.push({
                    name: 'Mobile Money',
                    type: 'momo',
                    icon: 'wallet-03',
                    color: '#1642E5',
                    initial_balance: parseFloat(data.momo.balance.toString().replace(/[^0-9.]/g, '')) || 0,
                    source_identifier: data.momo.provider,
                });
            }

            if (data.bank) {
                walletsToCreate.push({
                    name: data.bank.name || 'Bank Wallet',
                    type: 'bank',
                    icon: 'bank',
                    color: '#1642E5',
                    initial_balance: parseFloat(data.bank.balance.toString().replace(/[^0-9.]/g, '')) || 0,
                });
            }

            if (data.cash) {
                walletsToCreate.push({
                    name: data.cash.name || 'Cash Wallet',
                    type: 'cash',
                    icon: 'money-01',
                    color: '#1642E5',
                    initial_balance: parseFloat(data.cash.balance.toString().replace(/[^0-9.]/g, '')) || 0,
                });
            }

            let createdWallets: Wallet[] = [];
            if (walletsToCreate.length > 0) {
                createdWallets = await createWallets(walletsToCreate);
            }

            // If we are coming from a detected transaction, link it to the most relevant wallet
            if (params.fromTransactionId && createdWallets.length > 0) {
                // Find the best wallet to link to
                let targetWallet = createdWallets[0];
                const initialAmount = params.initialAmount || '';
                const txType = params.transactionType || '';

                // We'll fetch the transaction to check description if needed, or just use the first created wallet if only one exists
                if (createdWallets.length > 1) {
                    // Try to guess based on created types
                    const momoWallet = createdWallets.find(w => w.type === 'momo');
                    const bankWallet = createdWallets.find(w => w.type === 'bank');

                    // Simple logic: if it came from MoMo detecting logic, it should go to MoMo
                    if (momoWallet) targetWallet = momoWallet;
                }

                await assignTransactionToWallet(params.fromTransactionId, targetWallet.id);

                // Clear params after linking
                router.setParams({ fromTransactionId: undefined, initialAmount: undefined, transactionType: undefined });
            }

            setIsConfigureSheetVisible(false);
            fetchWallets(); // Refresh the list

            if (params.fromTransactionId) {
                Alert.alert('Success', 'Wallet created and transaction linked!');
            }
        } catch (error) {
            console.error('Error saving wallet:', error);
            Alert.alert('Error', 'Failed to save your wallet. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getWalletIcon = (type: string) => {
        switch (type) {
            case 'bank': return BankIcon;
            case 'momo': return Wallet03Icon;
            case 'cash': return Wallet01Icon;
            default: return Wallet01Icon;
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
                <View className="mt-8 mb-10">
                    <Text className="text-[32px] font-manrope-bold text-[#1642E5]">My Wallets</Text>
                </View>

                {/* Wallets List */}
                <View className="gap-5">
                    {isLoading ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#1642E5" />
                        </View>
                    ) : wallets.length > 0 ? (
                        wallets.map((wallet) => (
                            <Pressable
                                key={wallet.id}
                                className="bg-white border-[1.5px] border-[#F1F1F1] rounded-[20px] p-5 flex-row items-center justify-between"
                                style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.02,
                                    shadowRadius: 10,
                                    elevation: 1,
                                }}
                            >
                                <View className="flex-row items-center gap-4 flex-1">
                                    <View
                                        className="w-[52px] h-[52px] rounded-full items-center justify-center"
                                        style={{ backgroundColor: '#EFF6FF' }}
                                    >
                                        <HugeiconsIcon icon={getWalletIcon(wallet.type)} size={24} color="#1642E5" />
                                    </View>
                                    <View>
                                        <Text className="text-[14px] font-manrope-medium text-[#7C7D80] mb-1">
                                            {wallet.name}
                                        </Text>
                                        <Text className="text-[20px] font-manrope-bold text-[#5B5B5B]">
                                            GHS {Number(wallet.current_balance).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="#CBD5E1" />
                            </Pressable>
                        ))
                    ) : (
                        <View className="py-10 items-center">
                            <Text className="text-[#7C7D80] font-manrope text-center">No wallets found. Add one below!</Text>
                        </View>
                    )}

                    {/* Add New Wallet Button */}
                    <Pressable
                        onPress={() => setIsSelectTypeSheetVisible(true)}
                        className="border-2 border-dashed border-[#E5E7EB] rounded-[24px] p-6 flex-row items-center gap-4 mt-2"
                    >
                        <View className="w-12 h-12 rounded-full bg-[#F8FAFC] items-center justify-center">
                            <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} color="#64748B" />
                        </View>
                        <Text className="text-[18px] font-manrope-semibold text-[#64748B]">
                            Add new wallet
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>

            <SelectWalletTypeBottomSheet
                isVisible={isSelectTypeSheetVisible}
                onClose={() => setIsSelectTypeSheetVisible(false)}
                onSelect={handleSelectType}
            />

            <ConfigureWalletBottomSheet
                isVisible={isConfigureSheetVisible}
                selectedWallets={selectedWalletTypes}
                onClose={() => setIsConfigureSheetVisible(false)}
                onConfigure={handleConfigure}
                isLoading={isSaving}
                initialBalanceFromTransaction={params.initialAmount}
            />
        </View>
    );
}
