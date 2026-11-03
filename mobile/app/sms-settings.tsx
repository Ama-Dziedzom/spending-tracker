import { View, Text, Pressable, ScrollView, Switch, Alert, Platform, PermissionsAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowLeft01Icon,
    Mail01Icon,
    Notification03Icon,
    InformationCircleIcon,
    HelpCircleIcon,
    CircleIcon
} from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase, getSession } from '../lib/supabase';
import { syncSessionToAppGroup } from '../lib/shareSync';

function formatAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function SmsSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
    const [lastSmsAt, setLastSmsAt] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const val = await AsyncStorage.getItem('sms_auto_logging_enabled');
            setSmsEnabled(val === 'true');

            // Real status: signed in (the share sheet needs this) + last SMS logged
            const session = await getSession();
            setIsSignedIn(!!session);
            if (session) {
                const { data } = await supabase
                    .from('transactions')
                    .select('created_at')
                    .not('raw_sms', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1);
                setLastSmsAt(data?.[0]?.created_at ?? null);
            }

            if (Platform.OS === 'android') {
                const checkPerm = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
                );
                setHasPermission(checkPerm);
            }
        };
        loadSettings();
    }, []);

    const requestSmsPermission = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return false;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                {
                    title: 'SMS Permission Needed',
                    message: 'LogIt needs permission to read incoming transaction SMS messages so it can parse and log them automatically.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
            setHasPermission(isGranted);
            return isGranted;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };

    const handleToggleAutoLogging = async (newValue: boolean) => {
        if (newValue) {
            // Turning ON
            if (Platform.OS === 'android') {
                const permitted = await requestSmsPermission();
                if (!permitted) {
                    Alert.alert(
                        'Permission Required',
                        'To enable auto-logging, please grant SMS permissions so LogIt can listen for transaction messages.'
                    );
                    return;
                }
            }
            await AsyncStorage.setItem('sms_auto_logging_enabled', 'true');
            setSmsEnabled(true);

            // Re-sync session parameters
            const session = await getSession();
            if (session) {
                syncSessionToAppGroup(session, null);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            // Turning OFF
            await AsyncStorage.setItem('sms_auto_logging_enabled', 'false');
            setSmsEnabled(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    return (
        <View style={{ paddingTop: insets.top }} className="flex-1 bg-slate-50">
            <StatusBar style="dark" />
            
            {/* Custom Header */}
            <View className="px-4 flex-row items-center justify-between border-b border-slate-100 pb-4 bg-white shadow-sm shadow-slate-200/20">
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 active:bg-slate-100"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color="#1E293B" />
                </Pressable>
                <Text className="text-slate-900 font-manrope-bold text-[18px]">SMS Integration</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                
                {Platform.OS === 'android' ? (
                    <Animated.View {...{ entering: FadeInDown.duration(600) } as any} className="mb-6">
                        {/* Auto-Logging Switch Card */}
                        <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center flex-1 pr-4">
                                    <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
                                        <HugeiconsIcon icon={Mail01Icon} size={24} color={COLORS.primary} />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-slate-900 font-manrope-bold text-[18px]">Auto-Log SMS Transactions</Text>
                                        <Text className="text-slate-400 font-manrope text-[12px] mt-0.5">Logs in background instantly</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={smsEnabled}
                                    onValueChange={handleToggleAutoLogging}
                                    trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                            
                            <View className="border-t border-slate-50 pt-4 mt-2">
                                <View className="flex-row items-center">
                                    <View className={`w-3 h-3 rounded-full ${smsEnabled && hasPermission ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <Text className="text-slate-500 font-manrope-semibold text-[14px] ml-2.5">
                                        Status: {smsEnabled && hasPermission ? 'Background Service Running' : 'Auto-Logging Inactive'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View {...{ entering: FadeInDown.duration(600) } as any} className="mb-6">
                        {/* iOS Share Extension Card */}
                        <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                            <View className="flex-row items-center mb-4">
                                <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center">
                                    <HugeiconsIcon icon={Mail01Icon} size={24} color={COLORS.primary} />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-slate-900 font-manrope-bold text-[18px]">iOS Share Extension</Text>
                                    <Text className={`${isSignedIn === false ? 'text-rose-500' : 'text-emerald-600'} font-manrope-semibold text-[12px] mt-0.5`}>
                                        {isSignedIn === null
                                            ? 'Checking…'
                                            : !isSignedIn
                                                ? 'Sign in to share messages'
                                                : lastSmsAt
                                                    ? `Ready · last SMS logged ${formatAgo(lastSmsAt)}`
                                                    : 'Ready · no messages shared yet'}
                                    </Text>
                                </View>
                            </View>
                            
                            <Text className="text-slate-500 font-manrope text-[14px] leading-6 border-t border-slate-50 pt-4">
                                Apple doesn’t let apps read your messages, so on iPhone you share them with LogIt instead. It takes a couple of taps, and LogIt does the rest.
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Instructions Section */}
                <Animated.View {...{ entering: FadeInDown.delay(100).duration(600) } as any} className="mb-6">
                    <Text className="text-slate-400 font-manrope-bold text-[12px] uppercase tracking-[2px] ml-4 mb-3">
                        {Platform.OS === 'ios' ? 'How to log via iOS Share Sheet' : 'How it works on Android'}
                    </Text>
                    
                    <View className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
                        {Platform.OS === 'ios' ? (
                            <View className="space-y-6">
                                <View className="flex-row items-start">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">1</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        In Messages, press and hold a Mobile Money or bank SMS (MTN MoMo, Telecel Cash, AT Money, your bank).
                                    </Text>
                                </View>
                                
                                <View className="flex-row items-start mt-4">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">2</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        Tap <Text className="font-manrope-bold text-slate-900">Share</Text> and choose <Text className="font-manrope-bold text-slate-900">LogIt</Text>.
                                    </Text>
                                </View>

                                <View className="flex-row items-start mt-4">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">3</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        Check the preview and tap <Text className="font-manrope-bold text-slate-900">Save</Text>. LogIt puts it in the right wallet and updates your balance.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View className="space-y-6">
                                <View className="flex-row items-start">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">1</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        Once enabled, LogIt starts a lightweight background listener that runs automatically on your device.
                                    </Text>
                                </View>
                                
                                <View className="flex-row items-start mt-4">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">2</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        Whenever a bank or Mobile Money transaction SMS arrives, the background listener instantly catches it.
                                    </Text>
                                </View>

                                <View className="flex-row items-start mt-4">
                                    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mt-0.5 border border-slate-100">
                                        <Text className="text-slate-600 font-manrope-bold text-[14px]">3</Text>
                                    </View>
                                    <Text className="text-slate-600 font-manrope text-[14px] ml-4 flex-1 leading-6">
                                        It’s logged to the right wallet straight away, with a short note like “Spent GHS 10.00 on MTN Airtime · MTN MoMo”. Anything LogIt can’t read waits for you in Needs review.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
                
                {/* Security Card */}
                <Animated.View {...{ entering: FadeInDown.delay(200).duration(600) } as any}>
                    <View className="bg-indigo-50/50 rounded-[32px] p-6 border border-indigo-50 flex-row items-start">
                        <HugeiconsIcon icon={InformationCircleIcon} size={22} color={COLORS.primary} className="mt-0.5" />
                        <View className="ml-4 flex-1">
                            <Text className="text-slate-900 font-manrope-bold text-[16px]">Privacy & Bank-Grade Security</Text>
                            <Text className="text-slate-500 font-manrope text-[13px] leading-5 mt-1.5">
                                LogIt only listens to and processes local SMS messages that match certified bank and Mobile Money format keys. None of your private chats or personal messages are ever read or transmitted.
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}
