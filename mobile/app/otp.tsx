import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabase';
import { formatPhone, phoneAuthMessage } from '../lib/phone';

const { width, height } = Dimensions.get('window');

export default function OtpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // mode: 'email' (old sign up), 'phone' (sign up / log in by text), 'phone_change' (add a phone to this account)
    // intent: 'signup' | 'login' — only used for phone mode
    const { email, fullName, phone, mode = 'email', intent } = useLocalSearchParams<{
        email?: string; fullName?: string; phone?: string; mode?: 'email' | 'phone' | 'phone_change'; intent?: 'signup' | 'login';
    }>();
    const { loading, verifyOtp, resendOtp, sendPhoneCode, verifyPhoneCode, addPhoneToAccount, verifyPhoneChange, showError } = useAuth();
    const byText = mode === 'phone' || mode === 'phone_change';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Refs for all 6 individual OTP input cells
    const inputRefs = [
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
    ];

    const isComplete = useMemo(() => otp.every(digit => digit !== ''), [otp]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleOtpChange = (text: string, index: number) => {
        // Strip out non-numeric characters
        const cleanedText = text.replace(/[^0-9]/g, '');

        if (error) setError(null);

        // Handle paste / iOS autofill — full code pasted into one cell
        if (cleanedText.length > 1) {
            const digits = cleanedText.slice(0, 6).split('');
            const newOtp = [...otp];
            digits.forEach((d, i) => {
                if (i < 6) newOtp[i] = d;
            });
            setOtp(newOtp);
            // Focus the last filled cell or the next empty one
            const focusIdx = Math.min(digits.length, 5);
            inputRefs[focusIdx].current?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = cleanedText;
        setOtp(newOtp);

        // Auto-focus next cell if text is typed
        if (cleanedText && index < 5) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        // Auto-focus previous cell if backspace is tapped inside empty cell
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handleResend = useCallback(async () => {
        if (resendCooldown > 0) return;
        if (byText ? !phone : !email) return;
        setError(null);
        const result = mode === 'phone'
            ? await sendPhoneCode(phone!, { create: intent === 'signup', fullName })
            : mode === 'phone_change'
                ? await addPhoneToAccount(phone!)
                : await resendOtp(email!);
        if (result.success) {
            setOtp(['', '', '', '', '', '']);
            setResendCooldown(60);
            inputRefs[0].current?.focus();
        } else {
            showError('Resend Failed', byText ? phoneAuthMessage(result.error) : (result.error || 'Could not resend code. Please try again.'));
        }
    }, [email, phone, mode, intent, fullName, byText, resendCooldown, resendOtp, sendPhoneCode, addPhoneToAccount, showError]);

    const handleVerify = useCallback(async () => {
        const code = otp.join('');
        if (mode === 'phone' && phone) {
            const result = await verifyPhoneCode(phone, code);
            if (!result.success) { setError(phoneAuthMessage(result.error)); return; }
            setError(null);
            if (intent === 'signup') {
                // Name was sent with the code request; save it again in case this number already had an account
                if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
                router.replace('/success');
            } else {
                router.replace('/(tabs)');
            }
            return;
        }
        if (mode === 'phone_change' && phone) {
            const result = await verifyPhoneChange(phone, code);
            if (!result.success) { setError(phoneAuthMessage(result.error)); return; }
            setError(null);
            router.dismissTo('/settings');
            return;
        }
        if (!email) return;
        const result = await verifyOtp(email, code);
        if (result.success) {
            setError(null);
            router.push({
                pathname: '/password',
                params: { email, fullName, phone }
            });
        } else {
            setError(result.error || 'Incorrect code. Please try again.');
        }
    }, [email, fullName, phone, mode, intent, otp, verifyOtp, verifyPhoneCode, verifyPhoneChange, router]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.root}
        >
            <StatusBar style="light" />

            {/* Premium, brand-aligned gradient background */}
            <View style={StyleSheet.absoluteFill}>
                <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
                    <Defs>
                        <RadialGradient id="ub"
                            cx={width * 0.55} cy={0} r={height * 0.65}
                            gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#1642E5" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="tl"
                            cx={0} cy={0} r={height * 0.45}
                            gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                            <Stop offset="40%" stopColor="#B7C4F7" stopOpacity="0.45" />
                            <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="tr"
                            cx={width * 0.8} cy={-height * 0.05} r={height * 0.55}
                            gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#3558FF" stopOpacity="0.7" />
                            <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Rect width={width} height={height} fill="#081750" />
                    <Rect width={width} height={height} fill="url(#ub)" />
                    <Rect width={width} height={height} fill="url(#tl)" />
                    <Rect width={width} height={height} fill="url(#tr)" />
                </Svg>
                {/* Solid white background at the bottom to ensure white behind keyboard and scroll view */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: height * 0.65,
                    backgroundColor: '#FFFFFF',
                }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContainer}
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Nav Row */}
                <View style={[styles.headerNavRow, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButtonCircle}
                        activeOpacity={0.7}
                    >
                        <HugeiconsIcon icon={ArrowLeft02Icon} size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Header section with brand typography */}
                <View style={styles.header}>
                    <Text style={styles.title}>{byText ? 'Check your messages' : 'We just sent an email'}</Text>
                    <Text style={styles.subtitle}>{byText ? 'We texted you a 6-digit code' : 'Verify account OTP'}</Text>
                </View>

                {/* Overlapping premium white card sheet */}
                <View style={[styles.card, { paddingBottom: insets.bottom + 32 }]}>
                    
                    {/* Centered Descriptive Prompts */}
                    <View style={styles.promptContainer}>
                        <Text style={styles.promptTextNormal}>Enter the security code we sent to</Text>
                        <Text style={styles.promptTextBold}>{byText ? (formatPhone(phone) || 'your phone') : (email || 'your email')}</Text>
                    </View>

                    <View style={{ height: 36 }} />

                    {/* OTP CELL INPUTS */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={inputRefs[index]}
                                style={[
                                    styles.otpCell,
                                    focusedIndex === index && styles.otpCellFocused,
                                    digit !== '' && styles.otpCellFilled,
                                    error && styles.otpCellError,
                                ]}
                                keyboardType="number-pad"
                                maxLength={index === 0 ? 6 : 1}
                                value={digit}
                                onChangeText={(text) => handleOtpChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(-1)}
                                selectTextOnFocus
                                caretHidden
                                autoCorrect={false}
                                textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                importantForAutofill={index === 0 ? 'yes' : 'no'}
                            />
                        ))}
                    </View>

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : (
                        <View style={{ height: 36 }} />
                    )}

                    {/* RESEND CODE */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendTextNormal}>Didn't receive the code? </Text>
                        {resendCooldown > 0 ? (
                            <Text style={styles.resendTextCooldown}>Resend in {resendCooldown}s</Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend} activeOpacity={0.6}>
                                <Text style={styles.resendTextBold}>Send Again</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Pushes Verify button to spacing balance */}
                    <View style={{ flex: 1, minHeight: 60 }} />

                    {/* VERIFY ACCOUNT BUTTON */}
                    <TouchableOpacity
                        disabled={!isComplete || loading}
                        activeOpacity={0.85}
                        style={[
                            styles.btnPrimary,
                            (!isComplete || loading) && styles.btnPrimaryDisabled
                        ]}
                        onPress={handleVerify}
                    >
                        <View style={styles.btnContentRow}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.btnText}>Verify</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* A white view extending far below the card to cover any keyboard/scrolling gaps */}
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        position: 'absolute',
                        bottom: -1000,
                        left: 0,
                        right: 0,
                        height: 1000,
                    }} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#081750'
    },
    scroll: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'space-between'
    },
    headerNavRow: {
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    backButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -4,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
    },
    title: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 32,
        lineHeight: 40,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Manrope-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    card: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        paddingHorizontal: 24,
        paddingTop: 44,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    promptContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    promptTextNormal: {
        fontFamily: 'Manrope-Regular',
        fontSize: 16,
        lineHeight: 24,
        color: '#7E8B9B',
        textAlign: 'center',
    },
    promptTextBold: {
        fontFamily: 'Manrope-Bold',
        fontSize: 16,
        lineHeight: 24,
        color: '#1642E5',
        textAlign: 'center',
        marginTop: 2,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    otpCell: {
        width: 40,
        height: 56,
        borderWidth: 1.5,
        borderColor: '#E8ECFC',
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        textAlign: 'center',
        fontFamily: 'Manrope-Bold',
        fontSize: 20,
        color: '#1E293B',
        // Direct shadows for high visual pop
        shadowColor: '#1642E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    otpCellFocused: {
        borderColor: '#1642E5',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    otpCellFilled: {
        backgroundColor: '#F8FAFF',
        borderColor: '#DAE2FF',
    },
    otpCellError: {
        borderColor: '#DC2626',
    },
    errorText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 15,
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 16,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    resendTextNormal: {
        fontFamily: 'Manrope-Medium',
        fontSize: 15,
        color: '#8B95A5',
    },
    resendTextBold: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        color: '#1642E5',
    },
    resendTextCooldown: {
        fontFamily: 'Manrope-Medium',
        fontSize: 15,
        color: '#C4C9D3',
    },
    btnPrimary: {
        backgroundColor: '#1642E5',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1642E5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 4,
        width: '100%',
        marginBottom: 12,
    },
    btnPrimaryDisabled: {
        backgroundColor: '#D5E0FF', // Beautiful light-lavender brand disabled state
        shadowOpacity: 0,
        elevation: 0,
    },
    btnContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
});
