import React, { useState, createContext, useContext, useRef, useMemo, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform, Pressable } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Home01Icon,
    Idea01Icon,
    Wallet03Icon,
    Settings02Icon,
    Add01Icon,
} from '@hugeicons/core-free-icons';
import { AddTransactionBottomSheet } from '../../components/add-transaction-bottom-sheet';

// Context to share the add transaction trigger and refresh function
interface TabContextType {
    openAddTransaction: () => void;
    refreshDashboard: () => void;
    setRefreshDashboard: (fn: () => void) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export const useTabContext = () => {
    return useContext(TabContext);
};

export default function TabLayout() {
    const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
    const refreshFnRef = useRef<() => void>(() => { });

    const contextValue: TabContextType = useMemo(() => ({
        openAddTransaction: () => setIsAddSheetVisible(true),
        refreshDashboard: () => refreshFnRef.current(),
        setRefreshDashboard: (fn) => { refreshFnRef.current = fn; },
    }), []);

    return (
        <TabContext.Provider value={contextValue}>
            <View style={{ flex: 1 }}>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            height: Platform.OS === 'ios' ? 98 : 88,
                            paddingTop: 12,
                            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                            backgroundColor: '#FFFFFF',
                            borderTopWidth: 0,
                            elevation: 10,
                            shadowColor: '#000000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.02,
                            shadowRadius: 10,
                        },
                        tabBarActiveTintColor: '#0F4CFF',
                        tabBarInactiveTintColor: '#ADAEAF',
                        tabBarLabelStyle: {
                            fontFamily: 'Manrope-Medium',
                            fontSize: 14,
                        },
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: 'Home',
                            tabBarIcon: ({ color }) => (
                                <HugeiconsIcon icon={Home01Icon} size={24} color={color} />
                            ),
                            tabBarLabel: ({ color, focused }) => (
                                <View className="items-center">
                                    <Text style={{ color, fontFamily: focused ? 'Manrope-Bold' : 'Manrope-Medium', fontSize: 14 }}>Home</Text>
                                    {focused && <View className="w-1.5 h-1.5 rounded-full bg-[#0F4CFF] mt-1" />}
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="insights"
                        options={{
                            title: 'Insights',
                            tabBarIcon: ({ color }) => (
                                <HugeiconsIcon icon={Idea01Icon} size={24} color={color} />
                            ),
                            tabBarLabel: ({ color, focused }) => (
                                <View className="items-center">
                                    <Text style={{ color, fontFamily: focused ? 'Manrope-SemiBold' : 'Manrope-Medium', fontSize: 14 }}>Insights</Text>
                                    {focused && <View className="w-1.5 h-1.5 rounded-full bg-[#0F4CFF] mt-1" />}
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="wallets"
                        options={{
                            title: 'Wallets',
                            tabBarIcon: ({ color }) => (
                                <HugeiconsIcon icon={Wallet03Icon} size={24} color={color} />
                            ),
                            tabBarLabel: ({ color, focused }) => (
                                <View className="items-center">
                                    <Text style={{ color, fontFamily: focused ? 'Manrope-SemiBold' : 'Manrope-Medium', fontSize: 14 }}>Wallets</Text>
                                    {focused && <View className="w-1.5 h-1.5 rounded-full bg-[#0F4CFF] mt-1" />}
                                </View>
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="settings"
                        options={{
                            title: 'Settings',
                            tabBarIcon: ({ color }) => (
                                <HugeiconsIcon icon={Settings02Icon} size={24} color={color} />
                            ),
                            tabBarLabel: ({ color, focused }) => (
                                <View className="items-center">
                                    <Text style={{ color, fontFamily: focused ? 'Manrope-SemiBold' : 'Manrope-Medium', fontSize: 14 }}>Settings</Text>
                                    {focused && <View className="w-1.5 h-1.5 rounded-full bg-[#0F4CFF] mt-1" />}
                                </View>
                            ),
                        }}
                    />
                </Tabs>

                {/* Floating Add Button */}
                <Pressable
                    onPress={() => setIsAddSheetVisible(true)}
                    style={{
                        position: 'absolute',
                        bottom: Platform.OS === 'ios' ? 70 : 60,
                        alignSelf: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#0F4CFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#0F4CFF',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.35,
                        shadowRadius: 16,
                        elevation: 12,
                    }}
                >
                    <HugeiconsIcon icon={Add01Icon} size={28} color="white" />
                </Pressable>

                {/* Add Transaction Bottom Sheet */}
                <AddTransactionBottomSheet
                    isVisible={isAddSheetVisible}
                    onClose={() => setIsAddSheetVisible(false)}
                    onSuccess={() => refreshFnRef.current()}
                />
            </View>
        </TabContext.Provider>
    );
}
