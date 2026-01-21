import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MessageSquare, Share2, MousePointer2, CheckCircle2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export default function OnboardingQuickStart() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleOpenMessages = async () => {
        const url = 'sms:';
        if (await Linking.canOpenURL(url)) {
            await Linking.openURL(url);
        } else {
            // Fallback for simulators or devices without SMS
            alert("Messages app couldn't be opened. Please open it manually.");
        }
    };

    const steps = [
        { icon: MessageSquare, text: "Open Messages app" },
        { icon: MousePointer2, text: "Find a bank or MoMo transaction SMS" },
        { icon: MousePointer2, text: "Long-press the message" },
        { icon: Share2, text: "Tap Share" },
        { icon: CheckCircle2, text: "Select 'Log Transactions'" },
    ];

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center px-6 mb-4">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100">
                    <ChevronLeft size={24} color="#0F4CFF" />
                </Pressable>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View className="mt-8 mb-10">
                    <Text className="text-[38px] font-heading text-[#0F4CFF] leading-[46px] tracking-tight">
                        Log Your First Transaction
                    </Text>
                </View>

                {/* Instructions */}
                <View className="bg-[#F8FAFF] rounded-[48px] p-8 mb-10 border-[1.5px] border-[#DEE6FF]">
                    <View className="gap-8">
                        {steps.map((step, index) => (
                            <View key={index} className="flex-row items-center gap-6">
                                <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
                                    <step.icon size={20} color="#0F4CFF" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[18px] font-numbers text-slate-800">
                                        {index + 1}. {step.text}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Visual Placeholder */}
                <View className="h-[200px] bg-slate-100 rounded-[40px] items-center justify-center mb-10 overflow-hidden">
                    <Text className="text-slate-400 font-ui text-center px-10">
                        [Animated GIF or Illustration showing iOS share sheet flow]
                    </Text>
                </View>

                {/* Actions */}
                <View className="gap-6">
                    <Pressable
                        onPress={handleOpenMessages}
                        className="w-full h-[64px] rounded-[32px] bg-[#1A51FF] items-center justify-center shadow-xl shadow-blue-500/20"
                    >
                        <Text className="text-white text-[20px] font-heading">Open Messages App</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => router.replace('/(tabs)')}
                        className="w-full py-2 items-center"
                    >
                        <Text className="text-[18px] font-heading text-[#0F4CFF]">I'll Do This Later</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
