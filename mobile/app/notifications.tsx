import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    ArrowLeft02Icon,
    Notification01Icon,
    Wallet01Icon,
    AiMagicIcon,
    Tick01Icon,
    Alert01Icon,
    Message02Icon,
    InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

const MOCK_NOTIFICATIONS = [
    {
        id: '1',
        title: 'New Transaction Detected',
        description: 'We found a new transaction from MTN MoMo. Assign it to a wallet to keep your records accurate.',
        time: '2 mins ago',
        type: 'alert',
        icon: Message02Icon,
        color: '#0F4CFF'
    },
    {
        id: '2',
        title: 'Wallet Balance Updated',
        description: 'Your Ecobank Savings balance has been updated to GHS 1,240.00.',
        time: '1 hour ago',
        type: 'info',
        icon: Wallet01Icon,
        color: '#10B981'
    },
    {
        id: '3',
        title: 'Weekly Budget Goal',
        description: 'You have spent 65% of your weekly entertainment budget. You have GHS 45.00 left.',
        time: '5 hours ago',
        type: 'warning',
        icon: Alert01Icon,
        color: '#F59E0B'
    },
    {
        id: '4',
        title: 'Smart Spending Tip',
        description: 'You spend an average of GHS 120 on weekends. Try setting aside GHS 100 on Fridays.',
        time: 'Yesterday',
        type: 'ai',
        icon: AiMagicIcon,
        color: '#8B5CF6'
    },
    {
        id: '5',
        title: 'Account Secured',
        description: 'Your security settings were updated successfully. Your account is protected.',
        time: '2 days ago',
        type: 'success',
        icon: Tick01Icon,
        color: '#0EA5E9'
    }
];

export default function NotificationsPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View className="flex-1 bg-[#0F172A]">
            <StatusBar style="light" />
            <LinearGradient
                colors={['#0F172A', '#1E1B4B', '#312E81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View className="flex-1" style={{ paddingTop: insets.top }}>
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 }}>
                        {/* Header Nav */}
                        <View className="flex-row items-center justify-between mb-8">
                            <Pressable
                                onPress={() => router.back()}
                                className="w-11 h-11 bg-white/10 rounded-full items-center justify-center border border-white/10"
                            >
                                <HugeiconsIcon icon={ArrowLeft02Icon} size={22} color="white" />
                            </Pressable>
                            <Text className="text-white font-manrope-bold text-[18px]">Notifications</Text>
                            <Pressable className="w-11 h-11 bg-white/10 rounded-full items-center justify-center border border-white/10">
                                <HugeiconsIcon icon={Tick01Icon} size={18} color="white" />
                            </Pressable>
                        </View>

                        {/* Subheader */}
                        <View className="mb-6">
                            <Text className="text-white/60 font-manrope-medium text-[14px] uppercase tracking-[2px] mb-1">Stay updated</Text>
                            <Text className="text-white font-manrope-bold text-[36px]">Activity Feed</Text>
                        </View>
                    </View>

                    {/* Content Section */}
                    <View className="flex-1 bg-[#F8FAFC] rounded-t-[48px] px-6 pt-10" style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -15 },
                        shadowOpacity: 0.1,
                        shadowRadius: 20,
                        elevation: 20,
                        minHeight: Dimensions.get('window').height - 150
                    }}>
                        {MOCK_NOTIFICATIONS.map((notification, index) => (
                            <Animated.View
                                key={notification.id}
                                {...{ entering: FadeInDown.delay(index * 100).duration(600) } as any}
                                className="bg-white rounded-[32px] p-6 mb-5 border border-slate-100 shadow-sm shadow-slate-200/50"
                            >
                                <View className="flex-row items-start gap-5">
                                    <View
                                        className="w-14 h-14 rounded-[20px] items-center justify-center"
                                        style={{ backgroundColor: `${notification.color}10` }}
                                    >
                                        <HugeiconsIcon icon={notification.icon} size={28} color={notification.color} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row justify-between items-start mb-1.5">
                                            <Text className="text-slate-900 font-manrope-bold text-[17px] flex-1 mr-2" numberOfLines={1}>
                                                {notification.title}
                                            </Text>
                                            <Text className="text-slate-400 font-manrope-medium text-[12px] mt-1">
                                                {notification.time}
                                            </Text>
                                        </View>
                                        <Text className="text-slate-500 font-manrope text-[14px] leading-[22px]">
                                            {notification.description}
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))}

                        <View style={{ height: insets.bottom + 40 }} />
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({});
