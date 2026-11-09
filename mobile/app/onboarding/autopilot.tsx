import React from 'react';
import { Linking, PermissionsAndroid, Platform, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, CategoryTile, Text, useToast, type IconName } from '@/components/ui';
import { AuthLayout, CardLink } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { getSession } from '@/lib/supabase';
import { syncSessionToAppGroup } from '@/lib/shareSync';

const IOS_STEPS: { title: string; meta: string }[] = [
    { title: 'Open Shortcuts › Automation › New', meta: 'Tap + at the top' },
    { title: 'Choose Message', meta: 'When I get a message' },
    { title: 'Message contains GHS', meta: 'Type GHS, nothing else' },
    { title: 'Run Immediately', meta: 'And turn off Notify When Run' },
    { title: 'Add LogIt › Log Message', meta: 'Messages = Shortcut Input' },
];

const ANDROID_POINTS: { icon: IconName; title: string; meta: string }[] = [
    { icon: 'shield', title: 'Only money alerts', meta: 'From MoMo and banks. Chats are ignored.' },
    { icon: 'lock', title: 'Stays in your account', meta: 'Only you can see your transactions.' },
    { icon: 'flash', title: 'Logs in the background', meta: 'Even when LogIt is closed.' },
];

/**
 * Autopilot · iPhone (Figma 1001:217): apps can't create automations, so the
 * steps are short, numbered and one tap from Shortcuts.
 * Autopilot · Android (1001:369): explains the permission before Android
 * asks, so the system prompt isn't a surprise.
 */
export default function OnboardingAutopilot() {
    const { colors, shadows } = useTheme();
    const toast = useToast();

    if (Platform.OS === 'android') {
        const allow = async () => {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS).catch(() => PermissionsAndroid.RESULTS.DENIED);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                toast.show({ message: 'No problem. You can turn it on later in Settings › Autopilot.', icon: 'info' });
                router.replace('/(tabs)');
                return;
            }
            await AsyncStorage.setItem('sms_auto_logging_enabled', 'true');
            const session = await getSession();
            if (session) syncSessionToAppGroup(session, null);
            router.push('/onboarding/test');
        };
        return (
            <AuthLayout
                title="Let LogIt read money alerts"
                subtitle="On Android this is one switch."
                footer={
                    <>
                        <Button label="Allow" size="xl" onPress={allow} style={shadows.fab} />
                        <CardLink label="Not now" onPress={() => router.replace('/(tabs)')} />
                    </>
                }
            >
                <View style={{ gap: 14 }}>
                    {ANDROID_POINTS.map((p) => (
                        <View key={p.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <CategoryTile tone="accent" icon={p.icon} size={30} />
                            <View style={{ flex: 1 }}>
                                <Text size={13} weight="semibold">{p.title}</Text>
                                <Text size={11} tone="secondary">{p.meta}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Set up autopilot"
            subtitle="About a minute in the Shortcuts app."
            footer={
                <>
                    <Button label="Open Shortcuts" size="xl" onPress={() => Linking.openURL('shortcuts://').catch(() => {})} style={shadows.fab} />
                    <CardLink label="I’ve done it" onPress={() => router.push('/onboarding/test')} />
                </>
            }
        >
            <View>
                {IOS_STEPS.map((s, i) => (
                    <View
                        key={s.title}
                        style={[
                            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
                            i > 0 && { borderTopWidth: 1, borderTopColor: colors.line.default },
                        ]}
                    >
                        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: colors.bg.muted, alignItems: 'center', justifyContent: 'center' }}>
                            <Text size={11} weight="bold" tone="secondary">{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text size={13} weight="semibold">{s.title}</Text>
                            <Text size={11} tone="secondary">{s.meta}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </AuthLayout>
    );
}
