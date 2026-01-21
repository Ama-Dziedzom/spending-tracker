import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Wallet, Briefcase, Gift, Calendar } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const INCOME_SOURCES = [
    { id: "Salary", label: "Salary", icon: Wallet },
    { id: "Business", label: "Business", icon: Briefcase },
    { id: "Gift", label: "Gift", icon: Gift },
];

export default function OnboardingIncome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [amount, setAmount] = useState('0.00');
    const [source, setSource] = useState('Salary');
    const [isRecurring, setIsRecurring] = useState(true);
    const [note, setNote] = useState('');

    const handleFinish = async () => {
        // In a final app, logic to save would go here
        router.replace('/(tabs)');
    };

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between px-6 mb-8">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100">
                    <ChevronLeft size={24} color="#000" />
                </Pressable>
                <Text className="text-xl font-heading text-[#0F4CFF]">Track Income</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView className="flex-1 px-8">
                <Text className="text-center text-[17px] text-[#6388FF] font-ui mb-10 mt-[-8] self-center max-w-[300] leading-[24px]">
                    Enter your current balance or expected monthly income to start tracking.
                </Text>

                <View className="items-center mb-16">
                    <View className="flex-row items-baseline gap-4">
                        <Text className="text-2xl font-numbers text-[#10B981]">GHS</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            className="text-7xl font-numbers tracking-tighter text-[#10B981] min-w-[200] text-center"
                            placeholderTextColor="#10B98140"
                        />
                    </View>
                    <View className="h-1 w-48 bg-emerald-500/10 mt-4 rounded-full" />
                </View>

                <View className="gap-8">
                    <View className="gap-4">
                        <Text className="text-sm font-heading text-slate-500 ml-1 tracking-wider uppercase">Source</Text>
                        <View className="flex-row gap-4">
                            {INCOME_SOURCES.map((item) => (
                                <Pressable
                                    key={item.id}
                                    onPress={() => setSource(item.id)}
                                    className={cn(
                                        "flex-1 h-[68px] rounded-3xl border-[1.5px] items-center justify-center gap-2 transition-all",
                                        source === item.id
                                            ? "border-[#0F4CFF] bg-[#F5F8FF]"
                                            : "border-slate-100 bg-slate-50/50"
                                    )}
                                >
                                    <item.icon size={20} color={source === item.id ? "#0F4CFF" : "#94A3B8"} />
                                    <Text className={cn("font-heading text-[15px]", source === item.id ? "text-[#0F4CFF]" : "text-slate-500")}>
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View className="p-6 rounded-[32px] border-[1.5px] border-[#DEE6FF] bg-white flex-row items-center justify-between">
                        <View className="flex-row items-center gap-4">
                            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center">
                                <Calendar size={22} color="#0F4CFF" />
                            </View>
                            <View>
                                <Text className="text-[17px] font-heading text-slate-900">Recurring</Text>
                                <Text className="text-xs font-ui text-slate-400">Monthly tracking</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => setIsRecurring(!isRecurring)}
                            className={cn("w-14 h-8 rounded-full px-1.5 justify-center transition-all", isRecurring ? "bg-[#0F4CFF] items-end" : "bg-slate-200 items-start")}
                        >
                            <View className="w-5 h-5 rounded-full bg-white shadow-sm" />
                        </Pressable>
                    </View>

                    <View className="gap-3">
                        <Text className="text-sm font-heading text-slate-500 ml-1 tracking-wider uppercase">Note (Optional)</Text>
                        <TextInput
                            placeholder="e.g. Monthly salary"
                            value={note}
                            onChangeText={setNote}
                            className="h-[68px] rounded-3xl border-[1.5px] border-slate-100 px-6 font-ui text-slate-900 text-[17px]"
                            placeholderTextColor="#CBD5E1"
                        />
                    </View>
                </View>
            </ScrollView>

            <View className="px-10 pb-12 pt-6" style={{ marginBottom: insets.bottom }}>
                <Pressable
                    className="w-full h-[64px] rounded-[32px] bg-[#1A51FF] items-center justify-center shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                    onPress={handleFinish}
                >
                    <Text className="text-white text-[20px] font-heading">Finish Setup</Text>
                </Pressable>
            </View>
        </View>
    );
}
