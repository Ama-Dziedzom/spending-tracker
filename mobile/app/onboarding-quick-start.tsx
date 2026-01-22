import { View, Text, Pressable, Linking, Platform, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowUpRight03Icon, Share03Icon } from '@hugeicons/core-free-icons';

export default function OnboardingQuickStart() {
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

    const handleSkip = () => {
        router.push('/(tabs)');
    };

    const steps = [
        {
            title: 'Open messages',
            subtitle: 'Go to your default SMS app',
        },
        {
            title: 'Find SMS',
            subtitle: 'Locate a recent bank notification',
        },
        {
            title: 'Long-Press',
            subtitle: 'Tap and hold the message bubble',
        },
        {
            title: 'Share',
            subtitle: 'Select      Share from the menu',
            hasShareIcon: true,
        },
        {
            title: 'Log Transaction',
            subtitle: "Tap 'Log Transaction' in the sheet",
        },
    ];

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 10 }}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 23, paddingTop: 24 }}>
                <View className="items-center mb-8">
                    <Text className="text-[32px] font-manrope-semibold text-[#1642E5] text-center mb-1">
                        Log your first transaction
                    </Text>
                    <Text className="text-[18px] font-manrope-regular text-[#8B9FF2] text-center">
                        Follow these steps to enable quick logging
                    </Text>
                </View>

                {/* Steps Card */}
                <View className="bg-white border-[#EDEDED] border-[1.5px] rounded-[24px] p-6 mb-4">
                    {steps.map((step, index) => (
                        <View key={index} className="flex-row items-stretch">
                            <View className="items-center mr-4 w-[40px]">
                                <View className="w-[40px] h-[40px] rounded-full bg-[#F0F3FF] items-center justify-center z-10">
                                    <Text className="text-[#1642E5] font-manrope-semibold text-[16px]">
                                        {index + 1}
                                    </Text>
                                </View>
                                {index < steps.length - 1 && (
                                    <View className="flex-1 w-[1.5px] bg-[#1642E5] -my-1" />
                                )}
                            </View>
                            <View className="flex-1 pb-6 pt-1">
                                <Text className="text-[18px] font-manrope-semibold text-[#3D3D3D] mb-0.5">
                                    {step.title}
                                </Text>
                                <View className="flex-row items-center flex-wrap">
                                    <Text className="text-[14px] font-manrope-regular text-[#737373] leading-[20px]">
                                        {step.subtitle.split('      ')[0]}
                                    </Text>
                                    {step.hasShareIcon && (
                                        <View className="flex-row items-center bg-[#EDEDED] px-1.5 py-0.5 rounded-sm mx-1">
                                            <HugeiconsIcon icon={Share03Icon} size={14} color="#3D3D3D" />
                                            <Text className="text-[#3D3D3D] font-manrope-medium text-[11px] ml-1">Share</Text>
                                        </View>
                                    )}
                                    {step.hasShareIcon && (
                                        <Text className="text-[14px] font-manrope-regular text-[#737373] leading-[20px]">
                                            {step.subtitle.split('      ')[1]}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Illustration */}
                <View className="items-center justify-center w-full mb-6">
                    <Image
                        source={require('../assets/images/quick-start-illustration.png')}
                        className="w-full h-[220px]"
                        resizeMode="contain"
                    />
                </View>
            </ScrollView>

            <View className="px-[23px] gap-4">
                {/* primary action button */}
                <Pressable
                    onPress={handleOpenMessages}
                    className="w-full bg-[#1642E5] h-[64px] rounded-full flex-row items-center justify-center gap-2 shadow-sm"
                >
                    <Text className="text-white font-manrope-semibold text-[20px]">
                        Open Messages app
                    </Text>
                    <HugeiconsIcon icon={ArrowUpRight03Icon} size={20} color="white" />
                </Pressable>

                {/* secondary action button */}
                <Pressable
                    onPress={handleSkip}
                    className="w-full py-2 items-center justify-center"
                >
                    <Text className="text-[#1642E5] font-manrope-semibold text-[20px]">
                        I’ll do this later
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
