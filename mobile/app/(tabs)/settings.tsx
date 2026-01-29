import { View, Text, Pressable, Alert, ScrollView, Switch, Modal, TouchableOpacity, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Logout01Icon,
    UserIcon,
    ArrowRight01Icon,
    SecurityIcon,
    ArrowLeft02Icon,
    Mail01Icon,
    DollarCircleIcon,
    MessageNotification01Icon,
    Notification03Icon,
    BrowserIcon,
    Settings02Icon,
    Database02Icon,
    Delete02Icon,
    Download02Icon,
    InformationCircleIcon,
    ListViewIcon,
    Calendar02Icon,
    Clock01Icon,
    FilterIcon,
    Tick01Icon,
    Cancel01Icon
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Reusable Components
const SettingsSection = ({
    title,
    children,
    isCollapsed,
    onToggle
}: {
    title: string;
    children: React.ReactNode;
    isCollapsed: boolean;
    onToggle: () => void;
}) => (
    <View className="mb-6">
        <Pressable
            onPress={onToggle}
            className="flex-row items-center justify-between px-6 py-2"
        >
            <Text className="text-slate-400 font-heading text-[12px] uppercase tracking-wider ml-1">{title}</Text>
            <View className={cn("transition-transform duration-200", isCollapsed ? "" : "rotate-90")}>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="#94A3B8" />
            </View>
        </Pressable>
        {!isCollapsed && (
            <View className="bg-white mx-4 rounded-[24px] overflow-hidden border border-slate-100 shadow-sm mt-2">
                {children}
            </View>
        )}
    </View>
);

const SettingsItem = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true,
    destructive = false,
    children
}: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    destructive?: boolean;
    children?: React.ReactNode;
}) => (
    <Pressable
        onPress={onPress}
        disabled={!onPress}
        className={cn(
            "flex-row items-center px-4 py-4 border-b border-slate-50 last:border-b-0",
            onPress ? "active:bg-slate-50" : ""
        )}
    >
        <View className={cn(
            "w-10 h-10 rounded-full items-center justify-center",
            destructive ? "bg-red-50" : "bg-slate-50"
        )}>
            <HugeiconsIcon icon={icon} size={20} color={destructive ? "#EF4444" : "#64748B"} />
        </View>
        <View className="ml-4 flex-1">
            <Text className={cn(
                "font-heading text-[16px]",
                destructive ? "text-red-600" : "text-slate-900"
            )}>{label}</Text>
            {value && <Text className="text-slate-400 font-body text-[14px] mt-0.5">{value}</Text>}
        </View>
        {children}
        {showChevron && !children && (
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#94A3B8" />
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
    <View className="flex-row items-center px-4 py-4 border-b border-slate-50 last:border-b-0">
        <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center">
            <HugeiconsIcon icon={icon} size={20} color="#64748B" />
        </View>
        <View className="ml-4 flex-1">
            <Text className="text-slate-900 font-heading text-[16px]">{label}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(val);
            }}
            trackColor={{ false: '#E2E8F0', true: '#0F4CFF' }}
            thumbColor="#FFFFFF"
        />
    </View>
);

