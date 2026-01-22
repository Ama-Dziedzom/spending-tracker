import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Message02Icon, Setting07Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

export default function OnboardingChoice() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedMethod, setSelectedMethod] = React.useState<'quick' | 'full'>('quick');

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Illustration Section */}
                <View className="items-center mt-6 mb-4">
                    <Image
                        source={require('../assets/images/onboarding-start.png')}
                        style={{ width: '100%', height: 200 }}
                        resizeMode="contain"
                    />
                </View>

                {/* Header Section */}
                <View className="mb-10 items-center">
                    <Text className="text-[32px] font-heading text-[#0F4CFF] text-center leading-[40px] tracking-tight">
                        Where do you want to start?
                    </Text>
                </View>

                {/* Options */}
                <View className="gap-5">
                    {/* Quick Start Option */}
                    <Pressable
                        onPress={() => {
                            setSelectedMethod('quick');
                            router.push('/onboarding-quick-start');
                        }}
                        className={`w-full rounded-[24px] border-[1.5px] p-6 ${selectedMethod === 'quick' ? 'border-[#0F4CFF] bg-white' : 'border-[#F1F5F9] bg-white'}`}
                    >
                        <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${selectedMethod === 'quick' ? 'bg-[#EBF0FF]' : 'bg-[#F8FAFC]'}`}>
                            <HugeiconsIcon icon={Message02Icon} size={24} color={selectedMethod === 'quick' ? '#0F4CFF' : '#64748B'} />
                        </View>

                        <Text className={`text-xl font-heading mb-2 ${selectedMethod === 'quick' ? 'text-slate-900' : 'text-slate-600'}`}>Quick Start</Text>
                        <Text className="text-[15px] font-body text-slate-400 leading-[22px] mb-6">
                            Share a transaction SMS to begin tracking instantly. No manual entry required.
                        </Text>

                        <View className="flex-row items-center gap-2">
                            <Text className="text-[#0F4CFF] font-heading text-[18px]">Try this</Text>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#0F4CFF" />
                        </View>
                    </Pressable>

                    {/* Full Setup Option */}
                    <Pressable
                        onPress={() => {
                            setSelectedMethod('full');
                            router.push('/onboarding-link-wallet');
                        }}
                        className={`w-full rounded-[24px] border-[1.5px] p-6 ${selectedMethod === 'full' ? 'border-[#0F4CFF] bg-white' : 'border-[#F1F5F9] bg-white'}`}
                    >
                        <View className={`w-12 h-12 rounded-full items-center justify-center mb-4 ${selectedMethod === 'full' ? 'bg-[#EBF0FF]' : 'bg-[#F8FAFC]'}`}>
                            <HugeiconsIcon icon={Setting07Icon} size={24} color={selectedMethod === 'full' ? '#0F4CFF' : '#64748B'} />
                        </View>

                        <Text className={`text-xl font-heading mb-2 ${selectedMethod === 'full' ? 'text-slate-900' : 'text-slate-600'}`}>Full Setup</Text>
                        <Text className="text-[15px] font-body text-slate-400 leading-[22px] mb-4">
                            Connect your accounts and customize your experience from the ground up.
                        </Text>
                    </Pressable>
                </View>

                {/* Footer Section */}
                <View className="mt-12 items-center">
                    <Pressable onPress={() => router.push('/(tabs)')}>
                        <Text className="text-[18px] font-heading text-[#0F4CFF]">Skip for now</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}


