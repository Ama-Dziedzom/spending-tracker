import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Icon, Spinner, Tap, Text, useToast } from '@/components/ui';
import { AuthLayout, BandHero, CardLink } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const TEST_TEXT = 'LogIt test: GHS 1.00';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Autopilot · test (Figma 1001:281) and · it works (1001:327). A live check:
 * the screen flips to "it works" the moment the test lands. The API records
 * tests apart from transactions (reason 'autopilot_test'), so they never
 * count toward spending.
 */
export default function AutopilotTest() {
    const { colors, shadows } = useTheme();
    const toast = useToast();
    const startedAt = useRef(new Date());
    const sentAt = useRef<number | null>(null);
    const [landedIn, setLandedIn] = useState<number | null>(null);
    const [phone, setPhone] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setPhone(data.user?.phone ? `+${data.user.phone.replace(/^\+/, '')}` : null));
    }, []);

    // Look for the test every 2 seconds until it arrives.
    useEffect(() => {
        if (landedIn !== null) return;
        const t = setInterval(async () => {
            const { data } = await supabase
                .from('failed_parses')
                .select('created_at')
                .eq('reason', 'autopilot_test')
                .gte('created_at', startedAt.current.toISOString())
                .order('created_at', { ascending: false })
                .limit(1);
            const at = data?.[0]?.created_at;
            if (at) {
                const from = sentAt.current ?? startedAt.current.getTime();
                setLandedIn(Math.max(1, Math.round((new Date(at).getTime() - from) / 1000)));
            }
        }, 2000);
        return () => clearInterval(t);
    }, [landedIn]);

    const copy = async () => {
        try {
            // Lazy so an app built before expo-clipboard was added doesn't crash.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
            await Clipboard.setStringAsync(TEST_TEXT);
            toast.show({ message: 'Copied' });
        } catch {
            toast.show({ message: `Type “${TEST_TEXT}” in Messages instead.`, icon: 'info' });
        }
    };

    const openMessages = async () => {
        sentAt.current = Date.now();
        const body = encodeURIComponent(TEST_TEXT);
        // Text yourself: your own number, with the test already written.
        const url = Platform.OS === 'ios' ? `sms:${phone ?? ''}&body=${body}` : `sms:${phone ?? ''}?body=${body}`;
        Linking.openURL(url).catch(() => toast.show({ message: 'Open Messages and text the line above to yourself.', icon: 'info' }));
    };

    if (landedIn !== null) {
        return (
            <AuthLayout
                back={false}
                cardTop={400}
                hero={<BandHero icon="flash" title="Autopilot is on" subtitle={`Your test was logged in ${landedIn} ${landedIn === 1 ? 'second' : 'seconds'}`} />}
                footer={<Button label="Go to my money" size="xl" onPress={() => router.replace('/(tabs)')} style={shadows.fab} />}
            >
                <Text size={11} weight="bold" tone="secondary">Just logged</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg.muted, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Icon name="tick" size={18} color={colors.brand['accent-text']} />
                    <View style={{ flex: 1 }}>
                        <Text size={13} weight="semibold">Test message</Text>
                        <Text size={11} tone="secondary">Not counted · just now</Text>
                    </View>
                    <Text size={13} weight="semibold">1.00</Text>
                </View>
                <Text size={13} tone="secondary">From now on, every MoMo and bank alert lands here by itself.</Text>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Send a quick test"
            subtitle="Text this to yourself in Messages."
            footer={
                <>
                    <Button label="Open Messages" size="xl" onPress={openMessages} style={shadows.fab} />
                    <CardLink label="Skip test" onPress={() => router.replace('/(tabs)')} />
                </>
            }
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.muted, borderRadius: 16, paddingLeft: 14, paddingRight: 8, minHeight: 52 }}>
                <Text selectable style={{ flex: 1, fontFamily: MONO, fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{TEST_TEXT}</Text>
                <Tap
                    onPress={copy}
                    accessibilityRole="button"
                    accessibilityLabel="Copy test message"
                    style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 10, borderRadius: 999,
                        backgroundColor: colors.bg.surface, opacity: pressed ? 0.8 : 1,
                    })}
                    hitSlop={4}
                >
                    <Icon name="copy" size={14} color={colors.brand['accent-text']} />
                    <Text size={12} weight="bold" tone="accent">Copy</Text>
                </Tap>
            </View>
            <Text size={12} tone="secondary">Tests never count toward your spending.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.brand['accent-tint'], borderRadius: 16, paddingHorizontal: 16, minHeight: 48 }} accessibilityLiveRegion="polite">
                <Spinner size={18} />
                <Text size={13} weight="semibold" tone="accent">Waiting for your test…</Text>
            </View>
        </AuthLayout>
    );
}
