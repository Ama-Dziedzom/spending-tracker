import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path, Circle } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../lib/useAuth';

const { width, height } = Dimensions.get('window');

// Custom premium validation check indicator
interface CheckIconProps {
    isMet: boolean;
}

function ValidationCheckIcon({ isMet }: CheckIconProps) {
    if (isMet) {
        return (
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="10" fill="#1642E5" />
                <Path
                    d="M6 10l2.5 2.5L14 7"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }
    return (
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Circle cx="10" cy="10" r="9" stroke="#E2E8F0" strokeWidth="2" />
            <Path
                d="M6 10l2.5 2.5L14 7"
                stroke="#E2E8F0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default function PasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { email, fullName, phone } = useLocalSearchParams<{ email: string; fullName?: string; phone?: string }>();
    const { loading, setPasswordAndProfile, showError } = useAuth();

    const [password, setPassword] = useState('');
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Ref for password secure text input to force focus on whole pill tap
    const passwordInputRef = useRef<TextInput>(null);

    // Rule 1: Must be 8 characters long
    const isMinLengthMet = useMemo(() => password.length >= 8, [password]);

    // Rule 2: Must include at least a letter
    const isLetterMet = useMemo(() => /[a-zA-Z]/.test(password), [password]);

    // Rule 3: Must contain a number and symbol
    const isNumberAndSymbolMet = useMemo(() => {
        const hasNumber = /[0-9]/.test(password);
        const hasSymbol = /[^a-zA-Z0-9]/.test(password);
        return hasNumber && hasSymbol;
    }, [password]);

    // All validation rules met
    const isAllCriteriaMet = useMemo(() => {
        return isMinLengthMet && isLetterMet && isNumberAndSymbolMet;
    }, [isMinLengthMet, isLetterMet, isNumberAndSymbolMet]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.root}
        >
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
                    <Text style={styles.title}>Password</Text>
                    <Text style={styles.subtitle}>Create your password</Text>
                </View>

                {/* Overlapping premium white card sheet */}
                <View style={[styles.card, { paddingBottom: insets.bottom + 32 }]}>
                    
                    {/* PASSWORD INPUT BLOCK */}
                    <Text style={styles.label}>PASSWORD</Text>
                    <Pressable
                        onPress={() => passwordInputRef.current?.focus()}
                        style={[
                            styles.inputContainer,
                            passwordFocused && styles.inputContainerFocused
                        ]}
                    >
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

                    <View style={{ height: 28 }} />

                    {/* LIVE PASSWORD RULES VALIDATOR CHECKLIST */}
                    <View style={styles.validationContainer}>
                        {/* Rule 1 */}
                        <View style={styles.ruleRow}>
                            <ValidationCheckIcon isMet={isMinLengthMet} />
                            <Text style={[
                                styles.ruleText,
                                isMinLengthMet ? styles.ruleTextMet : styles.ruleTextUnmet
                            ]}>
                                Must be 8 characters long
                            </Text>
                        </View>

                        {/* Rule 2 */}
                        <View style={styles.ruleRow}>
                            <ValidationCheckIcon isMet={isLetterMet} />
                            <Text style={[
                                styles.ruleText,
                                isLetterMet ? styles.ruleTextMet : styles.ruleTextUnmet
                            ]}>
                                Must include at least a letter
                            </Text>
                        </View>

                        {/* Rule 3 */}
                        <View style={styles.ruleRow}>
                            <ValidationCheckIcon isMet={isNumberAndSymbolMet} />
                            <Text style={[
                                styles.ruleText,
                                isNumberAndSymbolMet ? styles.ruleTextMet : styles.ruleTextUnmet
                            ]}>
                                Must contain a number and symbol
                            </Text>
                        </View>
                    </View>

                    {/* Spacer balance */}
                    <View style={{ flex: 1, minHeight: 100 }} />

                    {/* CREATE PASSWORD PRIMARY BUTTON */}
                    <TouchableOpacity
                        disabled={!isAllCriteriaMet || loading}
                        activeOpacity={0.85}
                        style={[
                            styles.btnPrimary,
                            (!isAllCriteriaMet || loading) && styles.btnPrimaryDisabled
                        ]}
                        onPress={async () => {
                            const result = await setPasswordAndProfile(password, fullName, phone);
                            if (result.success) {
                                router.push('/success');
                            } else {
                                showError('Password Setup Failed', result.error || 'Could not set password. Please try again.');
                            }
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.btnPrimaryText}>Create password</Text>
                        )}
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
        borderRadius: 28, // Matches buttons perfectly
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
    validationContainer: {
        paddingHorizontal: 4,
        gap: 16,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ruleText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        marginLeft: 12,
    },
    ruleTextUnmet: {
        color: '#7E8B9B',
    },
    ruleTextMet: {
        color: '#1642E5', // Highlights in brand-blue when active/met
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
    btnPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
});
