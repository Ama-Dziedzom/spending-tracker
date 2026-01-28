import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserIcon, Mail01Icon, GoogleIcon, AppleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';

const AnimatedView = Animated.View as any;

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const onSignup = async () => {
        if (!email || !password || !name) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                },
            });

            if (error) throw error;

            if (data.session) {
                router.replace('/onboarding-choice');
            } else {
                Alert.alert('Success', 'Please check your email for confirmation');
                router.push('/login');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#0F4CFF]">
            <View style={{ paddingTop: insets.top + 40 }} className="px-8 pb-10">
                <AnimatedView entering={FadeInDown.duration(600)}>
                    <Text className="text-[40px] font-heading text-white tracking-tighter leading-[48px]">
                        Join LogIt.
                    </Text>
                    <Text className="text-[18px] font-body text-white/60 mt-2">
                        Start your journey to financial clarity today.
                    </Text>
                </AnimatedView>
            </View>

            <AnimatedView
                entering={FadeIn.duration(800).delay(200)}
                className="flex-1 bg-white rounded-t-[40px] px-8 pt-10"
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    >
                        {/* Form */}
                        <View className="gap-5">
                            <View>
                                <Text className="text-slate-500 font-heading text-[14px] mb-2 ml-1 uppercase tracking-wider">Full Name</Text>
                                <View className="flex-row items-center bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] px-6">
                                    <HugeiconsIcon icon={UserIcon} size={20} color="#64748B" />
                                    <TextInput
                                        placeholder="Enter your name"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 ml-4 text-slate-900 font-body text-[16px]"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-slate-500 font-heading text-[14px] mb-2 ml-1 uppercase tracking-wider">Email Address</Text>
                                <View className="flex-row items-center bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] px-6">
                                    <HugeiconsIcon icon={Mail01Icon} size={20} color="#64748B" />
                                    <TextInput
                                        placeholder="Enter your email"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 ml-4 text-slate-900 font-body text-[16px]"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-slate-500 font-heading text-[14px] mb-2 ml-1 uppercase tracking-wider">Password</Text>
                                <View className="flex-row items-center bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] px-6">
                                    <TextInput
                                        placeholder="Create a password"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 text-slate-900 font-body text-[16px]"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <Pressable
                                className="bg-[#0F4CFF] h-[64px] rounded-[24px] items-center justify-center flex-row gap-2 mt-4 active:opacity-90 shadow-lg shadow-blue-200"
                                onPress={onSignup}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-heading text-[18px]">Create Account</Text>
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="white" />
                                    </>
                                )}
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View className="flex-row items-center my-10 gap-4">
                            <View className="flex-1 h-[1px] bg-slate-100" />
                            <Text className="text-slate-400 font-body text-[14px]">Or sign up with</Text>
                            <View className="flex-1 h-[1px] bg-slate-100" />
                        </View>

                        {/* SSO */}
                        <View className="flex-row gap-4">
                            <Pressable className="flex-1 bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] flex-row items-center justify-center gap-3 active:bg-slate-100">
                                <HugeiconsIcon icon={GoogleIcon} size={24} color="#0F4CFF" />
                                <Text className="text-slate-900 font-heading text-[16px]">Google</Text>
                            </Pressable>
                            <Pressable className="flex-1 bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] flex-row items-center justify-center gap-3 active:bg-slate-100">
                                <HugeiconsIcon icon={AppleIcon} size={24} color="black" />
                                <Text className="text-slate-900 font-heading text-[16px]">Apple</Text>
                            </Pressable>
                        </View>

                        {/* Footer */}
                        <View className="mt-12 items-center">
                            <Pressable
                                className="flex-row gap-1"
                                onPress={() => router.push('/login')}
                            >
                                <Text className="text-slate-400 font-body text-[16px]">Already have an account?</Text>
                                <Text className="text-[#0F4CFF] font-heading text-[16px]">Log In</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </AnimatedView>
        </View>
    );
}

