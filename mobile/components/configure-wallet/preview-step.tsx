import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BankIcon, Wallet01Icon, ArrowRight02Icon, Edit01Icon } from '@hugeicons/core-free-icons';
import { PROVIDERS } from './momo-step';
import { COLORS } from '../../constants/theme';

interface Props {
    selectedWallets: string[];
    momoProvider: string | null;
    momoBalance: string;
    bankName: string;
    bankBalance: string;
    cashName: string;
    cashBalance: string;
    totalBalance: number;
    onFinish: () => void;
    onEdit: () => void;
}

export const PreviewStep = React.memo(({
    selectedWallets, momoProvider, momoBalance, bankName, bankBalance, cashName, cashBalance, totalBalance, onFinish, onEdit
}: Props) => {
    const formatAmount = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    return (
        <View className="flex-1 items-center pt-2">
            <View className="w-[127px] h-[127px] mb-6">
                <Image
                    source={require('../../assets/images/success-trophy.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                />
            </View>
            <Text className="text-[32px] font-manrope-bold mb-2" style={{ color: COLORS.primary }}>All Set!</Text>
            <Text className="text-[20px] font-manrope-medium text-[#7C7D80] text-center px-10 mb-8">
                Your accounts are linked securely and ready for action.
            </Text>

            <View className="items-center mb-8">
                <Text className="text-[14px] font-manrope-bold text-[#ADAEAF] uppercase">TOTAL BALANCE</Text>
                <Text
                    style={{ width: '100%', textAlign: 'center', color: COLORS.primary }}
                    className="text-[72px] font-manrope-bold"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    {totalBalance.toFixed(2)}
                </Text>
            </View>

            <View className="w-full bg-white border-[1.5px] border-[#F1F1F1] rounded-[20px] p-5 mb-8">
                {selectedWallets.includes('momo') && (
                    <View className="flex-row items-center justify-between mb-6 gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                {momoProvider && (
                                    <Image
                                        source={PROVIDERS.find(p => p.id === momoProvider)?.image}
                                        style={{ width: '100%', height: '100%', borderRadius: 20 }}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {PROVIDERS.find(p => p.id === momoProvider)?.name ? `${PROVIDERS.find(p => p.id === momoProvider)?.name} Wallet` : 'Mobile Money Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(momoBalance)}
                        </Text>
                    </View>
                )}

                {selectedWallets.includes('bank') && (
                    <View className="flex-row items-center justify-between mb-6 gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                <HugeiconsIcon icon={BankIcon} size={20} color={COLORS.primary} />
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {bankName || 'Bank Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(bankBalance)}
                        </Text>
                    </View>
                )}

                {selectedWallets.includes('cash') && (
                    <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                <HugeiconsIcon icon={Wallet01Icon} size={20} color={COLORS.primary} />
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {cashName || 'Cash Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(cashBalance)}
                        </Text>
                    </View>
                )}
            </View>

            <Pressable
                onPress={onFinish}
                className="w-full h-[60px] rounded-full flex-row items-center justify-center gap-2 mb-4"
                style={{ backgroundColor: COLORS.primary }}
            >
                <Text className="text-[20px] font-manrope-semibold text-white">Go to dashboard</Text>
                <HugeiconsIcon icon={ArrowRight02Icon} size={24} color="white" />
            </Pressable>

            <Pressable
                onPress={onEdit}
                className="flex-row items-center gap-2"
            >
                <HugeiconsIcon icon={Edit01Icon} size={24} color={COLORS.primary} />
                <Text className="text-[20px] font-manrope-semibold" style={{ color: COLORS.primary }}>Edit wallets</Text>
            </Pressable>
        </View>
    );
});
