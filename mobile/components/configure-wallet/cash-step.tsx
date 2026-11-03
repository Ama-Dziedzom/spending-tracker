import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { COLORS } from '../../constants/theme';

interface Props {
    name: string;
    setName: (val: string) => void;
    isIncome: boolean;
    setIsIncome: (val: boolean) => void;
    onNext: () => void;
    stepLabel: string;
    isLastStep: boolean;
}

export const CashStep = React.memo(({
    name, setName, isIncome, setIsIncome, onNext, stepLabel, isLastStep
}: Props) => {
    return (
        <View className="flex-1">
            <View className="items-end pt-2 pb-4">
                <Text className="text-[16px] font-manrope-semibold text-[#7C7D80]">{stepLabel}</Text>
            </View>
            <View className="mb-8">
                <Text className="text-[24px] font-manrope-semibold" style={{ color: COLORS.primary }}>Cash Wallet</Text>
            </View>
            <View>
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">WALLET NAME</Text>
                <View className="w-full h-[52px] px-5 rounded-[10px] border-[1.5px] border-[#EDEDED] bg-white justify-center">
                    <BottomSheetTextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="My Wallet Name"
                        placeholderTextColor="#DEDEDE"
                        className="text-[16px] font-manrope-medium text-[#5B5B5B]"
                    />
                </View>
            </View>
            <View className="mt-8">
                <View className="w-full h-[72px] px-5 rounded-[15px] border-[1.5px] border-[#F1F1F1] bg-white flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                        <Text className="text-[16px] font-manrope-medium text-[#5B5B5B]">Regular income source?</Text>
                        <Text className="text-[14px] font-manrope text-[#7C7D80]">Enable if you receive salary here</Text>
                    </View>
                    <View style={{ transform: [{ scale: 0.8 }] }}>
                        <Switch
                            value={isIncome}
                            onValueChange={setIsIncome}
                            trackColor={{ false: '#F0F0F0', true: COLORS.primary }}
                            thumbColor="white"
                        />
                    </View>
                </View>
            </View>
            <View className="mt-10 items-center">
                <Pressable
                    onPress={onNext}
                    disabled={!name}
                    className={`w-[342px] h-[60px] rounded-full flex-row items-center justify-center gap-2 ${name ? '' : 'bg-[#DAE2FF]'}`}
                    style={name ? { backgroundColor: COLORS.primary } : {}}
                >
                    <Text className={`text-[20px] font-manrope-semibold ${name ? 'text-white' : 'text-[#A5B4FC]'}`}>
                        {isLastStep ? 'Link Wallets' : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
});
