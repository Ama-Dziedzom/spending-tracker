import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
});
