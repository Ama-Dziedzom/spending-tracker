import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Pressable } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, ChevronDown, Mail } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';

const { width, height } = Dimensions.get('window');

const COUNTRIES = [
    { flag: '🇬🇭', code: '+233', name: 'Ghana' },
    { flag: '🇳🇬', code: '+234', name: 'Nigeria' },
    { flag: '🇰🇪', code: '+254', name: 'Kenya' },
    { flag: '🇿🇦', code: '+27', name: 'South Africa' },
    { flag: '🇬🇧', code: '+44', name: 'United Kingdom' },
    { flag: '🇺🇸', code: '+1', name: 'United States' },
];

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

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Sign up field states
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    
    const [fullNameFocused, setFullNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [phoneFocused, setPhoneFocused] = useState(false);
    
    // Input element refs for absolute tap-target UX focusing
    const nameInputRef = useRef<TextInput>(null);
    const emailInputRef = useRef<TextInput>(null);
    const phoneInputRef = useRef<TextInput>(null);

    // Form input validation hooks (includes robust email format check)
    const isEmailValid = useMemo(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }, [email]);

    const isFullNameValid = useMemo(() => {
        return fullName.trim().length >= 2;
    }, [fullName]);

    const isPhoneValid = useMemo(() => {
        const cleaned = phone.replace(/[^0-9]/g, '');
        return cleaned.length >= 7 && cleaned.length <= 15;
    }, [phone]);

    const isFormValid = useMemo(() => {
        return isFullNameValid && isEmailValid && isPhoneValid;
    }, [isFullNameValid, isEmailValid, isPhoneValid]);

    // Interactive country bottom sheet states
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Bottom sheet setup
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['45%'], []);

    const handleOpenCountrySheet = useCallback(() => {
        setIsSheetOpen(true);
        bottomSheetRef.current?.expand();
    }, []);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setIsSheetOpen(false);
        } else {
            setIsSheetOpen(true);
        }
    }, []);

    // Interactive email domain autocomplete selection
    const handleDomainSelect = (domain: string) => {
        const atIndex = email.indexOf('@');
        let username = email;
        if (atIndex > -1) {
            username = email.substring(0, atIndex);
        }
        const completedEmail = username + domain;
        setEmail(completedEmail);
        
        // Auto-focus next field (Phone Number) for fluid continuation!
        setTimeout(() => {
            phoneInputRef.current?.focus();
        }, 50);
    };

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

            {/* Tap-outside transparent catcher overlay: Active ONLY when bottom sheet is open */}
            {isSheetOpen && (
                <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => bottomSheetRef.current?.close()} 
                />
            )}

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
                        <Text style={styles.title}>Let’s Get You Set Up</Text>
                        <Text style={styles.subtitle}>Enter your details to get started</Text>
                    </View>

                    {/* Overlapping premium white card sheet */}
                    <View style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
                        
                        {/* FULL NAME BLOCK */}
                        <Text style={styles.label}>FULL NAME</Text>
                        <Pressable 
                            onPress={() => nameInputRef.current?.focus()}
                            style={[
                                styles.inputContainer,
                                fullNameFocused && styles.inputContainerFocused
                            ]}
                        >
                            <User size={20} color={fullNameFocused ? '#1642E5' : '#ADAEAF'} style={styles.inputIcon} />
                            <TextInput
                                ref={nameInputRef}
                                style={styles.textInput}
                                placeholder="John Doe"
                                placeholderTextColor="#C4C9D3"
                                value={fullName}
                                onChangeText={setFullName}
                                onFocus={() => setFullNameFocused(true)}
                                onBlur={() => setFullNameFocused(false)}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                        </Pressable>

                        <View style={{ height: 16 }} />

                        {/* EMAIL BLOCK */}
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

                        {/* Email Domain Autocomplete Tags Row (visible only when focused) */}
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

                        {/* PHONE NUMBER BLOCK */}
                        <Text style={styles.label}>PHONE NUMBER</Text>
                        <View>
                            <Pressable 
                                onPress={() => phoneInputRef.current?.focus()}
                                style={[
                                    styles.inputContainer,
                                    phoneFocused && styles.inputContainerFocused
                                ]}
                            >
                                <TouchableOpacity 
                                    style={styles.countryPicker}
                                    onPress={handleOpenCountrySheet}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                                    <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                                    <ChevronDown size={16} color="#8B95A5" style={styles.chevron} />
                                </TouchableOpacity>
                                <View style={styles.fieldDivider} />
                                <TextInput
                                    ref={phoneInputRef}
                                    style={styles.textInput}
                                    placeholder="00 000 0000"
                                    placeholderTextColor="#C4C9D3"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    onFocus={() => setPhoneFocused(true)}
                                    onBlur={() => setPhoneFocused(false)}
                                    autoCorrect={false}
                                />
                            </Pressable>
                        </View>

                        <View style={{ height: 26 }} />

                        {/* CREATE ACCOUNT PRIMARY BUTTON */}
                        <TouchableOpacity
                            disabled={!isFormValid}
                            activeOpacity={0.85}
                            style={[
                                styles.btnPrimary,
                                !isFormValid && styles.btnPrimaryDisabled
                            ]}
                            onPress={() => {
                                // Link to OTP verification screen
                                router.push({
                                    pathname: '/otp',
                                    params: { email }
                                });
                            }}
                        >
                            <Text style={styles.btnPrimaryText}>Create Account</Text>
                        </TouchableOpacity>

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
                                onPress={() => {
                                    // Placeholder social flow
                                }}
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
                                onPress={() => {
                                    // Placeholder social flow
                                }}
                            >
                                <View style={styles.socialContentRow}>
                                    <AppleIcon />
                                    <Text style={styles.btnSocialText}>Apple</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* FOOTER NAVIGATION */}
                        <View style={styles.footerContainer}>
                            <Text style={styles.footerTextNormal}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text style={styles.footerTextBold}>Log In</Text>
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

            {/* Curated Country Picker Bottom Sheet (Rendered outside KeyboardAvoidingView to prevent keyboard layout overlap!) */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose={true} // Drag down to close is fully active
                onChange={handleSheetChanges}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandleIndicator}
            >
                <BottomSheetView style={styles.sheetContent}>
                    <Text style={styles.sheetTitle}>Select Country</Text>
                    
                    <BottomSheetScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                    >
                        {COUNTRIES.map((item) => (
                            <TouchableOpacity
                                key={item.code}
                                style={styles.sheetItem}
                                onPress={() => {
                                    setSelectedCountry(item);
                                    bottomSheetRef.current?.close();
                                }}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.sheetFlag}>{item.flag}</Text>
                                <View style={styles.sheetItemTextContainer}>
                                    <Text style={styles.sheetName}>{item.name}</Text>
                                    <Text style={styles.sheetCode}>{item.code}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </BottomSheetScrollView>
                </BottomSheetView>
            </BottomSheet>
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
        paddingTop: 36, // Shifted back up slightly for elegant, centered vertical proportions
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
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    flagEmoji: {
        fontSize: 20,
    },
    countryCode: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        color: '#1E293B',
        marginLeft: 8,
    },
    chevron: {
        marginLeft: 4,
    },
    fieldDivider: {
        width: 1.5,
        height: 24,
        backgroundColor: '#E8ECFC',
        marginHorizontal: 16,
    },
    sheetBackground: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 10,
    },
    sheetHandleIndicator: {
        backgroundColor: '#E2E8F0',
        width: 48,
        height: 5,
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    sheetTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 20,
        color: '#1642E5',
        marginBottom: 16,
        textAlign: 'center',
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetFlag: {
        fontSize: 24,
        marginRight: 16,
    },
    sheetItemTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sheetName: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        color: '#1E293B',
        flex: 1,
    },
    sheetCode: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
        color: '#1642E5',
        marginRight: 4,
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
        backgroundColor: '#D5E0FF', // Beautiful light-lavender brand disabled state
        shadowOpacity: 0,
        elevation: 0,
    },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 18, // Reduced slightly to save vertical space
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
        marginLeft: 10, // Adjusted spacing for side-by-side card layout
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 26, // Shifted back up slightly for elegant, centered vertical proportions
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
