import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, Image, StyleSheet, TextInput, Switch } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowRight02Icon, Tick02Icon } from '@hugeicons/core-free-icons';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onConfigure: (provider: string) => void;
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

export function ConfigureWalletBottomSheet({ isVisible, onClose, onConfigure }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['85%'], []);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
    const [balance, setBalance] = React.useState('500.00');
    const [isRegularIncome, setIsRegularIncome] = React.useState(false);

    // Update state based on provider selection to match designs
    React.useEffect(() => {
        if (selectedProvider) {
            setIsRegularIncome(true);
            setBalance('500.00');
        } else {
            setIsRegularIncome(false);
            setBalance('0.00');
        }
    }, [selectedProvider]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
            />
        ),
        []
    );

    React.useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    const isActive = !!selectedProvider;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
            handleIndicatorStyle={{ backgroundColor: '#E2E8F0', width: 40 }}
        >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
                {/* Header */}
                <View className="mb-8 px-2 relative">
                    <Text className="text-[32px] font-manrope-semibold text-[#1642E5] mt-8">
                        Configure your wallet
                    </Text>
                    <Text className="text-[16px] font-manrope text-[#7C7D80] absolute top-2 right-2">
                        Step 1 of 3
                    </Text>
                </View>

                {/* Provider Selection */}
                <View className="px-2">
                    <Text className="text-[12px] font-manrope-semibold text-[#64748B] uppercase tracking-wider mb-5">
                        SELECT PROVIDER
                    </Text>
                    <View className="flex-row justify-between">
                        {PROVIDERS.map((provider) => {
                            const isSelected = selectedProvider === provider.id;
                            return (
                                <Pressable
                                    key={provider.id}
                                    onPress={() => setSelectedProvider(isSelected ? null : provider.id)}
                                    className={`w-[101px] h-[77px] rounded-[15px] border-[1.5px] items-center justify-center relative ${isSelected ? 'border-[#1340DF] bg-[#F1F4FF]' : 'border-[#EDEDED] bg-white'
                                        }`}
                                >
                                    {/* Checkbox in top-left */}
                                    <View
                                        className={`absolute top-2 left-2 w-[14px] h-[14px] rounded-[4px] border-[1px] items-center justify-center ${isSelected ? 'bg-[#1642E5] border-[#1642E5]' : 'bg-white border-[#CBD5E1]'
                                            }`}
                                    >
                                        {isSelected && <HugeiconsIcon icon={Tick02Icon} size={10} color="white" />}
                                    </View>

                                    {/* Logo */}
                                    <View className="w-10 h-10 items-center justify-center">
                                        <Image
                                            source={provider.image}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Initial Balance Section */}
                <View className="mt-10 px-2">
                    <Text className="text-[12px] font-manrope-semibold text-[#64748B] uppercase tracking-wider mb-4">
                        INITIAL BALANCE
                    </Text>
                    <View className="flex-row items-baseline justify-center mb-8 gap-4">
                        <Text className={`text-[24px] font-manrope-semibold ${isActive ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}>GHS</Text>
                        <TextInput
                            value={balance}
                            onChangeText={setBalance}
                            keyboardType="numeric"
                            editable={isActive}
                            className={`text-[64px] font-manrope-semibold ${isActive ? 'text-[#1642E5]' : 'text-[#DAE2FF]'}`}
                            placeholder="0.00"
                        />
                    </View>
                </View>

                {/* Income Toggle Section */}
                <View className="px-2 flex-1">
                    <View
                        className={`w-full p-6 rounded-[24px] border-[1.5px] border-[#F1F1F1] bg-white flex-row items-center justify-between ${!isActive ? 'opacity-100' : ''}`}
                    >
                        <View className="flex-1 mr-4">
                            <Text className="text-[18px] font-manrope-medium text-[#3D3D3D]">
                                Regular income source?
                            </Text>
                            <Text className="text-[14px] font-manrope text-[#737373] mt-1">
                                Enable if you receive salary here
                            </Text>
                        </View>
                        <Switch
                            value={isRegularIncome}
                            onValueChange={setIsRegularIncome}
                            disabled={!isActive}
                            trackColor={{ false: '#ECEFF1', true: '#1642E5' }}
                            thumbColor="white"
                            ios_backgroundColor="#ECEFF1"
                        />
                    </View>
                </View>

                {/* Footer Action */}
                <View className="pb-10 pt-4 px-2">
                    <Pressable
                        onPress={() => selectedProvider && onConfigure(selectedProvider)}
                        disabled={!selectedProvider}
                        className={`w-full h-[64px] rounded-full flex-row items-center justify-center gap-2 ${isActive ? 'bg-[#1642E5]' : 'bg-[#DAE2FF]'}`}
                        style={isActive ? {
                            shadowColor: '#1642E5',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 10,
                            elevation: 4
                        } : {}}
                    >
                        <Text className={`text-[20px] font-manrope-semibold ${isActive ? 'text-white' : 'text-[#A5B4FC]'}`}>
                            Next
                        </Text>
                        <HugeiconsIcon icon={ArrowRight02Icon} size={20} color={isActive ? "white" : "#A5B4FC"} />
                    </Pressable>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}
