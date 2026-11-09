import React, { useEffect, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
    Button, Card, CategoryTile, Icon, ListGroup, ListRow, Screen, Sheet, Text, TopBar, useToast, type IconName,
} from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { getSession } from '@/lib/supabase';
import { syncSessionToAppGroup } from '@/lib/shareSync';
import { getShareSamples, setShareSamples } from '@/lib/review-service';
import { lastAlertAt } from '@/lib/settings-service';
import { ago } from '@/lib/format';

const tile = (icon: IconName) => <CategoryTile tone="accent" icon={icon} size={34} />;

// Bold parts sit at odd indexes
const IOS_AUTOPILOT_STEPS: string[][] = [
    ['Open ', 'Shortcuts', ', go to ', 'Automation', ' and tap ', '+', '.'],
    ['Choose ', 'Message', '. Under Message Contains, type ', 'GHS', '. Leave Sender empty.'],
    ['Choose ', 'Run Immediately', ' if you see it, then tap ', 'Next', '.'],
    ['Add the action ', 'Log Message', ' from LogIt. Set Messages to ', 'Shortcut Input', ' and turn off ', 'Show When Run', '. LogIt sends its own notification.'],
    ['Tap ', 'Done', '. From now on, MoMo and bank alerts log themselves as they arrive.', ''],
];

const SMS_KEY = 'sms_auto_logging_enabled';

/**
 * Autopilot (Figma 1010:1870). Status first, in plain words, with the last
 * time it worked. Opt-in learning explained in one sentence.
 */
export default function Autopilot() {
    const { colors } = useTheme();
    const toast = useToast();
    const [last, setLast] = useState<Date | null | undefined>(undefined);
    const [signedIn, setSignedIn] = useState<boolean | null>(null);
    const [androidOn, setAndroidOn] = useState(false);
    const [samples, setSamples] = useState(false);
    const [stepsOpen, setStepsOpen] = useState(false);

    useEffect(() => {
        (async () => {
            const session = await getSession();
            setSignedIn(!!session);
            setAndroidOn((await AsyncStorage.getItem(SMS_KEY)) === 'true');
            if (session) {
                getShareSamples().then(setSamples).catch(() => {});
                setLast(await lastAlertAt().catch(() => null));
            } else {
                setLast(null);
            }
        })();
    }, []);

    const ios = Platform.OS === 'ios';
    // iPhone can't tell LogIt whether the automation exists; an alert in the last two weeks means it works.
    const on = ios ? !!last && Date.now() - last.getTime() < 14 * 86_400_000 : androidOn;

    const toggleAndroid = async (value: boolean) => {
        if (value) {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, {
                title: 'Let LogIt read money alerts',
                message: 'LogIt reads MoMo and bank alerts as they arrive and logs them for you. Other messages are ignored.',
                buttonPositive: 'Continue',
                buttonNegative: 'Not now',
            }).catch(() => PermissionsAndroid.RESULTS.DENIED);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                toast.show({ message: 'Allow SMS in Settings › Apps › LogIt › Permissions to turn this on.', icon: 'info' });
                return;
            }
            await AsyncStorage.setItem(SMS_KEY, 'true');
            setAndroidOn(true);
            const session = await getSession();
            if (session) syncSessionToAppGroup(session, null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
            await AsyncStorage.setItem(SMS_KEY, 'false');
            setAndroidOn(false);
        }
    };

    const toggleSamples = async (value: boolean) => {
        setSamples(value);
        if (!(await setShareSamples(value))) {
            setSamples(!value);
            toast.show({ message: 'Couldn’t save that. Try again.', icon: 'alert' });
        }
    };

    const status = signedIn === false
        ? { title: 'Autopilot is paused', meta: 'Log in again and it picks up where it left off.' }
        : on
            ? { title: 'Autopilot is on', meta: last ? `Last alert logged ${ago(last)}` : 'Waiting for your first alert' }
            : { title: 'Autopilot is off', meta: ios ? 'Set up the Shortcuts automation below.' : 'Turn on Read SMS alerts below.' };

    return (
        <>
            <Screen header={<TopBar title="Autopilot" />} contentStyle={{ gap: 12 }}>
                <Card gap={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                    <CategoryTile tone={on ? 'success' : 'warn'} icon="flash" size={34} />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text size={15} weight="bold">{last === undefined ? ' ' : status.title}</Text>
                        <Text variant="meta" tone="secondary">{last === undefined ? ' ' : status.meta}</Text>
                    </View>
                </Card>

                {ios ? (
                    <ListGroup label="iPhone" labelOnBand>
                        <ListRow dense leading={tile('settings')} title="Shortcuts automation" value={on ? 'Steps' : 'Set up'} valueStyle="setting" valueTone="accent" trailing="chevron" onPress={() => setStepsOpen(true)} />
                        <ListRow dense leading={tile('paste')} title="Send a test" meta="Paste an alert and see what LogIt reads" trailing="chevron" onPress={() => router.push('/paste')} />
                    </ListGroup>
                ) : (
                    <ListGroup label="Android" labelOnBand>
                        <ListRow dense leading={tile('message')} title="Read SMS alerts" meta="Logs in the background as they arrive" toggle={{ value: androidOn, onChange: toggleAndroid }} />
                        <ListRow dense leading={tile('paste')} title="Send a test" meta="Paste an alert and see what LogIt reads" trailing="chevron" onPress={() => router.push('/paste')} />
                    </ListGroup>
                )}

                <ListGroup label="Learning">
                    <ListRow
                        dense
                        leading={tile('shield')}
                        title="Help LogIt read more banks"
                        meta="Share the wording of messages LogIt can’t read, with every amount, name and number removed."
                        toggle={{ value: samples, onChange: toggleSamples }}
                    />
                </ListGroup>

                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                    <Icon name="lock" size={14} color={colors.text.tertiary} />
                    <Text variant="meta" tone="tertiary" style={{ flex: 1 }}>
                        LogIt only reads bank and MoMo alerts. Chats that mention money are ignored, and only you can see your transactions.
                    </Text>
                </View>
            </Screen>

            <Sheet
                visible={stepsOpen}
                onClose={() => setStepsOpen(false)}
                title="Set up autopilot"
                subtitle="Once, in the Shortcuts app. Takes about a minute."
                footer={<Button label="Open Shortcuts" onPress={() => Linking.openURL('shortcuts://').catch(() => {})} />}
            >
                {IOS_AUTOPILOT_STEPS.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: colors.bg.muted, alignItems: 'center', justifyContent: 'center' }}>
                            <Text size={13} weight="bold">{i + 1}</Text>
                        </View>
                        <Text tone="secondary" style={{ flex: 1 }}>
                            {step.map((part, j) => (j % 2 === 1 ? <Text key={j} weight="bold">{part}</Text> : part))}
                        </Text>
                    </View>
                ))}
            </Sheet>
        </>
    );
}
