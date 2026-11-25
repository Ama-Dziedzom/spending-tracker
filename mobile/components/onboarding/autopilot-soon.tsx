import React, { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { BAND, Button, Card, CategoryTile, Screen, Text, TopBar, useToast, type IconName } from '@/components/ui';
import { AuthLayout, CardLink } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { cur } from '@/lib/currency';
import { getShareSamples, setShareSamples } from '@/lib/review-service';

const WAYS: { icon: IconName; title: string; meta: string }[] = [
    { icon: 'paste', title: 'Paste an alert', meta: 'Copy the SMS, then tap Paste in LogIt' },
    { icon: 'plus', title: 'Add it by hand', meta: 'Tap + and type the amount. Takes seconds' },
];

/**
 * Autopilot · not in your country yet (Figma 1283:6671). Shown instead of the
 * Shortcuts / Android steps where LogIt can't read alerts yet: honest, short,
 * and points to what works today.
 */
export function AutopilotSoon({ inSettings }: { inSettings?: boolean }) {
    const { colors, shadows } = useTheme();
    const toast = useToast();
    const [samples, setSamples] = useState(false);
    const [asked, setAsked] = useState(false);
    useEffect(() => { getShareSamples().then(setSamples).catch(() => {}); }, []);

    const toggleSamples = async (on: boolean) => {
        setSamples(on);
        if (!(await setShareSamples(on))) {
            setSamples(!on);
            toast.show({ message: 'Couldn’t save that. Try again.', icon: 'alert' });
        }
    };

    const notifyMe = async () => {
        const { error } = await supabase.auth.updateUser({ data: { notify_when_alerts_ready: true } });
        if (error) { toast.show({ message: 'Couldn’t save that. Check your connection and try again.', icon: 'alert' }); return; }
        setAsked(true);
        toast.show({ message: `We’ll tell you when LogIt can read alerts in ${cur().name}` });
        if (!inSettings) router.replace('/spending');
    };

    const rows = (
        <View>
            {WAYS.map((w, i) => (
                <View key={w.title} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line.default }]}>
                    <CategoryTile tone="accent" icon={w.icon} size={30} />
                    <View style={{ flex: 1 }}>
                        <Text size={13} weight="semibold">{w.title}</Text>
                        <Text size={11} tone="secondary">{w.meta}</Text>
                    </View>
                </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line.default }}>
                <CategoryTile tone="accent" icon="shield" size={30} />
                <View style={{ flex: 1 }}>
                    <Text size={13} weight="semibold">Help LogIt learn your bank</Text>
                    <Text size={11} tone="secondary">Share alerts with names and numbers hidden</Text>
                </View>
                <Switch
                    value={samples}
                    onValueChange={toggleSamples}
                    trackColor={{ false: colors.bg.muted, true: colors.brand.accent }}
                    thumbColor={colors.brand['on-accent']}
                    ios_backgroundColor={colors.bg.muted}
                    accessibilityLabel="Help LogIt learn your bank"
                />
            </View>
        </View>
    );

    const subtitle = `LogIt reads Ghana alerts today. Until ${cur().name}’s are ready, these take seconds.`;

    if (inSettings) {
        return (
            <Screen band={BAND.autopilotSettings} header={<TopBar title="Autopilot" />} contentStyle={{ gap: 12 }}>
                <Text size={13} weight="semibold" tone="onBand" style={{ paddingHorizontal: 4 }}>{subtitle}</Text>
                <Card gap={0}>{rows}</Card>
                <Button
                    label={asked ? 'We’ll let you know' : 'Tell me when it’s ready'}
                    variant="secondary"
                    disabled={asked}
                    onPress={notifyMe}
                />
            </Screen>
        );
    }

    return (
        <AuthLayout
            title="Autopilot is coming"
            subtitle={subtitle}
            footer={
                <>
                    <Button label="Go to my money" size="xl" onPress={() => router.replace('/spending')} style={shadows.fab} />
                    <CardLink label="Tell me when it’s ready" onPress={notifyMe} />
                </>
            }
        >
            {rows}
        </AuthLayout>
    );
}
