import React from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateScreen } from '@/components/system/state-screen';
import { Icon, Text, type IconName } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { requestLogNotifications } from '@/lib/pending-sms';

export const NOTIFICATIONS_ASKED = 'logit.notificationsAsked';

/**
 * Allow notifications (Figma 1016:2297). Asked after the first alert is
 * logged, not at sign-up, and shows exactly what they'll get before the
 * system asks.
 */
export default function AllowNotifications() {
    const done = async () => {
        await AsyncStorage.setItem(NOTIFICATIONS_ASKED, 'true').catch(() => {});
        if (router.canGoBack()) router.back();
        else router.replace('/spending');
    };

    const allow = async () => {
        if (Platform.OS === 'ios') {
            await requestLogNotifications();
        } else if (Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as never).catch(() => null);
        }
        done();
    };

    return (
        <StateScreen
            tone="band"
            preview={
                <>
                    <SampleToast icon="flash" text="Spent GHS 10 on airtime · MTN MoMo" />
                    <SampleToast icon="receive" text="Salary in · GHS 3,000 · StanChart" faded />
                </>
            }
            title="Know the moment it’s logged"
            body="One short line per alert, and a Sunday summary. Turn any of them off in Settings."
            primary={{ label: 'Allow notifications', onPress: allow }}
            secondary={{ label: 'Not now', onPress: done }}
        />
    );
}

/** The notification as it will look: an ink toast (Figma 1016:2316). */
function SampleToast({ icon, text, faded }: { icon: IconName; text: string; faded?: boolean }) {
    const { colors, shadows } = useTheme();
    return (
        <View
            accessibilityElementsHidden={faded}
            style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 14, paddingVertical: 12,
                borderRadius: 18, backgroundColor: colors.bg.inverse, opacity: faded ? 0.6 : 1, ...shadows.toast,
            }}
        >
            <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: RAW.onInverseFill, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={16} color={colors.text['on-inverse']} />
            </View>
            <Text size={13} weight="semibold" tone="onInverse" style={{ flex: 1 }}>{text}</Text>
        </View>
    );
}
