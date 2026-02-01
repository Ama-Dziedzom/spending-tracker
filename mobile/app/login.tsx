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

const AnimatedView = Animated.createAnimatedComponent(View);

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);
    const [biometricEmail, setBiometricEmail] = useState<string | null>(null);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            // Check hardware availability
            const available = await biometrics.isAvailable();
            console.log('[Login] Biometric hardware available:', available);
            setIsBiometricAvailable(available);

            if (available) {
                // Check if biometric login is enabled for any user
                const enabled = await biometrics.isBiometricLoginEnabled();
                console.log('[Login] Biometric login enabled:', enabled);
                setIsBiometricEnabled(enabled);

                if (enabled) {
                    const savedEmail = await biometrics.getBiometricUserEmail();
                    console.log('[Login] Biometric saved email:', savedEmail);
                    setBiometricEmail(savedEmail);
                }

                // Determine biometric type for icon
                const types = await biometrics.getSupportedTypes();
                console.log('[Login] Supported biometric types:', types);
                if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('face');
                } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('fingerprint');
                } else if (available) {
                    setBiometricType('fingerprint');
                }
            }
        } catch (error) {
            console.error('[Login] Error checking biometrics:', error);
        }
    };

    const onLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session) {
                // Check if biometric login is available but not enabled for this user
                if (isBiometricAvailable && !isBiometricEnabled) {
                    Alert.alert(
                        'Enable Biometrics',
                        'Would you like to use biometrics for future logins?',
                        [
                            { text: 'No', style: 'cancel', onPress: () => router.replace('/(tabs)') },
                            {
                                text: 'Yes',
                                onPress: async () => {
                                    await biometrics.enableBiometricLogin(email);
                                    router.replace('/(tabs)');
                                }
                            }
                        ]
                    );
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const onBiometricLogin = async () => {
        if (!isBiometricEnabled) {
            Alert.alert(
                'Setup Required',
                'Please sign in manually once first. You\'ll be prompted to enable biometrics after login.'
            );
            return;
        }

        setLoading(true);
        try {
            const result = await biometrics.attemptBiometricLogin();

            if (result.success) {
                router.replace('/(tabs)');
            } else if (result.requiresRelogin) {
                // Clear the biometric state since session is invalid
                setIsBiometricEnabled(false);
                Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please sign in with your email and password.',
                    [{ text: 'OK' }]
                );
            }
            // If !success && !requiresRelogin, user cancelled - do nothing
        } catch (error) {
            console.error('[Login] Biometric login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const showBiometricButton = isBiometricAvailable && isBiometricEnabled;

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
                        {/* Biometric Quick Login - Show if enabled */}
                        {showBiometricButton && biometricEmail && (
                            <View className="mb-6">
                                <Pressable
                                    onPress={onBiometricLogin}
                                    disabled={loading}
                                    className="bg-slate-50 border border-slate-200 rounded-[24px] p-5 flex-row items-center justify-between active:bg-slate-100"
                                >
                                    <View className="flex-row items-center gap-4">
                                        <View className="w-12 h-12 bg-[#0F4CFF]/10 rounded-full items-center justify-center">
                                            <HugeiconsIcon
                                                icon={biometricType === 'face' ? FaceIdIcon : FingerPrintIcon}
                                                size={24}
                                                color="#0F4CFF"
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-slate-900 font-heading text-[16px]">
                                                Quick Login
                                            </Text>
                                            <Text className="text-slate-500 font-body text-[14px]">
                                                {biometricEmail}
                                            </Text>
                                        </View>
                                    </View>
                                    {loading ? (
                                        <ActivityIndicator color="#0F4CFF" />
                                    ) : (
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={20} color="#0F4CFF" />
                                    )}
                                </Pressable>

                                <View className="flex-row items-center my-6 gap-4">
                                    <View className="flex-1 h-[1px] bg-slate-100" />
                                    <Text className="text-slate-400 font-body text-[14px]">
                                        Or use email
                                    </Text>
                                    <View className="flex-1 h-[1px] bg-slate-100" />
                                </View>
                            </View>
                        )}

                        {/* Form */}
                        <View className="gap-5">
                            <View>
                                <Text className="text-slate-500 font-heading text-[14px] mb-2 ml-1 uppercase tracking-wider">
                                    Email Address
                                </Text>
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
                                        autoComplete="email"
                                    />
                                </View>
                            </View>

                            <View>
                                <View className="flex-row justify-between items-center mb-2 ml-1">
                                    <Text className="text-slate-500 font-heading text-[14px] uppercase tracking-wider">
                                        Password
                                    </Text>
                                    <Pressable>
                                        <Text className="text-[#0F4CFF] font-heading text-[14px]">
                                            Forgot?
                                        </Text>
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
                                        autoComplete="password"
                                    />
                                </View>
                            </View>

                            <Pressable
                                className="bg-[#0F4CFF] h-[64px] rounded-[24px] items-center justify-center flex-row gap-2 mt-4 active:opacity-90 shadow-lg shadow-blue-200"
                                onPress={onLogin}
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
                        </View>

                        {/* Divider */}
                        <View className="flex-row items-center my-10 gap-4">
                            <View className="flex-1 h-[1px] bg-slate-100" />
                            <Text className="text-slate-400 font-body text-[14px]">Or continue with</Text>
                            <View className="flex-1 h-[1px] bg-slate-100" />
                        </View>

                        {/* SSO - Placeholder for future implementation */}
                        <View className="flex-row gap-4">
                            <Pressable
                                className="flex-1 bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] flex-row items-center justify-center gap-3 active:bg-slate-100"
                                onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available soon.')}
                            >
                                <HugeiconsIcon icon={GoogleIcon} size={24} color="#0F4CFF" />
                                <Text className="text-slate-900 font-heading text-[16px]">Google</Text>
                            </Pressable>
                            <Pressable
                                className="flex-1 bg-slate-50 border border-slate-100 h-[64px] rounded-[24px] flex-row items-center justify-center gap-3 active:bg-slate-100"
                                onPress={() => Alert.alert('Coming Soon', 'Apple sign-in will be available soon.')}
                            >
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
