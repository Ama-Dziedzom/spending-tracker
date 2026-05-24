import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Pressable, Alert, ActivityIndicator } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Mail, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { biometrics } from '../utils/biometrics';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../lib/useAuth';

const { width, height } = Dimensions.get('window');

const SUGGESTED_DOMAINS = ['@gmail.com', '@yahoo.com', '@outlook.com', '@icloud.com'];

// Premium brand SVGs for high resolution rendering
function GoogleIcon() {
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
            <G>
                <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.65-.35-1.35-.35-2.09z"
                    fill="#FBBC05"
                />
                <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                />
            </G>
        </Svg>
    );
}

function AppleIcon() {
    return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="#000000">
            <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.64.74-1.2 1.88-1.05 2.99 1.11.09 2.27-.58 3-1.43" />
        </Svg>
    );
}

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Login field states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [isBioEnabled, setIsBioEnabled] = useState(false);
    const { loading, signIn, showError } = useAuth();

    const handleBiometricLogin = useCallback(async () => {
        const result = await biometrics.attemptBiometricLogin();
        if (result.success) {
            router.replace('/(tabs)');
        } else if (result.requiresRelogin) {
            Alert.alert(
                'Biometric Authentication Required',
                'Your biometric key is invalid or has expired. Please log in manually with your email and password.',
                [{ text: 'OK' }]
            );
        }
    }, [router]);

    useEffect(() => {
        const checkBiometricStatus = async () => {
            const enabled = await biometrics.isBiometricLoginEnabled();
            setIsBioEnabled(enabled);
            if (enabled) {
                const bioEmail = await biometrics.getBiometricUserEmail();
                if (bioEmail) {
                    setEmail(bioEmail);
                }
                // Auto-trigger biometric prompt on mount
                handleBiometricLogin();
            }
        };
        checkBiometricStatus();
    }, [handleBiometricLogin]);
    
    // Input element refs for keyboard navigation
    const emailInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);

    // Interactive email domain autocomplete selection
    const handleDomainSelect = (domain: string) => {
        const atIndex = email.indexOf('@');
        let username = email;
        if (atIndex > -1) {
            username = email.substring(0, atIndex);
        }
        const completedEmail = username + domain;
        setEmail(completedEmail);
        
        // Auto-focus Password field for fluid continuation!
        setTimeout(() => {
            passwordInputRef.current?.focus();
        }, 50);
    };

    // Client-side validations
    const isEmailValid = useMemo(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }, [email]);

    const isPasswordValid = useMemo(() => {
        return password.length >= 6;
    }, [password]);

    const isFormValid = useMemo(() => {
        return isEmailValid && isPasswordValid;
    }, [isEmailValid, isPasswordValid]);

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* Premium, brand-aligned gradient background */}
            <View style={StyleSheet.absoluteFill}>
                <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
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

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
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
                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>Login to get access</Text>
                    </View>

                    {/* Overlapping premium white card sheet */}
                    <View style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
                        
                        {/* EMAIL ADDRESS BLOCK */}
                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                        <Pressable 
                            onPress={() => emailInputRef.current?.focus()}
                            style={[
                                styles.inputContainer,
                                emailFocused && styles.inputContainerFocused
                            ]}
                        >
                            <Mail size={20} color={emailFocused ? '#1642E5' : '#ADAEAF'} style={styles.inputIcon} />
                            <TextInput
                                ref={emailInputRef}
                                style={styles.textInput}
                                placeholder="john@example.com"
                                placeholderTextColor="#C4C9D3"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => {
                                    // Timeout prevents tag unmounting before onPress fires
                                    setTimeout(() => setEmailFocused(false), 180);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </Pressable>

                        {/* Email Domain Autocomplete Tags Row */}
                        {emailFocused && (
                            <View style={styles.domainTagsContainer}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    keyboardShouldPersistTaps="always"
                                    style={styles.domainTagsScrollView}
                                    contentContainerStyle={styles.domainTagsContent}
                                >
                                    {SUGGESTED_DOMAINS.map((domain) => (
                                        <TouchableOpacity
                                            key={domain}
                                            style={styles.domainTag}
                                            onPress={() => handleDomainSelect(domain)}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={styles.domainTagText}>{domain}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={{ height: emailFocused ? 12 : 16 }} />

                        {/* PASSWORD BLOCK */}
                        <Text style={styles.label}>PASSWORD</Text>
                        <Pressable 
                            onPress={() => passwordInputRef.current?.focus()}
                            style={[
                                styles.inputContainer,
                                passwordFocused && styles.inputContainerFocused
                            ]}
                        >
                            <Lock size={20} color={passwordFocused ? '#1642E5' : '#ADAEAF'} style={styles.inputIcon} />
                            <TextInput
                                ref={passwordInputRef}
                                style={styles.textInput}
                                placeholder="****************"
                                placeholderTextColor="#C4C9D3"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                activeOpacity={0.7}
                                style={styles.eyeBtn}
                            >
                                {showPassword ? (
                                    <EyeOff size={22} color="#8B95A5" />
                                ) : (
                                    <Eye size={22} color="#8B95A5" />
                                )}
                            </TouchableOpacity>
                        </Pressable>

                        <View style={{ height: 32 }} />

                        {/* LOG IN PRIMARY BUTTON */}
                        <View style={styles.actionRowContainer}>
                            <TouchableOpacity
                                disabled={!isFormValid || loading}
                                activeOpacity={0.85}
                                style={[
                                    styles.btnPrimary,
                                    (!isFormValid || loading) && styles.btnPrimaryDisabled,
                                    isBioEnabled && { width: '78%' }
                                ]}
                                onPress={async () => {
                                    const result = await signIn(email, password);
                                    if (result.success) {
                                        router.replace('/(tabs)');
                                    } else {
                                        showError('Login Failed', result.error || 'Invalid email or password.');
                                    }
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.btnPrimaryText}>Log in</Text>
                                )}
                            </TouchableOpacity>

                            {isBioEnabled && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.btnBiometricCircle}
                                    onPress={handleBiometricLogin}
                                >
                                    <Fingerprint size={28} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* OR SEPARATOR */}
                        <View style={styles.separatorContainer}>
                            <View style={styles.separatorLine} />
                            <Text style={styles.separatorText}>or</Text>
                            <View style={styles.separatorLine} />
                        </View>

                        {/* SOCIAL BUTTONS ROW (2 COLUMNS SIDE-BY-SIDE) */}
                        <View style={styles.socialButtonsRow}>
                            {/* GOOGLE SOCIAL BUTTON */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.btnSocialHalf}
                                onPress={() => {}}
                            >
                                <View style={styles.socialContentRow}>
                                    <GoogleIcon />
                                    <Text style={styles.btnSocialText}>Google</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={{ width: 12 }} />

                            {/* APPLE SOCIAL BUTTON */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.btnSocialHalf}
                                onPress={() => {}}
                            >
                                <View style={styles.socialContentRow}>
                                    <AppleIcon />
                                    <Text style={styles.btnSocialText}>Apple</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* FOOTER NAVIGATION */}
                        <View style={styles.footerContainer}>
                            <Text style={styles.footerTextNormal}>Don’t have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/signup')}>
                                <Text style={styles.footerTextBold}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>

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
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#081750'
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
        paddingBottom: 24,
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
        paddingTop: 36,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        color: '#7C7D80',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8ECFC',
        borderRadius: 28,
        height: 56,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
    },
    inputContainerFocused: {
        borderColor: '#1642E5',
        shadowColor: '#1642E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        color: '#1E293B',
        height: '100%',
        paddingVertical: 0,
    },
    eyeBtn: {
        paddingVertical: 8,
        paddingLeft: 12,
    },
    domainTagsContainer: {
        marginTop: 8,
        width: '100%',
    },
    domainTagsScrollView: {
        width: '100%',
    },
    domainTagsContent: {
        paddingHorizontal: 4,
        paddingRight: 24,
    },
    domainTag: {
        backgroundColor: '#F0F4FF',
        borderWidth: 1.2,
        borderColor: '#DAE2FF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    domainTagText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        color: '#1642E5',
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
    },
    btnPrimaryDisabled: {
        backgroundColor: '#D5E0FF',
        shadowOpacity: 0,
        elevation: 0,
    },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
    actionRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    btnBiometricCircle: {
        backgroundColor: '#1642E5',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1642E5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 4,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 18,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    separatorText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#94A3B8',
        marginHorizontal: 16,
    },
    socialButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    btnSocialHalf: {
        flex: 1,
        backgroundColor: '#F5F7FB',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    socialContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    btnSocialText: {
        color: '#1642E5',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
        marginLeft: 10,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 26,
        marginBottom: 8,
    },
    footerTextNormal: {
        fontFamily: 'Manrope-Medium',
        fontSize: 15,
        color: '#8B95A5',
    },
    footerTextBold: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        color: '#1642E5',
    },
});
