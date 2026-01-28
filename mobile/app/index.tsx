import { View, Text, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutLeft,
    useAnimatedStyle,
    withSpring
} from 'react-native-reanimated';
import { ArrowUpRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const AnimatedText = Animated.Text as any;
const AnimatedView = Animated.View as any;

const { width } = Dimensions.get('window');

const SCREENS = [
    {
        lines: ["clear.", "personal.", "finance."],
    },
    {
        lines: ["finance.", "without.", "friction."],
    },
    {
        lines: ["instant.", "financial.", "clarity."],
    }
];

export default function OnboardingSplash() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentScreen, setCurrentScreen] = useState(0);
    const [checkingAuth, setCheckingAuth] = useState(true);

    React.useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/(tabs)');
                return;
            }
        } catch (e) {
            console.error('Auth check error', e);
        } finally {
            setCheckingAuth(false);
        }
    };

    React.useEffect(() => {
        if (checkingAuth) return;

        const timer = setInterval(() => {
            setCurrentScreen((prev) => {
                if (prev < SCREENS.length - 1) {
                    return prev + 1;
                }
                clearInterval(timer);
                return prev;
            });
        }, 2500); // 2.5 seconds per screen

        return () => clearInterval(timer);
    }, [checkingAuth]);

    if (checkingAuth) {
        return <View className="flex-1 bg-[#0F4CFF]" />;
    }

    const handleNext = () => {
        if (currentScreen < SCREENS.length - 1) {
            setCurrentScreen(prev => prev + 1);
        } else {
            router.push('/onboarding-choice');
        }
    };

    const handleSkip = () => {
        router.push('/onboarding-choice');
    };

    return (
        <View className="flex-1 bg-[#0F4CFF]">
            {/* Background Decorative Shapes - matching image panels */}
            <View className="absolute top-0 right-0 w-full h-[75%]">
                <View
                    style={{ borderBottomLeftRadius: 130 }}
                    className="absolute top-0 right-0 w-[48%] h-[65%] bg-white/10"
                />
                <View
                    style={{ borderBottomLeftRadius: 140 }}
                    className="absolute top-0 right-0 w-[45%] h-[58%] bg-white/15"
                />
                <View
                    style={{ borderBottomLeftRadius: 150 }}
                    className="absolute top-0 right-0 w-[42%] h-[52%] bg-white/20"
                />
            </View>

            {/* Skip Button */}
            <View
                className="absolute top-0 right-0 z-10 flex-row items-center"
                style={{ paddingTop: insets.top + 24, paddingRight: 24 }}
            >
                <Pressable onPress={() => router.push('/login')} className="mr-6">
                    <Text className="text-white font-heading text-[20px]">Log in</Text>
                </Pressable>
                <Pressable onPress={handleSkip}>
                    <Text className="text-white/60 font-body text-[20px]">Skip</Text>
                </Pressable>
            </View>

            <Pressable
                className="flex-1 p-8 justify-end"
                onPress={handleNext}
            >
                {/* Text Content */}
                <View className="mb-10 px-2">
                    {SCREENS[currentScreen]?.lines?.map((line, idx) => (
                        <AnimatedText
                            key={`${currentScreen}-${idx}`}
                            entering={FadeIn.duration(400).delay(idx * 100)}
                            exiting={FadeOut.duration(200)}
                            className="text-[64px] text-white font-heading tracking-tighter leading-[1.05]"
                        >
                            {line}
                        </AnimatedText>
                    ))}
                </View>

                {/* Footer Component */}
                <View
                    className="px-2"
                    style={{ marginBottom: insets.bottom + 8 }}
                >
                    {/* Progress Dashes - Full width */}
                    <View className="flex-row gap-4 items-center mb-6">
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                className={`h-[2px] flex-1 rounded-full ${i === currentScreen ? 'bg-white' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </View>

                    {/* Get Started Button (Page 3 only) - Underneath lines */}
                    <View className="h-10">
                        {currentScreen === 2 && (
                            <AnimatedView
                                entering={FadeIn.duration(400)}
                                className="flex-row justify-end"
                            >
                                <Pressable
                                    className="flex-row items-center gap-2"
                                    onPress={() => router.push('/signup')}
                                >
                                    <Text className="text-white font-body text-[24px]">Get started</Text>
                                    <ArrowUpRight size={24} color="white" />
                                </Pressable>
                            </AnimatedView>
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    );
}
