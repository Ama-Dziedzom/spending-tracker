import React from 'react';
import { View, Text, Pressable, Image, Switch } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tick02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { COLORS } from '../../constants/theme';

export const PROVIDERS = [
    { id: 'mtn', name: 'MTN', image: require('../../assets/images/mtn-logo.png') },
    { id: 'telecel', name: 'Telecel', image: require('../../assets/images/telecel-logo.png') },
    { id: 'at', name: 'AT', image: require('../../assets/images/at-logo.png') }
];

interface Props {
    provider: string | null;
    setProvider: (id: string | null) => void;
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

export const MomoStep = React.memo(({
    provider, setProvider, balance, setBalance, isIncome, setIsIncome, onNext, stepLabel, isLastStep, selection, setSelection
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
                <Text className="text-[24px] font-manrope-semibold" style={{ color: COLORS.primary }}>Mobile Money Wallet</Text>
            </View>
            <View>
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">SELECT PROVIDER</Text>
                <View className="flex-row justify-between">
                    {PROVIDERS.map((p) => {
                        const isSelected = provider === p.id;
                        return (
                            <Pressable
                                key={p.id}
                                onPress={() => setProvider(isSelected ? null : p.id)}
                                className={`w-[101px] h-[77px] rounded-[10px] border-[1.5px] items-center justify-center relative ${isSelected ? 'border-[#1340DF] bg-[#F1F4FF]' : 'border-[#EDEDED] bg-white'}`}
                            >
                                <View className={`absolute top-2 left-2 w-[14px] h-[14px] rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#1642E5] border-[#1642E5]' : 'bg-white border-[#CBD5E1]'}`}>
                                    {isSelected && <HugeiconsIcon icon={Tick02Icon} size={10} color="white" />}
                                </View>
                                <View className="w-10 h-10 items-center justify-center">
                                    <Image source={p.image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                </View>
                            </Pressable>
                        );
                    })}
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
                    disabled={!provider}
                    className={`w-[342px] h-[60px] rounded-full flex-row items-center justify-center gap-2 ${provider ? '' : 'bg-[#DAE2FF]'}`}
                    style={provider ? { backgroundColor: COLORS.primary } : {}}
                >
                    <Text className={`text-[20px] font-manrope-semibold ${provider ? 'text-white' : 'text-[#A5B4FC]'}`}>
                        {isLastStep ? 'Link Wallets' : 'Next'}
                    </Text>
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={provider ? "white" : "#A5B4FC"} />
                </Pressable>
            </View>
        </View>
    );
});
