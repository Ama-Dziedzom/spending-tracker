import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';

export const LinkingStep = React.memo(() => (
    <View className="flex-1 items-center justify-center pt-20">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-[20px] font-manrope-semibold text-[#1642E5] mt-8 text-center px-10">
            Securely linking your wallets...
        </Text>
        <Text className="text-[14px] font-manrope text-[#7C7D80] mt-2 text-center px-10">
            This will only take a moment.
        </Text>
    </View>
));
