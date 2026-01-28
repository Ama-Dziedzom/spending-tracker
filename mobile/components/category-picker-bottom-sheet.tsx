import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { CATEGORIES, Category } from '../lib/categories';

interface Props {
    isVisible: boolean;
    currentCategoryId?: string;
    onClose: () => void;
    onSelect: (categoryId: string) => void;
}

export function CategoryPickerBottomSheet({ isVisible, currentCategoryId, onClose, onSelect }: Props) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [lastVisible, setLastVisible] = useState(false);
    const [selectedId, setSelectedId] = useState<string | undefined>(currentCategoryId);
    const snapPoints = useMemo(() => ['70%'], []);

    useEffect(() => {
        if (isVisible && !lastVisible) {
            bottomSheetRef.current?.snapToIndex(0);
            setSelectedId(currentCategoryId);
        } else if (!isVisible && lastVisible) {
            bottomSheetRef.current?.close();
        }
        setLastVisible(isVisible);
    }, [isVisible, lastVisible, currentCategoryId]);

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
                opacity={0.5}
            />
        ),
        []
    );

    const handleCategorySelect = (category: Category) => {
        setSelectedId(category.id);
        // Small delay to show selection feedback
        setTimeout(() => {
            onSelect(category.id);
            onClose();
        }, 150);
    };

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
            <BottomSheetView style={{ flex: 1, paddingHorizontal: 24 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-[24px] font-manrope-bold text-slate-900">Select Category</Text>
                    <Text className="text-[14px] font-manrope text-slate-500 mt-1">
                        Choose a category for this transaction
                    </Text>
                </View>

                {/* Category Grid */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <View className="flex-row flex-wrap justify-between">
                        {CATEGORIES.map((category) => {
                            const isSelected = selectedId === category.id;
                            return (
                                <Pressable
                                    key={category.id}
                                    onPress={() => handleCategorySelect(category)}
                                    className={`w-[48%] mb-4 p-4 rounded-[16px] border-[2px] ${isSelected
                                            ? 'border-[#1642E5] bg-[#F1F4FF]'
                                            : 'border-[#F1F1F1] bg-white'
                                        }`}
                                    style={{
                                        shadowColor: isSelected ? '#1642E5' : '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isSelected ? 0.1 : 0.02,
                                        shadowRadius: 8,
                                        elevation: isSelected ? 3 : 1,
                                    }}
                                >
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View
                                            className="w-10 h-10 rounded-full items-center justify-center"
                                            style={{ backgroundColor: `${category.color}15` }}
                                        >
                                            <HugeiconsIcon
                                                icon={category.icon}
                                                size={20}
                                                color={category.color}
                                            />
                                        </View>
                                        {isSelected && (
                                            <View className="w-6 h-6 rounded-full bg-[#1642E5] items-center justify-center">
                                                <HugeiconsIcon icon={Tick02Icon} size={14} color="white" />
                                            </View>
                                        )}
                                    </View>
                                    <Text
                                        className={`text-[14px] font-manrope-semibold ${isSelected ? 'text-[#1642E5]' : 'text-slate-700'
                                            }`}
                                        numberOfLines={1}
                                    >
                                        {category.name}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            </BottomSheetView>
        </BottomSheet>
    );
}
