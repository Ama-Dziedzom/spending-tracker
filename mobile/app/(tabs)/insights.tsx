import { View, Text, ScrollView, RefreshControl } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Insights() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate a fetch
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="px-6 pt-8 pb-4">
                <Text className="text-[#1642E5] font-manrope-bold text-[28px]">Financial Insights</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#1642E5"
                    />
                }
            >
                <View className="py-20 items-center justify-center">
                    <Text className="text-[18px] font-manrope-semibold text-slate-400">Coming Soon</Text>
                    <Text className="text-[14px] font-manrope text-slate-400 text-center mt-2 px-10">
                        We're building advanced analytics and AI insights to help you save more.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
