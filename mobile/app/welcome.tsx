import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBand, Button, CategoryTile, Icon, Text } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Welcome (Figma 1000:58): the story in one picture (an alert arrives,
 * LogIt turns it into an entry), then two ways in.
 */
export default function Welcome() {
    const router = useRouter();
    const { colors, shadows } = useTheme();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();

    // Figma: story starts at 110 and the card at 520 on an 844 frame (card is 324 tall).
    const storyTop = Math.max(insets.top + 16, (110 / 844) * height);
    const cardHeight = Math.max(324, (324 / 844) * height);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
            <StatusBar style="light" />
            <BrandBand height={700} />

            <View style={{ position: 'absolute', top: storyTop, left: 24, right: 24, gap: 12 }} accessible accessibilityLabel="An alert from Mobile Money becomes an entry in LogIt: Akosua Mensah, 120.00">
                <View
                    style={{
                        backgroundColor: RAW.onBandBubble, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
                        borderTopLeftRadius: 6, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
                    }}
                >
                    <Text size={11} weight="bold" style={{ color: RAW.onBandBubbleLabel }}>MobileMoney</Text>
                    <Text style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18, color: RAW.onBandBubbleText }}>
                        Payment of GHS 120.00 to AKOSUA MENSAH. Current Balance: GHS 26.83
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Icon name="down" size={22} color={RAW.onBand} />
                </View>
                <View
                    style={{
                        backgroundColor: colors.bg.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.card,
                    }}
                >
                    <CategoryTile tone="people" initials="AM" size={40} />
                    <View style={{ flex: 1, gap: 1 }}>
                        <Text variant="row">Akosua Mensah</Text>
                        <Text variant="meta" tone="secondary">MTN MoMo · just now</Text>
                    </View>
                    <Text size={15} weight="semibold">120.00</Text>
                </View>
            </View>

            <View
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: cardHeight,
                    backgroundColor: colors.bg.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36,
                    paddingTop: 28, paddingHorizontal: 24, paddingBottom: Math.max(34, insets.bottom + 12), gap: 18,
                }}
            >
                <Text weight="extrabold" size={30} style={{ letterSpacing: -0.9 }} accessibilityRole="header">Your money, sorted.</Text>
                <Text size={15} tone="secondary">LogIt reads your MoMo and bank alerts and keeps track for you.</Text>
                <View style={{ flex: 1 }} />
                <View style={{ gap: 10 }}>
                    <Button label="Create account" size="xl" onPress={() => router.push('/signup')} style={shadows.fab} />
                    <Button label="I already have an account" size="xl" variant="ghost" onPress={() => router.push('/login')} />
                </View>
            </View>
        </View>
    );
}
