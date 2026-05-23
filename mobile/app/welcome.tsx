import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const MOCK_FULL =
    'Your payment of GHS 10.00 to MTN AIRTIME has been completed at 2026-04-05 17:29:57. Your new balance: GHS 20.00. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction...';
const MOCK_SHORT =
    'Your payment of GHS 10.00 to MTN AIRTIME has been completed at 2026-04-05 17:29:57...';

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>

            {/* ── Gradient background ───────────────────────────────── */}
            <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
                <Defs>
                    <RadialGradient id="ub"
                        cx={width * 0.55} cy={0} r={height * 0.65}
                        gradientUnits="userSpaceOnUse">
                        <Stop offset="0%"   stopColor="#1642E5" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="tl"
                        cx={0} cy={0} r={height * 0.45}
                        gradientUnits="userSpaceOnUse">
                        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.75" />
                        <Stop offset="40%"  stopColor="#B7C4F7" stopOpacity="0.45" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0"   />
                    </RadialGradient>
                    <RadialGradient id="tr"
                        cx={width * 0.8} cy={-height * 0.05} r={height * 0.55}
                        gradientUnits="userSpaceOnUse">
                        <Stop offset="0%"   stopColor="#3558FF" stopOpacity="0.7" />
                        <Stop offset="100%" stopColor="#1642E5" stopOpacity="0"   />
                    </RadialGradient>
                </Defs>
                <Rect width={width} height={height} fill="#081750" />
                <Rect width={width} height={height} fill="url(#ub)" />
                <Rect width={width} height={height} fill="url(#tl)" />
                <Rect width={width} height={height} fill="url(#tr)" />
            </Svg>

            {/* ── Main flex column ──────────────────────────────────── */}
            <View style={[styles.col, {
                paddingTop:    insets.top + 140, // Shifted back up slightly for elegant, centered vertical proportions
                paddingBottom: insets.bottom + 30,
            }]}>

                {/* Card stack — compact, glassmorphic, and progressively blurred */}
                <View style={styles.stack}>
                    
                    {/* Card 1 Container (with stacked deck background card) */}
                    <View style={{ position: 'relative' }}>
                        {/* Stack effect background card (renders behind Card 1) */}
                        <View style={{
                            position: 'absolute',
                            bottom: -6,
                            left: 12,
                            right: 12,
                            height: 8, // Reduced to 8px so the side borders are completely hidden behind Card 1's bottom border
                            borderRadius: 16,
                            borderWidth: 1,
                            borderTopWidth: 0, // Removes the horizontal line running through Card 1
                            borderColor: 'rgba(230, 238, 255, 0.16)',
                            backgroundColor: 'transparent', // Keeps foreground Card 1 clean
                            transform: [{ scaleX: 0.96 }],
                        }} />
                        
                        {/* Crisp Foreground Card 1 */}
                        <BlurView
                            intensity={50}
                            tint="light"
                            style={{
                                height: 122,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: 'rgba(230, 238, 255, 0.35)',
                                backgroundColor: 'rgba(230, 238, 255, 0.09)',
                                paddingHorizontal: 20,
                                paddingTop: 11,
                                overflow: 'hidden',
                            }}
                        >
                            <Text style={styles.ct}>MobileMoney</Text>
                            <Text style={styles.cb}>{MOCK_FULL}</Text>
                        </BlurView>
                    </View>

                    <View style={{ height: 12 }} />

                    {/* Card 2 — Subtle Blur & High Opacity */}
                    <BlurView
                        intensity={35}
                        tint="light"
                        style={{
                            height: 78,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(230, 238, 255, 0.24)',
                            backgroundColor: 'rgba(230, 238, 255, 0.07)',
                            paddingHorizontal: 20,
                            paddingTop: 10,
                            overflow: 'hidden',
                            opacity: 0.5,
                        }}
                    >
                        <Text style={[styles.ct, styles.blurTextSm]}>MobileMoney</Text>
                        <Text style={[styles.cb, styles.blurTextSm]} numberOfLines={2}>{MOCK_SHORT}</Text>
                    </BlurView>

                    <View style={{ height: 12 }} />

                    {/* Card 3 — Moderate Blur & Medium Opacity */}
                    <BlurView
                        intensity={20}
                        tint="light"
                        style={{
                            height: 78,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(230, 238, 255, 0.18)',
                            backgroundColor: 'rgba(230, 238, 255, 0.05)',
                            paddingHorizontal: 20,
                            paddingTop: 10,
                            overflow: 'hidden',
                            opacity: 0.2,
                        }}
                    >
                        <Text style={[styles.ct, styles.blurTextMd]}>MobileMoney</Text>
                        <Text style={[styles.cb, styles.blurTextMd]} numberOfLines={2}>{MOCK_SHORT}</Text>
                    </BlurView>

                    <View style={{ height: 12 }} />

                    {/* Card 4 — Heavy Blur & Mid Opacity (Visibly blends behind the headline) */}
                    {/* <BlurView
                        intensity={15}
                        tint="light"
                        style={{
                            height: 78,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(230, 238, 255, 0.16)',
                            backgroundColor: 'rgba(230, 238, 255, 0.04)',
                            paddingHorizontal: 20,
                            paddingTop: 10,
                            overflow: 'hidden',
                            opacity: 0.2,
                        }}
                    >
                        <Text style={[styles.ct, styles.blurTextLg]}>MobileMoney</Text>
                        <Text style={[styles.cb, styles.blurTextLg]} numberOfLines={2}>{MOCK_SHORT}</Text>
                    </BlurView> */}

                </View>

                {/* ── Headline + subtitle (overlays bottom curve of Card 4 cleanly) ──────────────────────────── */}
                <View style={[styles.textBlock, { marginTop: 55 }]}>
                    <Text style={styles.headline}>Spend Smart. Zero Effort.</Text>
                    <Text style={[styles.subtitle, { marginTop: 6 }]}>
                        Your MoMo and bank transactions, tracked automatically
                    </Text>
                </View>

                {/* ── Flex spacer: pushes buttons to the bottom ──── */}
                <View style={{ flex: 1, minHeight: 20 }} />

                {/* ── Sign up ──────────────────────────────────────── */}
                <Pressable
                    style={styles.signUpBtn}
                    onPress={() => router.push('/signup')}
                >
                    <Text style={styles.signUpText}>Sign up</Text>
                </Pressable>

                <View style={{ height: 14 }} />

                {/* ── Sign in ──────────────────────────────────────── */}
                <Pressable
                    style={styles.signInBtn}
                    onPress={() => router.push('/login')}
                >
                    <Text style={styles.signInText}>Sign in</Text>
                </Pressable>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#081750' },

    col: {
        flex: 1,
        paddingHorizontal: 18, // Broadened cards and buttons to match Figma width
    },

    stack: {
        overflow: 'visible',
    },

    ct: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16, // Boosted for physical device readability
        lineHeight: 18,
    },
    cb: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-Regular',
        fontSize: 14, // Boosted for physical device readability
        lineHeight: 20,
    },

    // Progressive visual blur text shadow configurations
    blurTextSm: {
        color: 'rgba(230, 238, 255, 0.9)',
        textShadowColor: 'rgba(230, 238, 255, 0.65)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 1.5,
    },
    blurTextMd: {
        color: 'rgba(230, 238, 255, 0.65)',
        textShadowColor: 'rgba(230, 238, 255, 0.45)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3.5,
    },
    blurTextLg: {
        color: 'rgba(230, 238, 255, 0.6)',
        textShadowColor: 'rgba(230, 238, 255, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 4.0,
    },

    textBlock: {
        alignItems: 'center',
        paddingHorizontal: 22,
        zIndex: 20, // Ensure text overlays the overlapping Card 4
    },
    headline: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 30, // Boosted to pop beautifully on high-density screens
        lineHeight: 38,
        textAlign: 'center',
    },
    subtitle: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-Regular',
        fontSize: 20, // Boosted to pop beautifully on high-density screens
        lineHeight: 24,
        textAlign: 'center',
    },

    // Tall, rounded pill-shaped buttons
    signUpBtn: {
        height: 52,
        backgroundColor: '#E8ECFC',
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        color: '#1642E5',
        fontFamily: 'Manrope-Medium',
        fontSize: 20,
    },
    signInBtn: {
        height: 52,
        borderWidth: 1.5,
        borderColor: '#E8ECFC',
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        color: '#E8ECFC',
        fontFamily: 'Manrope-Medium',
        fontSize: 20,
    },
});
