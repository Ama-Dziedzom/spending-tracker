import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ChartLineData02Icon } from '@hugeicons/core-free-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';

export default function Insights() {
    const insets = useSafeAreaInsets();

    return (
        <View style={{ paddingTop: insets.top }} className="flex-1 bg-slate-50">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="px-6 flex-row items-center justify-center mb-2">
                <Text className="text-slate-900 font-manrope-bold text-[24px]">Insights</Text>
            </View>

            {/* Coming Soon Content */}
            <View className="flex-1 items-center justify-center px-8">
                <Animated.View
                    {...{ entering: FadeInDown.delay(100).duration(600) } as any}
                    className="items-center"
                >
                    <View className="w-20 h-20 rounded-[28px] bg-white border border-slate-100 items-center justify-center mb-6 shadow-sm shadow-slate-200/50">
                        <HugeiconsIcon icon={ChartLineData02Icon} size={36} color={COLORS.primary} />
                    </View>
                    <Text className="text-slate-900 font-manrope-bold text-[22px] mb-2">Coming Soon</Text>
                    <Text className="text-slate-400 font-manrope text-[15px] text-center leading-[22px]">
                        Spending insights and analytics are on the way. Stay tuned!
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}
