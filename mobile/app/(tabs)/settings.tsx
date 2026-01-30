import { View, Text, Pressable, Alert, ScrollView, Switch, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Logout01Icon,
    UserIcon,
    ArrowRight01Icon,
    Mail01Icon,
    DollarCircleIcon,
    Notification03Icon,
    Database02Icon,
    Delete02Icon,
    Download02Icon,
    InformationCircleIcon,
    Calendar02Icon,
    Clock01Icon,
    Tick01Icon,
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Reusable Components
const SettingsSection = ({
    title,
    children,
    delay = 0
}: {
    title: string;
    children: React.ReactNode;
    delay?: number;
}) => (
    <Animated.View
        {...{ entering: FadeInDown.delay(delay).duration(600) } as any}
        className="mb-8"
    >
        <Text className="text-slate-400 font-manrope-bold text-[12px] uppercase tracking-[2px] ml-6 mb-3">{title}</Text>
        <View className="bg-white mx-4 rounded-[32px] overflow-hidden border border-slate-100 shadow-sm shadow-slate-200/50">
            {children}
        </View>
    </Animated.View>
);

const SettingsItem = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true,
    destructive = false,
}: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    destructive?: boolean;
}) => (
    <Pressable
        onPress={onPress}
        disabled={!onPress}
        className={cn(
            "flex-row items-center px-5 py-5 border-b border-slate-50 last:border-b-0",
            onPress ? "active:bg-slate-50" : ""
        )}
    >
        <View className={cn(
            "w-11 h-11 rounded-2xl items-center justify-center",
            destructive ? "bg-red-50" : "bg-slate-50"
        )}>
            <HugeiconsIcon icon={icon} size={22} color={destructive ? "#F43F5E" : COLORS.primary} />
        </View>
        <View className="ml-4 flex-1">
            <Text className={cn(
                "font-manrope-bold text-[16px]",
                destructive ? "text-rose-500" : "text-slate-900"
            )}>{label}</Text>
            {value && <Text className="text-slate-500 font-manrope text-[14px] mt-0.5">{value}</Text>}
        </View>
        {showChevron && onPress && (
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#CBD5E1" />
        )}
    </Pressable>
);

const SettingsToggle = ({
    icon,
    label,
    value,
    onToggle
}: {
    icon: any;
    label: string;
    value: boolean;
    onToggle: (val: boolean) => void;
}) => (
    <View className="flex-row items-center px-5 py-5 border-b border-slate-50 last:border-b-0">
        <View className="w-11 h-11 bg-slate-50 rounded-2xl items-center justify-center">
            <HugeiconsIcon icon={icon} size={22} color={COLORS.primary} />
        </View>
        <View className="ml-4 flex-1">
            <Text className="text-slate-900 font-manrope-bold text-[16px]">{label}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(val);
            }}
            trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
            thumbColor="#FFFFFF"
        />
    </View>
);

export default function Settings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Settings States
    const [notifDaily, setNotifDaily] = useState(true);
    const [notifBudget, setNotifBudget] = useState(true);
    const [timeFormat24, setTimeFormat24] = useState(true);
    const [currency, setCurrency] = useState('GHS');
    const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        setRefreshing(false);
    }, []);

    const onLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            router.replace('/login');
        }
    };

    const clearAllData = async () => {
        Alert.alert(
            'Clear All Data',
            'This action is permanent and will delete all your transactions, budgets, and wallets. Are you absolutely sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Data',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Success', 'All data has been cleared.');
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar style="dark" />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: insets.top + 20,
                    paddingBottom: insets.bottom + 40
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Content Section */}
                <View className="flex-1 pt-4">

                    {/* Profile Section */}
                    <SettingsSection title="Personal Profile" delay={100}>
                        <SettingsItem
                            icon={UserIcon}
                            label="Display Name"
                            value={user?.user_metadata?.full_name || 'Set your name'}
                            onPress={() => { }}
                        />
                        <SettingsItem
                            icon={Mail01Icon}
                            label="Email Address"
                            value={user?.email || 'Set your email'}
                        />
                    </SettingsSection>

                    {/* General Preferences */}
                    <SettingsSection title="General Preferences" delay={200}>
                        <SettingsItem
                            icon={DollarCircleIcon}
                            label="Primary Currency"
                            value={currency}
                            onPress={() => {
                                Alert.alert('Currency', 'Support for multi-currency is coming soon!');
                            }}
                        />
                        <SettingsItem
                            icon={Calendar02Icon}
                            label="Date Format"
                            value={dateFormat}
                            onPress={() => {
                                const formats = ['DD/MM/YYYY', 'MM/DD/YYYY'];
                                const next = formats[(formats.indexOf(dateFormat) + 1) % formats.length];
                                setDateFormat(next);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        />
                        <SettingsToggle
                            icon={Clock01Icon}
                            label="24-hour Time Format"
                            value={timeFormat24}
                            onToggle={setTimeFormat24}
                        />
                    </SettingsSection>

                    {/* Notifications */}
                    <SettingsSection title="Notifications" delay={300}>
                        <SettingsToggle
                            icon={Notification03Icon}
                            label="Daily Spending Summary"
                            value={notifDaily}
                            onToggle={setNotifDaily}
                        />
                        <SettingsToggle
                            icon={Notification03Icon}
                            label="Budget Threshold Alerts"
                            value={notifBudget}
                            onToggle={setNotifBudget}
                        />
                    </SettingsSection>

                    {/* Security & Data */}
                    <SettingsSection title="Security & Data" delay={400}>
                        <SettingsItem
                            icon={Download02Icon}
                            label="Export Transaction History"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                Alert.alert('Export', 'Your data export is being prepared.');
                            }}
                        />
                        <SettingsItem
                            icon={Delete02Icon}
                            label="Clear Data"
                            destructive
                            onPress={clearAllData}
                        />
                    </SettingsSection>

                    {/* Logout */}
                    <Animated.View
                        {...{ entering: FadeInDown.delay(500).duration(600) } as any}
                        className="px-4 mb-10"
                    >
                        <Pressable
                            onPress={onLogout}
                            className="flex-row items-center justify-center py-5 bg-white rounded-[32px] border border-slate-100 shadow-sm shadow-slate-200/50"
                        >
                            <HugeiconsIcon icon={Logout01Icon} size={22} color="#F43F5E" />
                            <Text className="ml-3 text-rose-500 font-manrope-bold text-[16px]">Sign Out</Text>
                        </Pressable>
                    </Animated.View>

                    <View className="items-center pb-20">
                        <View className="bg-slate-100/50 px-4 py-2 rounded-full flex-row items-center">
                            <HugeiconsIcon icon={InformationCircleIcon} size={14} color="#94A3B8" />
                            <Text className="text-slate-400 font-manrope text-[12px] ml-1.5">Version 1.0.0 (Build 42)</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
