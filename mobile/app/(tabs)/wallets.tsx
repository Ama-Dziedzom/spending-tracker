import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Image, Modal, Dimensions } from 'react-native';
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
    Cancel01Icon,
    ArrowUp02Icon,
    ArrowDown02Icon,
    ShoppingBag01Icon,
    Home01Icon,
    Car01Icon,
    RestaurantIcon,
    PackageIcon,
    Tick01Icon,
    ArrowLeft02Icon,
    ArrowUpRight03Icon,
} from '@hugeicons/core-free-icons';
import { getWallets, createWallets, CreateWalletInput, getTotalBalance } from '../../lib/wallet-service';
import { assignTransactionToWallet, getWalletAnalytics, WalletAnalytics } from '../../lib/transaction-service';
import { getCategoryIcon, getCategoryColor, getCategoryByName } from '../../lib/categories';
import { Wallet, supabase } from '../../lib/supabase';
import { ConfigureWalletBottomSheet } from '../../components/configure-wallet-bottom-sheet';
import { SelectWalletTypeBottomSheet } from '../../components/select-wallet-type-bottom-sheet';
import { EditWalletBottomSheet } from '../../components/edit-wallet-bottom-sheet';
import { Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

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
    const [selectedWalletForDetail, setSelectedWalletForDetail] = React.useState<Wallet | null>(null);
    const [walletAnalytics, setWalletAnalytics] = React.useState<WalletAnalytics | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = React.useState(false);
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

    const handleWalletPress = async (wallet: Wallet) => {
        setSelectedWalletForDetail(wallet);
        setIsLoadingAnalytics(true);
        try {
            const analytics = await getWalletAnalytics(wallet.id);
            setWalletAnalytics(analytics);
        } catch (error) {
            console.error('Error fetching wallet analytics:', error);
        } finally {
            setIsLoadingAnalytics(false);
        }
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
            {/* Header Area - Simplified */}
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
                {/* Wallets List Section */}
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

                            {/* Add New Wallet Button */}
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

            {/* Expanded Wallet Detail View */}
            <Modal
                visible={!!selectedWalletForDetail}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedWalletForDetail(null)}
            >
                {selectedWalletForDetail && (
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
                                    onPress={() => setSelectedWalletForDetail(null)}
                                    className="w-11 h-11 bg-white/15 rounded-full items-center justify-center -ml-[11px]"
                                >
                                    <HugeiconsIcon icon={ArrowLeft02Icon} size={22} color="#FFFFFF" />
                                </Pressable>
                            </View>

                            <View className="items-center px-8">
                                <Text className="text-white/80 text-[16px] font-manrope-bold mb-0.5 uppercase tracking-widest text-center">
                                    {selectedWalletForDetail.name} Balance
                                </Text>
                                <Text className="text-white text-[60px] font-manrope-bold mb-6 tracking-tight text-center">
                                    GHS {formatMoney(selectedWalletForDetail.current_balance)}
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

                            {isLoadingAnalytics ? (
                                <View className="py-20 items-center justify-center flex-1">
                                    <ActivityIndicator size="large" color="#0F4CFF" />
                                </View>
                            ) : (
                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}
