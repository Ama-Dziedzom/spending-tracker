import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Image, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    BankIcon,
    Wallet01Icon,
    ArrowRight01Icon,
    AddCircleHalfDotIcon,
    Wallet03Icon,
    ArrowUpRight03Icon,
} from '@hugeicons/core-free-icons';
import { getWallets, createWallets, CreateWalletInput, getTotalBalance } from '../../lib/wallet-service';
import { assignTransactionToWallet } from '../../lib/transaction-service';
import { Wallet } from '../../lib/supabase';
import { ConfigureWalletBottomSheet } from '../../components/configure-wallet-bottom-sheet';
import { SelectWalletTypeBottomSheet } from '../../components/select-wallet-type-bottom-sheet';
import { EditWalletBottomSheet } from '../../components/edit-wallet-bottom-sheet';
import { Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

const formatMoney = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return '0.00';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '0.00';
    const parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

export default function Wallets() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{
        fromTransactionId?: string;
        initialAmount?: string;
        transactionType?: string;
    }>();

    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [totalBalance, setTotalBalance] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [isSelectTypeSheetVisible, setIsSelectTypeSheetVisible] = React.useState(false);
    const [isConfigureSheetVisible, setIsConfigureSheetVisible] = React.useState(false);
    const [isEditSheetVisible, setIsEditSheetVisible] = React.useState(false);
    const [selectedWalletForEdit, setSelectedWalletForEdit] = React.useState<Wallet | null>(null);
    const [selectedWalletTypes, setSelectedWalletTypes] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);

    const fetchWallets = React.useCallback(async () => {
        try {
            const [walletsData, balanceData] = await Promise.all([
                getWallets(),
                getTotalBalance()
            ]);
            setWallets(walletsData);
            setTotalBalance(balanceData);
        } catch (error) {
            console.error('Error fetching wallets:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    // If we have a transaction ID in the params, open the creation flow automatically
    React.useEffect(() => {
        if (params.fromTransactionId && !isConfigureSheetVisible && !isSelectTypeSheetVisible) {
            setIsSelectTypeSheetVisible(true);
        }
    }, [params.fromTransactionId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWallets();
    };

    const handleSelectType = (types: string[]) => {
        setSelectedWalletTypes(types);
        setIsSelectTypeSheetVisible(false);
        setTimeout(() => {
            setIsConfigureSheetVisible(true);
        }, 800);
    };

    const handleWalletPress = (wallet: Wallet) => {
        router.push({
            pathname: '/wallet-details',
            params: { walletId: wallet.id }
        });
    };

    const handleEditWallet = (wallet: Wallet) => {
        setSelectedWalletForEdit(wallet);
        setIsEditSheetVisible(true);
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

            if (params.fromTransactionId && createdWallets.length > 0) {
                let targetWallet = createdWallets[0];
                if (createdWallets.length > 1) {
                    const momoWallet = createdWallets.find(w => w.type === 'momo');
                    if (momoWallet) targetWallet = momoWallet;
                }
                await assignTransactionToWallet(params.fromTransactionId, targetWallet.id);
                router.setParams({ fromTransactionId: undefined, initialAmount: undefined, transactionType: undefined });
            }

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

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <StatusBar style="dark" />
            <View className="px-6 pt-8 pb-4">
                <Text className="text-[#1642E5] font-manrope-bold text-[28px]">My Wallets</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#1642E5"
                    />
                }
            >
                <View className="mt-2">
                    {isLoading ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#1642E5" />
                        </View>
                    ) : wallets.length > 0 ? (
                        <View>
                            {wallets.map((wallet, index) => (
                                <Animated.View
                                    key={wallet.id}
                                    {...{ entering: FadeInDown.delay(index * 100) } as any}
                                    className="mb-4"
                                >
                                    <Pressable
                                        onPress={() => handleWalletPress(wallet)}
                                        onLongPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            handleEditWallet(wallet);
                                        }}
                                        delayLongPress={500}
                                        className="rounded-[24px] overflow-hidden"
                                        style={{
                                            shadowColor: '#1642E5',
                                            shadowOffset: { width: 0, height: 8 },
                                            shadowOpacity: 0.15,
                                            shadowRadius: 16,
                                            elevation: 8,
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#1E5AFF', '#1642E5', '#0E1F5B']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            className="justify-center"
                                            style={{ height: 98, paddingHorizontal: 24 }}
                                        >
                                            <View className="flex-row justify-between items-center">
                                                <View className="flex-1 mb-8" style={{ gap: 2, paddingTop: 8 }}>
                                                    <Text className="text-white/70 font-manrope-medium text-[14px] uppercase mt-4">
                                                        {wallet.name}
                                                    </Text>
                                                    <Text className="text-white font-manrope-bold text-[32px]">
                                                        GHS {formatMoney(wallet.current_balance)}
                                                    </Text>
                                                </View>

                                                <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="rgba(255,255,255,0.7)" />
                                            </View>
                                        </LinearGradient>
                                    </Pressable>
                                </Animated.View>
                            ))}

                            <Pressable
                                onPress={() => setIsSelectTypeSheetVisible(true)}
                                className="mt-4 py-5 px-6 rounded-[20px] flex-row items-center"
                                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' }}
                            >
                                <View className="w-10 h-10 rounded-full border border-[#D1D5DB] items-center justify-center mr-4">
                                    <HugeiconsIcon icon={AddCircleHalfDotIcon} size={20} color="#9CA3AF" />
                                </View>
                                <Text className="text-[#6B7280] font-manrope-medium text-[18px]">Add new wallet</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View className="py-20 items-center justify-center bg-[#F9FAFB] rounded-[24px] border border-dashed border-[#E5E7EB]">
                            <Image
                                source={require('../../assets/images/no-wallets.png')}
                                style={{ width: 180, height: 100, marginBottom: 20, opacity: 0.6 }}
                                resizeMode="contain"
                            />
                            <Text className="text-[#6B7280] font-manrope-semibold text-[18px] text-center mb-2">
                                No wallets found
                            </Text>
                            <Pressable onPress={() => setIsSelectTypeSheetVisible(true)}>
                                <Text className="text-[#1642E5] font-manrope-bold text-[16px]">Add your first wallet</Text>
                            </Pressable>
                        </View>
                    )}
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
                onFinish={() => {
                    setIsConfigureSheetVisible(false);
                    fetchWallets();
                }}
                isLoading={isSaving}
                initialBalanceFromTransaction={params.initialAmount}
            />

            <EditWalletBottomSheet
                isVisible={isEditSheetVisible}
                wallet={selectedWalletForEdit}
                onClose={() => {
                    setIsEditSheetVisible(false);
                    setSelectedWalletForEdit(null);
                }}
                onSuccess={fetchWallets}
            />
        </View>
    );
}
