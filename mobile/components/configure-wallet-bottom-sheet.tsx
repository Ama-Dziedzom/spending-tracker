import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Switch, ScrollView, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowRight02Icon,
    Tick02Icon,
    BankIcon,
    Wallet01Icon,
    Edit01Icon
} from '@hugeicons/core-free-icons';
import { createWallets, CreateWalletInput } from '../lib/wallet-service';

interface Props {
    isVisible: boolean;
    selectedWallets: string[];
    onClose: () => void;
    onConfigure: (data: any) => void;
    isLoading?: boolean;
    initialBalanceFromTransaction?: string;
}

const PROVIDERS = [
    {
        id: 'mtn',
        name: 'MTN',
        image: require('../assets/images/mtn-logo.png'),
    },
    {
        id: 'telecel',
        name: 'Telecel',
        image: require('../assets/images/telecel-logo.png'),
    },
    {
        id: 'at',
        name: 'AT',
        image: require('../assets/images/at-logo.png'),
    }
];

type Step = 'momo' | 'bank' | 'cash' | 'preview';

export function ConfigureWalletBottomSheet({ isVisible, selectedWallets, onClose, onConfigure, isLoading, initialBalanceFromTransaction }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [currentStep, setCurrentStep] = useState<Step>('momo');
    const snapPoints = useMemo(() => ['70%', '98%'], []);

    // State for all wallets
    const [momoProvider, setMomoProvider] = useState<string | null>(null);
    const [momoBalance, setMomoBalance] = useState('0.00');
    const [momoIsIncome, setMomoIsIncome] = useState(false);

    const [bankName, setBankName] = useState('');
    const [bankBalance, setBankBalance] = useState('0.00');
    const [bankIsIncome, setBankIsIncome] = useState(false);

    const [cashName, setCashName] = useState('');
    const [cashBalance, setCashBalance] = useState('0.00');
    const [cashIsIncome, setCashIsIncome] = useState(false);

    // Selection states for balance inputs
    const [momoSelection, setMomoSelection] = useState<any>(undefined);
    const [bankSelection, setBankSelection] = useState<any>(undefined);
    const [cashSelection, setCashSelection] = useState<any>(undefined);

    // Dynamic Step Sequence
    const stepSequence = useMemo(() => {
        const order: Step[] = ['momo', 'bank', 'cash'];
        const filtered = order.filter(s => selectedWallets.includes(s));
        return [...filtered, 'preview' as Step];
    }, [selectedWallets]);

    const currentStepIndex = stepSequence.indexOf(currentStep);
    const totalSteps = stepSequence.length - 1; // Exclude preview from "Step X of Y" count
    const stepLabel = currentStep === 'preview' ? '' : `Step ${currentStepIndex + 1} of ${totalSteps}`;

    const handleNext = () => {
        const nextStep = stepSequence[currentStepIndex + 1];
        if (nextStep) {
            setCurrentStep(nextStep);
        }
    };

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                transparent={true}
                opacity={0.5}
            />
        ),
        []
    );

    React.useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.snapToIndex(0);
            const firstStep = stepSequence[0];
            setCurrentStep(firstStep);

            // Pre-fill initial balance if provided
            if (initialBalanceFromTransaction) {
                const formatted = parseFloat(initialBalanceFromTransaction).toFixed(2);
                if (firstStep === 'momo') setMomoBalance(formatted);
                else if (firstStep === 'bank') setBankBalance(formatted);
                else if (firstStep === 'cash') setCashBalance(formatted);
            }
        } else {
            bottomSheetRef.current?.close();
            // Reset states when closing
            if (!initialBalanceFromTransaction) {
                setMomoBalance('0.00');
                setBankBalance('0.00');
                setCashBalance('0.00');
            }
        }
    }, [isVisible, stepSequence, initialBalanceFromTransaction]);

    const formatAmount = (val: string) => {
        const num = parseFloat(val);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const totalBalance = useMemo(() => {
        const momo = selectedWallets.includes('momo') ? (parseFloat(momoBalance) || 0) : 0;
        const bank = selectedWallets.includes('bank') ? (parseFloat(bankBalance) || 0) : 0;
        const cash = selectedWallets.includes('cash') ? (parseFloat(cashBalance) || 0) : 0;
        return momo + bank + cash;
    }, [momoBalance, bankBalance, cashBalance, selectedWallets]);

    const hasMomoBalance = momoBalance !== '' && momoBalance !== '0.00' && momoBalance !== '0';
    const hasBankBalance = bankBalance !== '' && bankBalance !== '0.00' && bankBalance !== '0';
    const hasCashBalance = cashBalance !== '' && cashBalance !== '0.00' && cashBalance !== '0';

    const renderMomoStep = () => (
        <View className="flex-1">
            <View className="items-end pt-2 pb-4">
                <Text className="text-[16px] font-manrope-semibold text-[#7C7D80]">{stepLabel}</Text>
            </View>
            <View className="mb-8">
                <Text className="text-[24px] font-manrope-semibold text-[#1642E5]">Mobile Money Wallet</Text>
            </View>
            <View>
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">SELECT PROVIDER</Text>
                <View className="flex-row justify-between">
                    {PROVIDERS.map((provider) => {
                        const isSelected = momoProvider === provider.id;
                        return (
                            <Pressable
                                key={provider.id}
                                onPress={() => setMomoProvider(isSelected ? null : provider.id)}
                                className={`w-[101px] h-[77px] rounded-[10px] border-[1.5px] items-center justify-center relative ${isSelected ? 'border-[#1340DF] bg-[#F1F4FF]' : 'border-[#EDEDED] bg-white'}`}
                            >
                                <View className={`absolute top-2 left-2 w-[14px] h-[14px] rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#1642E5] border-[#1642E5]' : 'bg-white border-[#CBD5E1]'}`}>
                                    {isSelected && <HugeiconsIcon icon={Tick02Icon} size={10} color="white" />}
                                </View>
                                <View className="w-10 h-10 items-center justify-center">
                                    <Image source={provider.image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
            <View className="mt-10">
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">INITIAL BALANCE</Text>
                <View className="flex-row items-baseline gap-4 ml-1">
                    <Text className={`text-[20px] font-manrope-semibold mt-10 ${hasMomoBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}>GHS</Text>
                    <BottomSheetTextInput
                        value={momoBalance}
                        onChangeText={(text) => {
                            setMomoSelection(undefined);
                            // Strip invalid characters but allow dots
                            let cleaned = text.replace(/[^0-9.]/g, '');

                            if (momoBalance === '0.00' && cleaned.length > 0) {
                                // If we were at 0.00, only take the new digits
                                const newPart = cleaned.replace('0.00', '');
                                if (newPart) {
                                    setMomoBalance(newPart);
                                    return;
                                }
                            }

                            // Prevent leading zeros unless followed by a dot (e.g., '0.5' is fine, '05' becomes '5')
                            if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
                                cleaned = cleaned.substring(1);
                            }

                            setMomoBalance(cleaned);
                        }}
                        onFocus={() => {
                            const dotIndex = momoBalance.indexOf('.');
                            if (dotIndex !== -1) {
                                setMomoSelection({ start: dotIndex, end: dotIndex });
                            }
                        }}
                        onBlur={() => setMomoBalance(formatAmount(momoBalance))}
                        selection={momoSelection}
                        keyboardType="decimal-pad"
                        style={{ fontSize: Math.min(80, Math.max(30, 80 * (8 / Math.max(8, momoBalance.length)))) }}
                        className={`font-manrope-semibold flex-1 ${hasMomoBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}
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
                            value={momoIsIncome}
                            onValueChange={setMomoIsIncome}
                            trackColor={{ false: '#F0F0F0', true: '#1642E5' }}
                            thumbColor="white"
                        />
                    </View>
                </View>
            </View>
            <View className="mt-10 items-center">
                <Pressable
                    onPress={handleNext}
                    disabled={!momoProvider}
                    className={`w-[342px] h-[60px] rounded-full flex-row items-center justify-center gap-2 ${momoProvider ? 'bg-[#1642E5]' : 'bg-[#DAE2FF]'}`}
                >
                    <Text className={`text-[20px] font-manrope-semibold ${momoProvider ? 'text-white' : 'text-[#A5B4FC]'}`}>Next</Text>
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={momoProvider ? "white" : "#A5B4FC"} />
                </Pressable>
            </View>
        </View>
    );

    const renderBankStep = () => (
        <View className="flex-1">
            <View className="items-end pt-2 pb-4">
                <Text className="text-[16px] font-manrope-semibold text-[#7C7D80]">{stepLabel}</Text>
            </View>
            <View className="mb-8">
                <Text className="text-[24px] font-manrope-semibold text-[#1642E5]">Bank Wallet</Text>
            </View>
            <View>
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">WALLET NAME</Text>
                <View className="w-full h-[52px] px-5 rounded-[10px] border-[1.5px] border-[#EDEDED] bg-white justify-center">
                    <BottomSheetTextInput
                        value={bankName}
                        onChangeText={setBankName}
                        placeholder="My Wallet Name"
                        placeholderTextColor="#DEDEDE"
                        className="text-[16px] font-manrope-medium text-[#5B5B5B]"
                    />
                </View>
            </View>
            <View className="mt-10">
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">INITIAL BALANCE</Text>
                <View className="flex-row items-baseline gap-4 ml-1">
                    <Text className={`text-[20px] font-manrope-semibold mt-10 ${hasBankBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}>GHS</Text>
                    <BottomSheetTextInput
                        value={bankBalance}
                        onChangeText={(text) => {
                            setBankSelection(undefined);
                            let cleaned = text.replace(/[^0-9.]/g, '');

                            if (bankBalance === '0.00' && cleaned.length > 0) {
                                const newPart = cleaned.replace('0.00', '');
                                if (newPart) {
                                    setBankBalance(newPart);
                                    return;
                                }
                            }

                            if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
                                cleaned = cleaned.substring(1);
                            }

                            setBankBalance(cleaned);
                        }}
                        onFocus={() => {
                            const dotIndex = bankBalance.indexOf('.');
                            if (dotIndex !== -1) {
                                setBankSelection({ start: dotIndex, end: dotIndex });
                            }
                        }}
                        onBlur={() => setBankBalance(formatAmount(bankBalance))}
                        selection={bankSelection}
                        keyboardType="decimal-pad"
                        style={{ fontSize: Math.min(80, Math.max(30, 80 * (8 / Math.max(8, bankBalance.length)))) }}
                        className={`font-manrope-semibold flex-1 ${hasBankBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}
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
                            value={bankIsIncome}
                            onValueChange={setBankIsIncome}
                            trackColor={{ false: '#F0F0F0', true: '#1642E5' }}
                            thumbColor="white"
                        />
                    </View>
                </View>
            </View>
            <View className="mt-10 items-center">
                <Pressable
                    onPress={handleNext}
                    disabled={!bankName}
                    className={`w-[342px] h-[60px] rounded-full flex-row items-center justify-center gap-2 ${bankName ? 'bg-[#1642E5]' : 'bg-[#DAE2FF]'}`}
                >
                    <Text className={`text-[20px] font-manrope-semibold ${bankName ? 'text-white' : 'text-[#A5B4FC]'}`}>Next</Text>
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={bankName ? "white" : "#A5B4FC"} />
                </Pressable>
            </View>
        </View>
    );

    const renderCashStep = () => (
        <View className="flex-1">
            <View className="items-end pt-2 pb-4">
                <Text className="text-[16px] font-manrope-semibold text-[#7C7D80]">{stepLabel}</Text>
            </View>
            <View className="mb-8">
                <Text className="text-[24px] font-manrope-semibold text-[#1642E5]">Cash Wallet</Text>
            </View>
            <View>
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">WALLET NAME</Text>
                <View className="w-full h-[52px] px-5 rounded-[10px] border-[1.5px] border-[#EDEDED] bg-white justify-center">
                    <BottomSheetTextInput
                        value={cashName}
                        onChangeText={setCashName}
                        placeholder="My Wallet Name"
                        placeholderTextColor="#DEDEDE"
                        className="text-[16px] font-manrope-medium text-[#5B5B5B]"
                    />
                </View>
            </View>
            <View className="mt-10">
                <Text className="text-[14px] font-manrope-medium text-[#5B5B5B] uppercase mb-4 pl-1">INITIAL BALANCE</Text>
                <View className="flex-row items-baseline gap-4 ml-1">
                    <Text className={`text-[20px] font-manrope-semibold mt-10 ${hasCashBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}>GHS</Text>
                    <BottomSheetTextInput
                        value={cashBalance}
                        onChangeText={(text) => {
                            setCashSelection(undefined);
                            let cleaned = text.replace(/[^0-9.]/g, '');

                            if (cashBalance === '0.00' && cleaned.length > 0) {
                                const newPart = cleaned.replace('0.00', '');
                                if (newPart) {
                                    setCashBalance(newPart);
                                    return;
                                }
                            }

                            if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
                                cleaned = cleaned.substring(1);
                            }

                            setCashBalance(cleaned);
                        }}
                        onFocus={() => {
                            const dotIndex = cashBalance.indexOf('.');
                            if (dotIndex !== -1) {
                                setCashSelection({ start: dotIndex, end: dotIndex });
                            }
                        }}
                        onBlur={() => setCashBalance(formatAmount(cashBalance))}
                        selection={cashSelection}
                        keyboardType="decimal-pad"
                        style={{ fontSize: Math.min(80, Math.max(30, 80 * (8 / Math.max(8, cashBalance.length)))) }}
                        className={`font-manrope-semibold flex-1 ${hasCashBalance ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}
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
                            value={cashIsIncome}
                            onValueChange={setCashIsIncome}
                            trackColor={{ false: '#F0F0F0', true: '#1642E5' }}
                            thumbColor="white"
                        />
                    </View>
                </View>
            </View>
            <View className="mt-10 items-center">
                <Pressable
                    onPress={handleNext}
                    disabled={!cashName}
                    className={`w-[342px] h-[60px] rounded-full flex-row items-center justify-center gap-2 ${cashName ? 'bg-[#1642E5]' : 'bg-[#DAE2FF]'}`}
                >
                    <Text className={`text-[20px] font-manrope-semibold ${cashName ? 'text-white' : 'text-[#A5B4FC]'}`}>Next</Text>
                    <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={cashName ? "white" : "#A5B4FC"} />
                </Pressable>
            </View>
        </View>
    );

    const renderPreviewStep = () => (
        <View className="flex-1 items-center pt-2">
            <View className="w-[127px] h-[127px] mb-6">
                <Image
                    source={require('../assets/images/success-trophy.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                />
            </View>
            <Text className="text-[32px] font-manrope-bold text-[#1642E5] mb-2">All Set!</Text>
            <Text className="text-[20px] font-manrope-medium text-[#7C7D80] text-center px-10 mb-8">
                Your accounts are linked securely and ready for action.
            </Text>

            <View className="items-center mb-8">
                <Text className="text-[14px] font-manrope-bold text-[#ADAEAF] uppercase">TOTAL BALANCE</Text>
                <Text
                    style={{ width: '100%', textAlign: 'center' }}
                    className="text-[72px] font-manrope-bold text-[#1340DF]"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                >
                    {totalBalance.toFixed(2)}
                </Text>
            </View>

            <View className="w-full bg-white border-[1.5px] border-[#F1F1F1] rounded-[20px] p-5 mb-8">
                {/* Momo Wallet */}
                {selectedWallets.includes('momo') && (
                    <View className="flex-row items-center justify-between mb-6 gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                {momoProvider && (
                                    <Image
                                        source={PROVIDERS.find(p => p.id === momoProvider)?.image}
                                        style={{ width: '100%', height: '100%', borderRadius: 20 }}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {PROVIDERS.find(p => p.id === momoProvider)?.name ? `${PROVIDERS.find(p => p.id === momoProvider)?.name} Wallet` : 'Mobile Money Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(momoBalance)}
                        </Text>
                    </View>
                )}

                {/* Bank Wallet */}
                {selectedWallets.includes('bank') && (
                    <View className="flex-row items-center justify-between mb-6 gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                <HugeiconsIcon icon={BankIcon} size={20} color="#1642E5" />
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {bankName || 'Bank Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(bankBalance)}
                        </Text>
                    </View>
                )}

                {/* Cash Wallet */}
                {selectedWallets.includes('cash') && (
                    <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-row items-center gap-4 flex-1">
                            <View className="w-10 h-10 rounded-full bg-[#F1F4FF] items-center justify-center shrink-0">
                                <HugeiconsIcon icon={Wallet01Icon} size={20} color="#1642E5" />
                            </View>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                className="text-[18px] font-manrope-medium text-[#7C7D80] flex-1"
                            >
                                {cashName || 'Cash Wallet'}
                            </Text>
                        </View>
                        <Text
                            className="text-[20px] font-manrope-bold text-[#7C7D80] shrink-0"
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            GHS {formatAmount(cashBalance)}
                        </Text>
                    </View>
                )}
            </View>

            <Pressable
                onPress={() => onConfigure({
                    momo: selectedWallets.includes('momo') ? { provider: momoProvider, balance: momoBalance, isIncome: momoIsIncome } : null,
                    bank: selectedWallets.includes('bank') ? { name: bankName, balance: bankBalance, isIncome: bankIsIncome } : null,
                    cash: selectedWallets.includes('cash') ? { name: cashName, balance: cashBalance, isIncome: cashIsIncome } : null
                })}
                disabled={isLoading}
                className={`w-full h-[60px] rounded-full flex-row items-center justify-center gap-2 mb-4 ${isLoading ? 'bg-[#7C7D80]' : 'bg-[#1642E5]'}`}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Text className="text-[20px] font-manrope-semibold text-white">Go to dashboard</Text>
                        <HugeiconsIcon icon={ArrowRight02Icon} size={24} color="white" />
                    </>
                )}
            </Pressable>

            <Pressable
                onPress={() => setCurrentStep(stepSequence[0])}
                className="flex-row items-center gap-2"
            >
                <HugeiconsIcon icon={Edit01Icon} size={24} color="#1642E5" />
                <Text className="text-[20px] font-manrope-semibold text-[#1642E5]">Edit wallets</Text>
            </Pressable>
        </View>
    );

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            keyboardBehavior="extend"
            keyboardBlurBehavior="none"
            backgroundStyle={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
            handleIndicatorStyle={{ backgroundColor: '#EDEDED', width: 60, height: 4 }}
        >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 29 }}>
                {currentStep === 'momo' && renderMomoStep()}
                {currentStep === 'bank' && renderBankStep()}
                {currentStep === 'cash' && renderCashStep()}
                {currentStep === 'preview' && renderPreviewStep()}
            </BottomSheetView>
        </BottomSheet>
    );
}

