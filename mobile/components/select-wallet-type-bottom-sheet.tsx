import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    BankIcon,
    Wallet01Icon,
    Wallet03Icon,
    Tick02Icon,
    ArrowRight02Icon,
} from '@hugeicons/core-free-icons';

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onSelect: (types: string[]) => void;
}

const WALLET_TYPES = [
    {
        id: 'momo',
        name: 'Mobile Money',
        description: 'MTN, Telecel, AT',
        icon: Wallet03Icon,
    },
    {
        id: 'bank',
        name: 'Bank Account',
        description: 'Commercial banks',
        icon: BankIcon,
    },
    {
        id: 'cash',
        name: 'Cash Wallet',
        description: 'Physical cash',
        icon: Wallet01Icon,
    }
];

export function SelectWalletTypeBottomSheet({ isVisible, onClose, onSelect }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['50%', '80%'], []);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const toggleType = (id: string) => {
        if (selectedTypes.includes(id)) {
            setSelectedTypes(selectedTypes.filter(t => t !== id));
        } else {
            setSelectedTypes([...selectedTypes, id]);
        }
    };

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
            setSelectedTypes([]);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
            handleIndicatorStyle={{ backgroundColor: '#EDEDED', width: 60, height: 4 }}
        >
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 40 }}>
                <View className="mt-4 mb-8">
                    <Text className="text-[24px] font-manrope-bold text-[#1642E5]">Add Wallet</Text>
                    <Text className="text-[16px] font-manrope text-[#7C7D80]">What kind of wallet would you like to add?</Text>
                </View>

                <View className="gap-4 pb-4">
                    {WALLET_TYPES.map((type) => {
                        const isSelected = selectedTypes.includes(type.id);
                        return (
                            <Pressable
                                key={type.id}
                                onPress={() => toggleType(type.id)}
                                className={`flex-row items-center p-4 rounded-[15px] border-[1.5px] h-[81px] ${isSelected ? 'border-[#1642E5] bg-white' : 'border-[#F1F1F1] bg-white'
                                    }`}
                                style={isSelected ? {
                                    shadowColor: '#1642E5',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 10,
                                    elevation: 2
                                } : {}}
                            >
                                {/* Checkbox */}
                                <View className={`w-6 h-6 rounded-md border-[1.5px] items-center justify-center mr-4 ${isSelected ? 'border-[#1642E5] bg-[#1642E5]' : 'border-[#CBD5E1] bg-white'
                                    }`}>
                                    {isSelected && <HugeiconsIcon icon={Tick02Icon} size={16} color="white" />}
                                </View>

                                {/* Icon Container */}
                                <View
                                    className="w-12 h-12 rounded-full bg-[#ECF0FF] items-center justify-center mr-4"
                                    style={{ overflow: 'visible' }}
                                >
                                    <HugeiconsIcon icon={type.icon} size={22} color="#1642E5" />
                                </View>

                                {/* Label */}
                                <View className="flex-1">
                                    <Text className="text-[18px] font-manrope-bold text-[#5B5B5B]">
                                        {type.name}
                                    </Text>
                                    <Text className="text-[14px] font-manrope text-[#7C7D80]">
                                        {type.description}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Continue Button */}
                <View className="mt-auto">
                    <Pressable
                        onPress={() => onSelect(selectedTypes)}
                        disabled={selectedTypes.length === 0}
                        className={`bg-[#1642E5] w-full h-[56px] rounded-[20px] flex-row items-center justify-center gap-2 ${selectedTypes.length === 0 ? 'opacity-50' : ''}`}
                        style={selectedTypes.length > 0 ? {
                            shadowColor: '#1642E5',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 10,
                            elevation: 4
                        } : {}}
                    >
                        <Text className="text-white text-[20px] font-manrope-semibold">
                            Continue
                        </Text>
                        <HugeiconsIcon icon={ArrowRight02Icon} size={20} color="white" />
                    </Pressable>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}
