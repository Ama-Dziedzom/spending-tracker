import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

const WALLET_OPTIONS = [
    {
        id: "MTN_MoMo",
        name: "MTN MoMo",
        icon: "💳",
        color: "bg-yellow-50",
    },
    {
        id: "Vodafone_Cash",
        name: "Telecel Cash",
        icon: "📱",
        color: "bg-red-50",
    },
    {
        id: "Local_Bank",
        name: "Local Bank",
        icon: "🏦",
        color: "bg-blue-50",
    },
];

export default function OnboardingWallets() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedWallets, setSelectedWallets] = useState<string[]>([]);

    const toggleWallet = (id: string) => {
        setSelectedWallets(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View className="mt-14 mb-10 items-center">
                    <Text className="text-[38px] font-urbanist-bold text-[#0F4CFF] text-center leading-[46px] tracking-tight">
                        Connect your Money
                    </Text>
                    <Text className="mt-2 text-[19px] font-urbanist-medium text-[#799CFF] text-center px-4 leading-[28px]">
                        Select the wallets you use most often to start tracking your spending automatically
                    </Text>
                </View>

                {/* Wallet Cards */}
                <View className="gap-6">
                    {WALLET_OPTIONS.map((option) => {
                        const isSelected = selectedWallets.includes(option.id);
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() => toggleWallet(option.id)}
                                className={cn(
                                    "w-full h-[150px] rounded-[48px] border-[1.5px] items-center justify-center transition-all",
                                    isSelected
                                        ? "border-[#0F4CFF] bg-[#F5F8FF] shadow-lg shadow-blue-500/10"
                                        : "border-[#DEE6FF] bg-white"
                                )}
                            >
                                <View className="items-center gap-3">
                                    <View className={cn(
                                        "w-14 h-14 rounded-2xl items-center justify-center mb-1",
                                        option.color
                                    )}>
                                        <Text className="text-3xl">{option.icon}</Text>
                                    </View>
                                    <Text className={cn(
                                        "font-urbanist-bold text-[20px]",
                                        isSelected ? "text-[#0F4CFF]" : "text-slate-900"
                                    )}>{option.name}</Text>

                                    {/* Selection Indicator */}
                                    <View className={cn(
                                        "absolute top-[-10] right-[-10] w-8 h-8 rounded-full border-4 border-white items-center justify-center",
                                        isSelected ? "bg-[#0F4CFF]" : "hidden"
                                    )}>
                                        <View className="w-2.5 h-2.5 rounded-full bg-white" />
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}

                    {/* Placeholder for more wallets if needed */}
                    {/* <Pressable
                        className="w-full h-[100px] rounded-[48px] border-[1.5px] border-dashed border-slate-200 items-center justify-center"
                        onPress={() => { }}
                    >
                        <Text className="text-slate-400 font-urbanist-semibold text-[17px]">Add another account</Text>
                    </Pressable> */}
                </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View className="px-10 pb-12 pt-6 bg-white gap-6">
                <Pressable
                    className="w-full h-[50px] rounded-[32px] bg-[#1A51FF] items-center justify-center shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                    onPress={() => router.push('/onboarding-income')}
                >
                    <Text className="text-white text-[20px] font-urbanist-bold leading-tight">Continue</Text>
                </Pressable>

                <Pressable
                    className="w-full py-2 items-center"
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text className="text-[18px] font-urbanist-bold text-[#0F4CFF]">Skip for now</Text>
                </Pressable>
            </View>
        </View>
    );
}