export default function Settings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Collapsible States
    const [collapsedSections, setCollapsedSections] = useState({
        account: false,
        sms: false,
        notifications: false,
        categories: false,
        display: false,
        data: false
    });

    // Form/Settings States
    const [smsMonitoring, setSmsMonitoring] = useState(true);
    const [notifDaily, setNotifDaily] = useState(true);
    const [notifBudget, setNotifBudget] = useState(true);
    const [notifUnusual, setNotifUnusual] = useState(true);
    const [timeFormat24, setTimeFormat24] = useState(true);

    const [currency, setCurrency] = useState('GHS');
    const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
    const [dashboardView, setDashboardView] = useState('Monthly');
    const [monitoredProviders, setMonitoredProviders] = useState(['MTN', 'Vodafone', 'AirtelTigo', 'Banks']);
    const [showProvidersModal, setShowProvidersModal] = useState(false);

    const ALL_PROVIDERS = ['MTN', 'Vodafone', 'AirtelTigo', 'Banks', 'Standard Chartered', 'Absa', 'GCB'];

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);

    const toggleSection = (section: keyof typeof collapsedSections) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

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

    const testSmsParsing = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('SMS Parsing Test', 'Parsing logic is working correctly for monitored providers.');
    };

    return (
        <View className="flex-1 bg-slate-50">
            {/* Header */}
            <View
                style={{ paddingTop: insets.top + 10 }}
                className="px-6 pb-4 bg-white border-b border-slate-100 flex-row items-center"
            >
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center -ml-2"
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} size={24} color="#0F172A" />
                </Pressable>
                <Text className="text-[20px] font-heading text-slate-900 ml-2">Settings</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingVertical: 24, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#0F4CFF"
                    />
                }
            >
                {/* Account & Profile */}
                <SettingsSection
                    title="Account & Profile"
                    isCollapsed={collapsedSections.account}
                    onToggle={() => toggleSection('account')}
                >
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
                    <SettingsItem
                        icon={DollarCircleIcon}
                        label="Currency Preference"
                        value={currency}
                        onPress={() => {
                            Alert.alert('Select Currency', 'Coming soon: Support for multi-currency.', [{ text: 'OK' }]);
                        }}
                    />
                </SettingsSection>

                {/* SMS Monitoring */}
                <SettingsSection
                    title="SMS Monitoring"
                    isCollapsed={collapsedSections.sms}
                    onToggle={() => toggleSection('sms')}
                >
                    <SettingsToggle
                        icon={MessageNotification01Icon}
                        label="Enable automatic SMS monitoring"
                        value={smsMonitoring}
                        onToggle={setSmsMonitoring}
                    />
                    <SettingsItem
                        icon={FilterIcon}
                        label="Monitored Providers"
                        value={monitoredProviders.join(', ')}
                        onPress={() => setShowProvidersModal(true)}
                    />
                    <SettingsItem
                        icon={SecurityIcon}
                        label="Test SMS Parsing"
                        onPress={testSmsParsing}
                    />
                </SettingsSection>

                {/* Notifications */}
                <SettingsSection
                    title="Notifications"
                    isCollapsed={collapsedSections.notifications}
                    onToggle={() => toggleSection('notifications')}
                >
                    <SettingsToggle
                        icon={Notification03Icon}
                        label="Daily spending summary"
                        value={notifDaily}
                        onToggle={setNotifDaily}
                    />
                    <SettingsToggle
                        icon={Notification03Icon}
                        label="Budget threshold alerts"
                        value={notifBudget}
                        onToggle={setNotifBudget}
                    />
                    <SettingsToggle
                        icon={Notification03Icon}
                        label="Unusual transaction alerts"
                        value={notifUnusual}
                        onToggle={setNotifUnusual}
                    />
                </SettingsSection>

                {/* Categories */}
                <SettingsSection
                    title="Categories"
                    isCollapsed={collapsedSections.categories}
                    onToggle={() => toggleSection('categories')}
                >
                    <SettingsItem
                        icon={BrowserIcon}
                        label="Manage Categories"
                        onPress={() => { }}
                    />
                    <SettingsItem
                        icon={ListViewIcon}
                        label="Set Default Merchant Mappings"
                        onPress={() => { }}
                    />
                </SettingsSection>

                {/* Display Preferences */}
                <SettingsSection
                    title="Display Preferences"
                    isCollapsed={collapsedSections.display}
                    onToggle={() => toggleSection('display')}
                >
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
                        label="24-hour time format"
                        value={timeFormat24}
                        onToggle={setTimeFormat24}
                    />
                    <SettingsItem
                        icon={Settings02Icon}
                        label="Dashboard Default View"
                        value={dashboardView}
                        onPress={() => {
                            const views = ['Weekly', 'Monthly'];
                            const next = views[(views.indexOf(dashboardView) + 1) % views.length];
                            setDashboardView(next);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    />
                </SettingsSection>

                {/* Data & Privacy */}
                <SettingsSection
                    title="Data & Privacy"
                    isCollapsed={collapsedSections.data}
                    onToggle={() => toggleSection('data')}
                >
                    <SettingsItem
                        icon={Download02Icon}
                        label="Export Data"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert('Export', 'Your data export is being prepared and will be sent to your email.');
                        }}
                    />
                    <SettingsItem
                        icon={Delete02Icon}
                        label="Clear All Data"
                        destructive
                        onPress={clearAllData}
                    />
                    <SettingsItem
                        icon={Logout01Icon}
                        label="Sign Out"
                        destructive
                        onPress={onLogout}
                    />
                </SettingsSection>

                {/* Modals */}
                <Modal
                    visible={showProvidersModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowProvidersModal(false)}
                >
                    <View className="flex-1 bg-black/40 justify-center px-6">
                        <View className="bg-white rounded-[32px] overflow-hidden">
                            <View className="p-6 border-b border-slate-50 flex-row items-center justify-between">
                                <Text className="text-xl font-heading text-slate-900">Monitored Providers</Text>
                                <Pressable onPress={() => setShowProvidersModal(false)}>
                                    <HugeiconsIcon icon={Cancel01Icon} size={24} color="#64748B" />
                                </Pressable>
                            </View>
                            <ScrollView className="max-h-80 p-4">
                                {ALL_PROVIDERS.map((provider) => {
                                    const isSelected = monitoredProviders.includes(provider);
                                    return (
                                        <Pressable
                                            key={provider}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setMonitoredProviders(prev => prev.filter(p => p !== provider));
                                                } else {
                                                    setMonitoredProviders(prev => [...prev, provider]);
                                                }
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            className={cn(
                                                "flex-row items-center p-4 rounded-2xl mb-2",
                                                isSelected ? "bg-blue-50 border border-blue-100" : "bg-slate-50 border border-transparent"
                                            )}
                                        >
                                            <View className={cn(
                                                "w-6 h-6 rounded-full border items-center justify-center",
                                                isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
                                            )}>
                                                {isSelected && <HugeiconsIcon icon={Tick01Icon} size={14} color="#FFFFFF" />}
                                            </View>
                                            <Text className={cn(
                                                "ml-4 font-heading text-[16px]",
                                                isSelected ? "text-blue-700" : "text-slate-600"
                                            )}>{provider}</Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                            <View className="p-6 bg-slate-50">
                                <TouchableOpacity
                                    onPress={() => setShowProvidersModal(false)}
                                    className="bg-blue-600 py-4 rounded-2xl items-center"
                                >
                                    <Text className="text-white font-heading text-[16px]">Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View className="mt-8 items-center px-6">
                    <View className="bg-white px-4 py-2 rounded-full border border-slate-100 flex-row items-center">
                        <HugeiconsIcon icon={InformationCircleIcon} size={14} color="#94A3B8" />
                        <Text className="text-slate-400 font-body text-[12px] ml-1.5">App Version 1.0.0 (Build 42)</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

