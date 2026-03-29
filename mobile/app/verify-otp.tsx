import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowRight02Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const AnimatedView = Animated.View as any;

export default function VerifyOtpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { phone, countryCode } = useLocalSearchParams<{ phone: string; countryCode: string }>();
    
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [timer, setTimer] = useState(59);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    
    const inputRefs = useRef<TextInput[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste
            const pastedData = value.slice(0, 5).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (index + i < 5) newOtp[index + i] = char;
            });
            setOtp(newOtp);
            // Focus last filled or next empty
            const nextIndex = Math.min(index + pastedData.length, 4);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError(false);

        if (value && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const onVerify = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length < 5) {
            Alert.alert('Error', 'Please enter the full 5-digit code');
            return;
        }

        setLoading(true);
        try {
            // Mocking verification success
            if (fullOtp === '12345') {
                 router.replace({
                    pathname: '/onboarding-choice',
                    params: { verified: 'true' }
                 });
            } else {
                setError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const isOtpComplete = otp.every(digit => digit !== '');

    return (
        <View className="flex-1 bg-[#1642E5]">
            {/* Header */}
            <View style={{ paddingTop: insets.top + 20 }} className="px-7 pb-10">
                <AnimatedView entering={FadeInDown.duration(600)}>
                    <Text className="text-[24px] font-manrope-semibold text-white tracking-tight leading-8">
                        We just sent an SMS
                    </Text>
                    <Text className="text-[16px] font-manrope-medium text-white mt-1">
                        Verify account OTP
                    </Text>
                </AnimatedView>
            </View>

            {/* Body */}
            <AnimatedView
                entering={FadeIn.duration(800).delay(200)}
                className="flex-1 bg-white rounded-t-[50px] px-7 pt-[43px]"
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="flex-row items-center flex-wrap gap-1">
                            <Text className="text-[#6887F6] font-manrope-regular text-[14px]">
                                Enter the 5-digit code sent to
                            </Text>
                            <Pressable 
                                className="flex-row items-center gap-1.5"
                                onPress={() => router.back()}
                            >
                                <Text className="text-[#1340DF] font-manrope-semibold text-[14px]">
                                    {countryCode} {phone}
                                </Text>
                                <HugeiconsIcon icon={PencilEdit02Icon} size={14} color="#1340DF" />
                            </Pressable>
                        </View>

                        {/* OTP Inputs */}
                        <View className="flex-row justify-between mt-8 mb-4">
                            {otp.map((digit, index) => (
                                <View 
                                    key={index}
                                    style={{ 
                                        width: 56, 
                                        height: 66, 
                                        borderColor: error ? '#E53E3E' : '#EDEDED',
                                        borderWidth: 1.5
                                    }}
                                    className="bg-white rounded-[15px] items-center justify-center overflow-hidden"
                                >
                                    <TextInput
                                        ref={(el) => (inputRefs.current[index] = el as any)}
                                        className="text-[32px] font-manrope-regular text-[#3E3E3E] text-center w-full h-full"
                                        keyboardType="number-pad"
                                        maxLength={Platform.OS === 'android' ? 1 : 5}
                                        value={digit}
                                        onChangeText={(v) => handleOtpChange(v, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        selectionColor="#1340DF"
                                        cursorColor="#1340DF"
                                    />
                                </View>
                            ))}
                        </View>

                        {error && (
                            <Text className="text-[#E53E3E] font-manrope-medium text-[12px] mb-4">
                                Incorrect code. Please try again.
                            </Text>
                        )}

                        <Text className="text-[#6887F6] font-manrope-regular text-[14px] mb-2">
                            00:{timer < 10 ? `0${timer}` : timer}
                        </Text>

                        <View className="flex-row items-center">
                            <Text className="text-[#6887F6] font-manrope-regular text-[14px]">Didn't receive the code? </Text>
                            <Pressable disabled={timer > 0}>
                                <Text className={`font-manrope-semibold text-[14px] ${timer > 0 ? 'text-[#6887F6]/50' : 'text-[#1340DF]'}`}>
                                    Send Again
                                </Text>
                            </Pressable>
                        </View>

                        {/* Verify Button */}
                        <View className="mt-12">
                            <Pressable
                                className={`h-[50px] rounded-[20px] items-center justify-center flex-row gap-2 active:opacity-90 ${isOtpComplete ? 'bg-[#1340DF]' : 'bg-[#C5D1FD]'}`}
                                onPress={onVerify}
                                disabled={!isOtpComplete || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-manrope-semibold text-[16px]">Verify</Text>
                                        <HugeiconsIcon icon={ArrowRight02Icon} size={24} color="white" strokeWidth={1.5} />
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </AnimatedView>
        </View>
    );
}
