import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smartphone, Settings, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export default function OnboardingChoice() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-6 mb-4">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100">
                    <ChevronLeft size={24} color="#0F4CFF" />
                </Pressable>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View className="mt-8 mb-12 items-center">
                    <Text className="text-[38px] font-heading text-[#0F4CFF] text-center leading-[46px] tracking-tight">
                        How do you want to start?
                    </Text>
                </View>

                {/* Options */}
                <View className="gap-6">
                    {/* Quick Start Option */}
                    <Pressable
                        onPress={() => router.push('/onboarding-quick-start')}
                        className="w-full rounded-[48px] border-[1.5px] border-[#0F4CFF] bg-[#F5F8FF] p-8 shadow-lg shadow-blue-500/10"
                    >
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center shadow-sm">
                                <Smartphone size={32} color="#0F4CFF" />
                            </View>
                            <View className="bg-[#0F4CFF] px-4 py-1.5 rounded-full">
                                <Text className="text-white font-heading text-[12px] uppercase tracking-wider">Recommended</Text>
                            </View>
                        </View>

                        <Text className="text-2xl font-heading text-[#0F4CFF] mb-2 text-left">Quick Start</Text>
                        <Text className="text-[17px] font-ui text-slate-600 leading-[24px] mb-6 text-left">
                            Share a transaction SMS to begin. We'll set up your wallet automatically
                        </Text>

                        <View className="flex-row items-center gap-2">
                            <Text className="text-[#0F4CFF] font-heading text-[18px]">Try This</Text>
                            <ArrowRight size={20} color="#0F4CFF" />
                        </View>
                    </Pressable>

                    {/* Full Setup Option */}
                    <Pressable
                        onPress={() => router.push('/onboarding')}
                        className="w-full rounded-[48px] border-[1.5px] border-[#DEE6FF] bg-white p-8"
                    >
                        <View className="w-14 h-14 rounded-2xl bg-slate-50 items-center justify-center mb-4">
                            <Settings size={32} color="#64748B" />
                        </View>

                        <Text className="text-2xl font-heading text-slate-900 mb-2 text-left">Full Setup</Text>
                        <Text className="text-[17px] font-ui text-slate-500 leading-[24px] mb-6 text-left">
                            Add all your wallets with balances now
                        </Text>

                        <View className="flex-row items-center gap-2">
                            <Text className="text-slate-400 font-heading text-[18px]">Set Up Wallets</Text>
                            <ArrowRight size={20} color="#94A3B8" />
                        </View>
                    </Pressable>
                </View>

                {/* Footer Section */}
                <View className="mt-12 items-center">
                    <Text className="text-[16px] font-ui text-slate-400 mb-2">
                        You can always add wallets later
                    </Text>
                    <Pressable onPress={() => router.replace('/(tabs)')}>
                        <Text className="text-[18px] font-heading text-[#0F4CFF]">Skip for now</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
