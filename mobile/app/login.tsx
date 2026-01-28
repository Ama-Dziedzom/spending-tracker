import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail01Icon, GoogleIcon, AppleIcon, ArrowRight01Icon, FingerPrintIcon, FaceIdIcon } from '@hugeicons/core-free-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../lib/supabase';
import { biometrics } from '../utils/biometrics';

const AnimatedView = Animated.View as any;

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const available = hasHardware && isEnrolled;

            console.log('Biometrics Status:', { hasHardware, isEnrolled, available });
            setIsBiometricAvailable(available);

            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            console.log('Supported Types:', types);

            if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                setBiometricType('face');
            } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                setBiometricType('fingerprint');
            } else if (available) {
                // Default to fingerprint icon if available but type not explicitly reported
                setBiometricType('fingerprint');
            }
        } catch (error) {
            console.error('Error checking biometrics:', error);
        }
    };

    const onLogin = async (overrideEmail?: string, overridePassword?: string) => {
        const loginEmail = overrideEmail || email;
        const loginPassword = overridePassword || password;

        if (!loginEmail || !loginPassword) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });

            if (error) throw error;

            if (data.session) {
                // If it was a manual login, ask to enable biometrics if supported
                if (!overrideEmail) {
                    const saved = await biometrics.getCredentials();
                    if (!saved || saved.email !== email) {
                        Alert.alert(
                            'Enable Biometrics',
                            'Would you like to use biometrics for future logins?',
                            [
                                { text: 'No', style: 'cancel' },
                                {
                                    text: 'Yes',
                                    onPress: async () => {
                                        await biometrics.saveCredentials(email, password);
                                        router.replace('/(tabs)');
                                    }
                                }
                            ]
                        );
                        // Don't wait for alert to navigate if they have another preference
                        // but for standard flow we wait. 
                        // Actually replace after the choice
                        return;
                    }
                }
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const onBiometricLogin = async () => {
        try {
            const credentials = await biometrics.getCredentials();

            if (!credentials) {
                Alert.alert(
                    'Setup Required',
                    'Please sign in manually once and "Enable Biometrics" when prompted to use this feature.'
                );
                return;
            }

            const success = await biometrics.authenticate();
            if (success) {
                await onLogin(credentials.email, credentials.password);
            }
        } catch (error) {
            console.error('Biometric Login Error:', error);
            Alert.alert('Error', 'An unexpected error occurred during biometric login.');
        }
    };

    return (
        <View className="flex-1 bg-[#0F4CFF]">
            <View style={{ paddingTop: insets.top + 40 }} className="px-8 pb-10">
                <AnimatedView entering={FadeInDown.duration(600)}>
                    <Text className="text-[40px] font-heading text-white tracking-tighter leading-[48px]">
                        Welcome back.
                    </Text>
                    <Text className="text-[18px] font-body text-white/60 mt-2">
                        Sign in to keep track of your finances.
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
                                <View className="flex-row justify-between items-center mb-2 ml-1">
                                    <Text className="text-slate-500 font-heading text-[14px] uppercase tracking-wider">Password</Text>
                                    <Pressable>
                                        <Text className="text-[#0F4CFF] font-heading text-[14px]">Forgot?</Text>
                                    </Pressable>
                                </View>
                                <View className="flex-row items-center bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] px-6">
                                    <TextInput
                                        placeholder="Enter your password"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 text-slate-900 font-body text-[16px]"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-4 mt-4">
                                <Pressable
                                    className="flex-1 bg-[#0F4CFF] h-[64px] rounded-[24px] items-center justify-center flex-row gap-2 active:opacity-90 shadow-lg shadow-blue-200"
                                    onPress={() => onLogin()}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text className="text-white font-heading text-[18px]">Log In</Text>
                                            <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="white" />
                                        </>
                                    )}
                                </Pressable>

                                {isBiometricAvailable && (
                                    <Pressable
                                        className="w-[64px] h-[64px] bg-slate-50 border border-slate-200 rounded-[24px] items-center justify-center active:bg-slate-100"
                                        onPress={onBiometricLogin}
                                        disabled={loading}
                                    >
                                        <HugeiconsIcon
                                            icon={biometricType === 'face' ? FaceIdIcon : FingerPrintIcon}
                                            size={28}
                                            color="#0F4CFF"
                                        />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Divider */}
                        <View className="flex-row items-center my-10 gap-4">
                            <View className="flex-1 h-[1px] bg-slate-100" />
                            <Text className="text-slate-400 font-body text-[14px]">Or continue with</Text>
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
                                onPress={() => router.push('/signup')}
                            >
                                <Text className="text-slate-400 font-body text-[16px]">Don't have an account?</Text>
                                <Text className="text-[#0F4CFF] font-heading text-[16px]">Sign Up</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </AnimatedView>
        </View>
    );
}

