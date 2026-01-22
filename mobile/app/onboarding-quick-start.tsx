import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowUpRight03Icon } from '@hugeicons/core-free-icons';

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

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
            <View className="flex-1 px-10 pt-8 items-center">
                <Text className="text-[32px] font-manrope-semibold text-[#1642E5] text-center leading-[36px]">
                    Log your first transaction
                </Text>

                {/* Illustration/Image placeholder - If the design has an image, it usually goes here */}
                <View className="flex-1 justify-center items-center w-full">
                    {/* Add illustration here if needed */}
                </View>
            </View>

            <View className="px-10 gap-2">
                {/* primary action button */}
                <Pressable
                    onPress={handleOpenMessages}
                    className="w-full bg-[#1642E5] h-[54px] rounded-[24px] flex-row items-center justify-center gap-2"
                >
                    <Text className="text-white font-manrope-semibold text-[20px]">
                        Open Messages app
                    </Text>
                    <HugeiconsIcon icon={ArrowUpRight03Icon} size={20} color="white" />
                </Pressable>

                {/* secondary action button */}
                <Pressable
                    onPress={handleSkip}
                    className="w-full h-[44px] items-center justify-center"
                >
                    <Text className="text-[#1642E5] font-manrope-medium text-[20px]">
                        I’ll do this later
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
