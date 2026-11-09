import React, { useEffect } from 'react';
import { Modal, View } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AnimatedView } from '@/components/ui/animated-view';
import { BrandBand, Icon, Tap, Text } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

/**
 * Listening (Figma 1008:1680): full screen and calm. Your words appear as
 * you speak. Done sends; × cancels; the keyboard switches to typing.
 */
export function ListeningOverlay({ visible, words, onDone, onCancel, onType }: {
    visible: boolean;
    words: string;
    onDone: () => void;
    onCancel: () => void;
    onType: () => void;
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
            <View style={{ flex: 1, backgroundColor: colors.brand.band }}>
                <StatusBar style="light" />
                <BrandBand full />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 28 }}>
                    <View style={{ width: 176, height: 176, borderRadius: 999, backgroundColor: RAW.onInverseFill, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 128, height: 128, borderRadius: 999, backgroundColor: RAW.onBandFill, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ width: 76, height: 76, borderRadius: 999, backgroundColor: RAW.onBand, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="mic" size={32} color={colors.brand.accent} />
                            </View>
                        </View>
                    </View>
                    <Wave />
                    <View style={{ alignItems: 'center', gap: 10 }} accessibilityLiveRegion="polite">
                        <Text size={12} weight="semibold" style={{ color: RAW.onBandTertiary }}>Listening…</Text>
                        <Text size={20} weight="bold" tone="onBand" align="center" style={{ lineHeight: 27, minHeight: 54 }}>
                            {words ? `“${words}”` : 'Ask about your money'}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: insets.bottom + 40 }}>
                    <Round icon="keyboard" label="Type instead" onPress={onType} />
                    <Tap
                        onPress={onDone}
                        accessibilityRole="button"
                        accessibilityLabel="Done, send question"
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 22, borderRadius: 999, backgroundColor: RAW.onBand, opacity: pressed ? 0.85 : 1 })}
                    >
                        <Icon name="stop" size={16} color={colors.brand.accent} />
                        <Text size={15} weight="bold" style={{ color: colors.brand.accent }}>Done</Text>
                    </Tap>
                    <Round icon="close" label="Cancel" onPress={onCancel} />
                </View>
            </View>
        </Modal>
    );
}

function Round({ icon, label, onPress }: { icon: 'keyboard' | 'close'; label: string; onPress: () => void }) {
    return (
        <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: RAW.onBandFill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={20} color={RAW.onBand} />
        </Tap>
    );
}

/** A quiet waveform: white bars breathing at different speeds. */
function Wave() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 34 }} accessibilityElementsHidden>
            {[10, 18, 26, 14, 30, 20, 12, 24, 16, 28, 12, 18].map((h, i) => <Bar key={i} base={h} delay={i * 70} />)}
        </View>
    );
}

function Bar({ base, delay }: { base: number; delay: number }) {
    const s = useSharedValue(0.5);
    useEffect(() => {
        s.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }), withTiming(0.4, { duration: 420, easing: Easing.inOut(Easing.ease) })), -1, true));
    }, [s, delay]);
    const style = useAnimatedStyle(() => ({ height: base * s.value }));
    return <AnimatedView style={[{ width: 4, borderRadius: 2, backgroundColor: RAW.onBand, opacity: 0.85 }, style]} />;
}
