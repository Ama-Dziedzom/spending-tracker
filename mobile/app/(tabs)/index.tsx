import { View, Text, Image, Pressable, ScrollView, Linking, Platform } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Message02Icon,
    AiMagicIcon,
    ArrowRight01Icon,
    AddCircleHalfDotIcon
} from '@hugeicons/core-free-icons';

export default function Dashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleOpenMessages = async () => {
        try {
            if (Platform.OS === 'ios') {
                const messagesUrl = 'messages://';
                const canOpen = await Linking.canOpenURL(messagesUrl);
                if (canOpen) {
                    await Linking.openURL(messagesUrl);
                } else {
                    await Linking.openURL('sms:');
                }
            } else {
                await Linking.openURL('sms:');
            }
        } catch (error) {
            console.error('Error opening messages:', error);
            // Final fallback
            Linking.openURL('sms:').catch(() => { });
        }
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="flex-row items-center mt-4 mb-24">
                    <View className="w-12 h-12 rounded-full overflow-hidden mr-3">
                        <Image
                            source={require('../../assets/images/ama-avatar.png')}
                            className="w-full h-full"
                        />
                    </View>
                    <View>
                        <Text className="text-[16px] font-manrope text-slate-500">Good morning</Text>
                        <Text className="text-[24px] font-manrope-bold text-slate-900">Hi, Ama</Text>
                    </View>
                </View>

                {/* Empty State Illustration */}
                <View className="items-center mb-14">
                    <View style={{ opacity: 0.51 }}>
                        <Image
                            source={require('../../assets/images/no-wallets.png')}
                            style={{ width: 220, height: 125 }}
                            resizeMode="contain"
                        />
                    </View>
                    <Text className="text-[24px] font-manrope-semibold text-[#1642E5] mt-[9px]">
                        No wallets yet
                    </Text>
                    <Text className="text-[16px] font-manrope text-[#6887F6] text-center mt-2 px-10">
                        Track your spending instantly.{"\n"}Get started by:
                    </Text>
                </View>

                {/* Actions */}
                <View className="gap-8">
                    {/* Recommended: SMS Tracking */}
                    <Pressable
                        onPress={handleOpenMessages}
                        className="bg-[#1642E5] rounded-[32px] p-6 relative overflow-hidden"
                    >
                        {/* Background pattern */}
                        <View className="absolute -right-16 -top-12 opacity-[0.07]">
                            <HugeiconsIcon icon={Message02Icon} size={202} color="white" fill="white" />
                        </View>

                        <View className="flex-row justify-between items-start mb-6">
                            <View className="w-12 h-12 rounded-full bg-white items-center justify-center">
                                <HugeiconsIcon icon={Message02Icon} size={24} color="#1642E5" />
                            </View>
                            <View className="bg-white/10 rounded-full px-3 py-2 flex-row items-center gap-1">
                                <HugeiconsIcon icon={AiMagicIcon} size={14} color="white" />
                                <Text className="text-white text-[12px] font-manrope-semibold">Recommended</Text>
                            </View>
                        </View>

                        <View className="flex-row items-end justify-between">
                            <View className="flex-1 mr-4">
                                <Text className="text-white text-[20px] font-manrope-bold mb-1">
                                    Share a transaction SMS
                                </Text>
                                <Text className="text-white/80 text-[16px] font-manrope">
                                    Log SMS transaction to auto-create
                                </Text>
                            </View>
                            <View className="pb-1">
                                <HugeiconsIcon icon={ArrowRight01Icon} size={24} color="white" />
                            </View>
                        </View>
                    </Pressable>

                    {/* Manual Entry */}
                    <Pressable
                        onPress={() => router.push('/onboarding-link-wallet')}
                        className="border-2 border-dashed border-slate-200 rounded-[24px] p-6 flex-row items-center gap-4"
                    >
                        <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center">
                            <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} color="#64748B" />
                        </View>
                        <Text className="text-[18px] font-manrope-semibold text-slate-500">
                            Add wallet manually
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
