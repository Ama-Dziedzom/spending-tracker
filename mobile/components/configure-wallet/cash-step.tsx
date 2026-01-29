import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { COLORS } from '../../constants/theme';

interface Props {
    name: string;
    setName: (val: string) => void;
    balance: string;
    setBalance: (val: string) => void;
    isIncome: boolean;
    setIsIncome: (val: boolean) => void;
    onNext: () => void;
    stepLabel: string;
    isLastStep: boolean;
    selection: any;
    setSelection: (val: any) => void;
}

export const CashStep = React.memo(({
    name, setName, balance, setBalance, isIncome, setIsIncome, onNext, stepLabel, isLastStep, selection, setSelection
}: Props) => {
    const hasBalance = balance !== '' && balance !== '0.00' && balance !== '0';

    const formatAmount = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

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
            <View className="mt-10">
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">INITIAL BALANCE</Text>
                <View className="flex-row items-baseline gap-4 ml-1">
                    <Text className="text-[20px] font-manrope-semibold mt-10" style={{ color: hasBalance ? COLORS.primary : '#DAE2FF' }}>GHS</Text>
                    <BottomSheetTextInput
                        value={balance}
                        onChangeText={(text) => {
                            setSelection(undefined);
                            let cleaned = text.replace(/[^0-9.]/g, '');
                            if (balance === '0.00' && cleaned.length > 0) {
                                const newPart = cleaned.replace('0.00', '');
                                if (newPart) { setBalance(newPart); return; }
                            }
                            if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') cleaned = cleaned.substring(1);
                            setBalance(cleaned);
                        }}
                        onFocus={() => {
                            const dotIndex = balance.indexOf('.');
                            if (dotIndex !== -1) setSelection({ start: dotIndex, end: dotIndex });
                        }}
                        onBlur={() => setBalance(formatAmount(balance))}
                        selection={selection}
                        keyboardType="decimal-pad"
                        style={{ fontSize: Math.min(80, Math.max(30, 80 * (8 / Math.max(8, balance.length)))), color: hasBalance ? COLORS.primary : '#DAE2FF' }}
                        className={`font-manrope-semibold flex-1 ${hasBalance ? '' : 'text-[#DAE2FF]'}`}
                        placeholder="0.00"
                        placeholderTextColor="#DAE2FF"
                        numberOfLines={1}
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
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={name ? "white" : "#A5B4FC"} />
                </Pressable>
            </View>
        </View>
    );
});
