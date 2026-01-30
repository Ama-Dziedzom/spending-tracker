import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Home01Icon,
    Idea01Icon,
    Wallet03Icon,
    Settings02Icon
} from '@hugeicons/core-free-icons';

export default function TabLayout() {
    return (
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
    );
}
