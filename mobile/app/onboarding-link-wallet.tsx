import { View, Text, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Tick02Icon,
    Wallet01Icon,
    BankIcon,
    Coins01Icon,
    ArrowRight02Icon
} from '@hugeicons/core-free-icons';

const WALLETS = [
    {
        id: 'momo',
        name: 'Mobile Money Wallet',
        icon: Wallet01Icon,
    },
    {
        id: 'bank',
        name: 'Bank Wallet',
        icon: BankIcon,
    },
    {
        id: 'cash',
        name: 'Cash Wallet',
        icon: Coins01Icon,
    }
];

export default function OnboardingLinkWallet() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedWallets, setSelectedWallets] = useState<string[]>([]);

    const toggleWallet = (id: string) => {
        if (selectedWallets.includes(id)) {
            setSelectedWallets(selectedWallets.filter(w => w !== id));
        } else {
            setSelectedWallets([...selectedWallets, id]);
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View className="mt-12 mb-4 items-center">
                    <Text className="text-[24px] font-manrope-semibold text-[#1642E5] text-center">
                        Connect your Money
                    </Text>
                    <Text className="text-[14px] font-manrope text-[#6887F6] text-center mt-2 px-6">
                        Select the wallets you use most often to start tracking your spending automatically
                    </Text>
                </View>

                {/* Wallet Options */}
                <View className="gap-4 mt-8">
                    {WALLETS.map((wallet) => {
                        const isSelected = selectedWallets.includes(wallet.id);
                        return (
                            <Pressable
                                key={wallet.id}
                                onPress={() => toggleWallet(wallet.id)}
                                className={`flex-row items-center p-4 rounded-[15px] border-[1.5px] h-[81px] ${isSelected ? 'border-[#1642E5] bg-white' : 'border-[#F1F1F1] bg-white'
                                    }`}
                                style={isSelected ? {
                                    shadowColor: '#1642E5',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 10,
                                    elevation: 2
                                } : {}}
                            >
                                {/* Checkbox */}
                                <View className={`w-6 h-6 rounded-md border-[1.5px] items-center justify-center mr-4 ${isSelected ? 'border-[#1642E5] bg-[#1642E5]' : 'border-[#CBD5E1] bg-white'
                                    }`}>
                                    {isSelected && <HugeiconsIcon icon={Tick02Icon} size={16} color="white" />}
                                </View>

                                {/* Icon Container */}
                                <View className="w-12 h-12 rounded-full bg-[#ECF0FF] items-center justify-center mr-4">
                                    <HugeiconsIcon icon={wallet.icon} size={24} color="#1642E5" />
                                </View>

                                {/* Label */}
                                <Text className="text-[16px] font-manrope-medium text-[#64748B] flex-1">
                                    {wallet.name}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

            </ScrollView>

            {/* Footer Actions - Pinned to bottom */}
            <View
                className="px-6 bg-white pt-4 items-center"
                style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
                <Pressable
                    onPress={() => router.push('/(tabs)')}
                    className="bg-[#1642E5] w-full h-[56px] rounded-[20px] flex-row items-center justify-center gap-2 mb-6"
                    style={{
                        shadowColor: '#1642E5',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                        elevation: 4
                    }}
                >
                    <Text className="text-white text-[18px] font-manrope-semibold">
                        Continue
                    </Text>
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color="white" />
                </Pressable>

                <Pressable onPress={() => router.push('/(tabs)')}>
                    <Text className="text-[16px] font-manrope text-[#6887F6]">
                        Skip for now
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
