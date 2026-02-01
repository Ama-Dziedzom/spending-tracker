import { View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    AiMagicIcon,
} from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Insights() {
    const insets = useSafeAreaInsets();

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0F4CFF', '#1642E5', '#0E1F5B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <View style={{ paddingTop: insets.top + 10 }} className="flex-1">
                {/* Header */}
                <View className="px-6 flex-row items-center justify-center mb-2">
                    <Text className="text-white font-manrope-bold text-[24px]">Insights</Text>
                </View>

                {/* Coming Soon Content */}
                <View className="flex-1 items-center justify-center px-10 pb-20">
                    <View className="w-24 h-24 rounded-[32px] bg-white/10 items-center justify-center mb-8 border border-white/20">
                        <HugeiconsIcon icon={AiMagicIcon} size={42} color="#FFFFFF" />
                    </View>

                    <Text className="text-white font-manrope-bold text-[32px] text-center mb-4">
                        Coming Soon
                    </Text>

                    <Text className="text-white/60 font-manrope text-[16px] text-center leading-[24px]">
                        We're building powerful AI insights to help you understand your spending DNA and grow your wealth.
                    </Text>

                    <View className="mt-12 flex-row gap-2">
                        {[1, 2, 3].map((i) => (
                            <View key={i} className="w-2 h-2 rounded-full bg-white/20" />
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}
