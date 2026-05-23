import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { biometrics } from '../utils/biometrics';
import { Fingerprint } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
const { width, height } = Dimensions.get('window');

function SuccessIllustration() {
    return (
        <Svg width={140} height={140} viewBox="0 0 140 140" fill="none">
            {/* Outer soft glowing ring */}
            <Circle 
                cx="70" 
                cy="70" 
                r="64" 
                fill="#1642E5" 
                fillOpacity="0.06" 
                stroke="#1642E5" 
                strokeWidth="1.5" 
                strokeOpacity="0.12" 
                strokeDasharray="6 4" 
            />
            {/* Inner glowing ring */}
            <Circle 
                cx="70" 
                cy="70" 
                r="48" 
                fill="#1642E5" 
                fillOpacity="0.12" 
                stroke="#1642E5" 
                strokeWidth="1.5" 
                strokeOpacity="0.25" 
            />
            {/* Core Badge */}
            <Circle 
                cx="70" 
                cy="70" 
                r="34" 
                fill="#1642E5" 
            />
            {/* Clean checkmark path */}
            <Path
                d="M58 70l8 8 16-16"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default function SuccessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { email, password } = useLocalSearchParams<{ email?: string; password?: string }>();

    const [isBioSupported, setIsBioSupported] = React.useState(false);
    const [showBioPrompt, setShowBioPrompt] = React.useState(false);

    React.useEffect(() => {
        const checkBiometrics = async () => {
            const available = await biometrics.isAvailable();
            setIsBioSupported(available);
            // Automatically prompt to enable biometrics if supported and credentials are provided
            if (available && email && password) {
                setShowBioPrompt(true);
            }
        };
        checkBiometrics();
    }, [email, password]);

    const handleEnableBiometrics = async () => {
        if (!email || !password) return;
        const success = await biometrics.authenticate('Confirm Face ID / Touch ID to enable biometric login');
        if (success) {
            await biometrics.enableBiometricLogin(email, password);
            setShowBioPrompt(false);
            router.replace('/(tabs)');
        }
    };

    const handleSkipBiometrics = () => {
        setShowBioPrompt(false);
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* Premium, brand-aligned gradient background */}
            <View style={StyleSheet.absoluteFill}>
                <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
                    <Defs>
                        <RadialGradient id="ub"
                            cx={width * 0.5} cy={height * 0.3} r={height * 0.7}
                            gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#1642E5" stopOpacity="0.8" />
                            <Stop offset="100%" stopColor="#081750" stopOpacity="0" />
                        </RadialGradient>
                        <RadialGradient id="tl"
                            cx={width * 0.1} cy={height * 0.1} r={height * 0.5}
                            gradientUnits="userSpaceOnUse">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                            <Stop offset="40%" stopColor="#B7C4F7" stopOpacity="0.25" />
                            <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Rect width={width} height={height} fill="#081750" />
                    <Rect width={width} height={height} fill="url(#ub)" />
                    <Rect width={width} height={height} fill="url(#tl)" />
                </Svg>
            </View>

            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
                {/* Centered content block */}
                <View style={styles.content}>
                    <View style={styles.illustrationContainer}>
                        <SuccessIllustration />
                    </View>

                    <Text style={styles.title}>You’re All Set!</Text>
                    <Text style={styles.subtitle}>
                        Your account has been successfully created. You can now start managing your spending and budgets seamlessly.
                    </Text>
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.btnPrimary}
                    onPress={() => {
                        // Route to core tabs layout
                        router.replace('/(tabs)');
                    }}
                >
                    <View style={styles.btnContentRow}>
                        <Text style={styles.btnText}>Get Started</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Premium Glassmorphic Biometrics Enrollment Prompt Overlay */}
            {showBioPrompt && (
                <View style={StyleSheet.absoluteFill}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalCard}>
                                <View style={styles.bioIconCircle}>
                                    <View style={styles.bioIconPulse1}>
                                        <View style={styles.bioIconPulse2}>
                                            <Fingerprint size={48} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </View>

                                <Text style={styles.modalTitle}>Enable Biometrics?</Text>
                                <Text style={styles.modalSubtitle}>
                                    Use Face ID or Touch ID to log in quickly and securely without entering your password every time.
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    style={styles.btnModalPrimary}
                                    onPress={handleEnableBiometrics}
                                >
                                    <Text style={styles.btnModalPrimaryText}>Enable Biometrics</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={styles.btnModalSecondary}
                                    onPress={handleSkipBiometrics}
                                >
                                    <Text style={styles.btnModalSecondaryText}>Skip for now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#081750',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    illustrationContainer: {
        marginBottom: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 32,
        lineHeight: 40,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontFamily: 'Manrope-Regular',
        fontSize: 16,
        lineHeight: 24,
        color: 'rgba(255, 255, 255, 0.75)',
        textAlign: 'center',
    },
    btnPrimary: {
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
        width: '100%',
    },
    btnContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: '#1642E5',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 36,
        paddingHorizontal: 24,
        paddingVertical: 40,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
        width: '100%',
    },
    bioIconCircle: {
        marginBottom: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bioIconPulse1: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(22, 66, 229, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bioIconPulse2: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#1642E5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1642E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 5,
    },
    modalTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 26,
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 12,
    },
    modalSubtitle: {
        fontFamily: 'Manrope-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    btnModalPrimary: {
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
    btnModalPrimaryText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 18,
    },
    btnModalSecondary: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    btnModalSecondaryText: {
        color: '#64748B',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
    },
});
