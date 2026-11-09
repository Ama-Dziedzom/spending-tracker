import React, { useCallback, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Avatar, Button, CategoryTile, Dialog, Icon, ListGroup, ListRow, Screen, SegmentedControl, Text, TopBar, useToast,
    type IconName,
} from '@/components/ui';
import { useAppLock } from '@/components/app-lock';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { getProfile, lastAlertAt, setHideWidgetAmounts, type Profile } from '@/lib/settings-service';
import { getShareSamples, setShareSamples } from '@/lib/review-service';
import { getWallets } from '@/lib/wallet-service';
import { getExpectedIncome } from '@/lib/income-service';
import { getLimits } from '@/lib/limits';
import { formatPhone } from '@/lib/phone';
import { forgetPhone, signOutOnPurpose } from '@/lib/session';

const THEMES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
] as const;

/** 34 tile, 18 icon (Figma 1010:1698). */
const tile = (icon: IconName) => <CategoryTile tone="accent" icon={icon} size={34} />;

/**
 * Settings (Figma 1010:1661). Opened from your avatar on Spending. Profile up
 * top, then Money, Autopilot, App. Every row shows its value so you rarely
 * need to open it.
 */
export default function Settings() {
    const { colors, shadows, preference, setPreference } = useTheme();
    const toast = useToast();
    const lock = useAppLock();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [walletCount, setWalletCount] = useState<number | null>(null);
    const [expected, setExpected] = useState<string | null>(null);
    const [limitCount, setLimitCount] = useState<number | null>(null);
    const [autopilotOn, setAutopilotOn] = useState<boolean | null>(null);
    const [shareSamples, setShareSamplesState] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const logOut = async () => {
        setLogoutOpen(false);
        const { error } = await signOutOnPurpose();
        await forgetPhone();
        if (error) {
            toast.show({ message: 'Couldn’t log out. Try again.', icon: 'alert' });
            return;
        }
        router.replace('/welcome');
    };

    useFocusEffect(useCallback(() => {
        let live = true;
        (async () => {
            const [p, wallets, income, samples, last, androidOn, limits] = await Promise.all([
                getProfile(),
                getWallets().catch(() => []),
                getExpectedIncome().catch(() => []),
                getShareSamples().catch(() => false),
                lastAlertAt().catch(() => null),
                AsyncStorage.getItem('sms_auto_logging_enabled').catch(() => null),
                getLimits().catch(() => []),
            ]);
            if (!live) return;
            setProfile(p);
            setWalletCount(wallets.length);
            setExpected(income.length === 0 ? 'None' : income.length === 1 ? income[0].label : `${income.length} set`);
            setShareSamplesState(samples);
            setLimitCount(limits.length);
            // iPhone: on if an alert has come in through autopilot in the last two weeks.
            setAutopilotOn(Platform.OS === 'android' ? androidOn === 'true' : !!last && Date.now() - last.getTime() < 14 * 86_400_000);
        })();
        return () => { live = false; };
    }, []));

    const toggleSamples = async (on: boolean) => {
        setShareSamplesState(on);
        if (!(await setShareSamples(on))) {
            setShareSamplesState(!on);
            toast.show({ message: 'Couldn’t save that. Try again.', icon: 'alert' });
        }
    };

    const toggleLock = async (on: boolean) => {
        const ok = await lock.setEnabled(on);
        if (!ok && on) toast.show({ message: `Set up ${lock.method} in your phone’s settings first.`, icon: 'info' });
    };

    const toggleHideAmounts = async (on: boolean) => {
        if (!profile) return;
        const next = on ? { ...profile.hideWidgetAmounts, lock_screen: true } : { lock_screen: false, home_screen: false };
        setProfile({ ...profile, hideWidgetAmounts: next });
        try {
            await setHideWidgetAmounts(next);
        } catch (e) {
            setProfile(profile);
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save that.', icon: 'alert' });
        }
    };

    const hide = profile?.hideWidgetAmounts;
    const hideMeta = !hide ? undefined
        : hide.lock_screen && hide.home_screen ? 'On for the lock and home screen'
            : hide.lock_screen ? 'On for the lock screen'
                : hide.home_screen ? 'On for the home screen' : undefined;
    const notificationsOn = profile ? Object.values(profile.notifications).some(Boolean) : null;

    return (
        <>
        <Screen band={{ height: 500 }} header={<TopBar title="Settings" />} contentStyle={{ gap: 10 }}>
            <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel={`Profile, ${profile?.name ?? ''}`}
                style={{
                    backgroundColor: colors.bg.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
                    flexDirection: 'row', alignItems: 'center', gap: 14, ...shadows.card,
                }}
            >
                <Avatar choice={profile?.avatar} name={profile?.name} size={52} />
                <View style={{ flex: 1, gap: 2 }}>
                    <Text size={16} weight="bold">{profile?.name ?? ' '}</Text>
                    <Text size={13} tone="secondary">{profile?.phone ? formatPhone(profile.phone) : profile?.email ?? ' '}</Text>
                </View>
                <Icon name="next" size={18} color={colors.text.tertiary} />
            </Pressable>

            <ListGroup label="Money" labelOnBand>
                <ListRow dense leading={tile('wallet')} title="Wallets" value={walletCount === null ? '' : String(walletCount)} valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => router.push('/wallets')} />
                <ListRow dense leading={tile('receive')} title="Expected income" value={expected ?? ''} valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => router.push('/expected-income')} />
                <ListRow dense leading={tile('shield')} title="Limits" value={limitCount === null ? '' : limitCount === 0 ? 'None' : `${limitCount} set`} valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => router.push('/limits')} />
            </ListGroup>

            <ListGroup label="Autopilot" labelOnBand>
                <ListRow
                    dense
                    leading={tile('flash')}
                    title="Read my alerts"
                    value={autopilotOn === null ? '' : autopilotOn ? 'On' : 'Set up'}
                    valueStyle="setting"
                    valueTone={autopilotOn ? 'success' : 'secondary'}
                    trailing="chevron"
                    onPress={() => router.push('/sms-settings')}
                />
                <ListRow dense leading={tile('shield')} title="Help LogIt read more banks" toggle={{ value: shareSamples, onChange: toggleSamples }} />
            </ListGroup>

            <ListGroup label="App">
                <ListRow
                    dense
                    leading={tile('moon')}
                    title="Theme"
                    trailing={<SegmentedControl variant="pill" options={THEMES} value={preference} onChange={(v) => setPreference(v as ThemePreference)} />}
                />
                <ListRow dense leading={tile('bell')} title="Notifications" value={notificationsOn === null ? '' : notificationsOn ? 'On' : 'Off'} valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => router.push('/notification-settings')} />
                <ListRow dense leading={tile('lock')} title={`Lock with ${lock.method}`} toggle={{ value: lock.enabled, onChange: toggleLock }} />
                <ListRow
                    dense
                    leading={tile('shield')}
                    title="Hide amounts on widgets"
                    meta={hideMeta}
                    toggle={{ value: !!(hide?.lock_screen || hide?.home_screen), onChange: toggleHideAmounts }}
                />
            </ListGroup>

            <ListGroup>
                <ListRow dense leading={tile('help')} title="Help & privacy" trailing="chevron" onPress={() => router.push('/help')} />
            </ListGroup>

            {/* Stands apart from the settings: full-width, red-tinted, last on the page. */}
            <View style={{ marginTop: 8 }}>
                <Button label="Log out" icon="logout" variant="dangerSoft" size="lg" onPress={() => setLogoutOpen(true)} />
            </View>
        </Screen>
        <Dialog
            visible={logoutOpen}
            tone="neutral"
            icon="logout"
            title="Log out of LogIt?"
            body="Your transactions stay saved. Autopilot pauses until you log back in."
            confirmLabel="Log out"
            cancelLabel="Stay"
            stacked
            onCancel={() => setLogoutOpen(false)}
            onConfirm={logOut}
        />
        </>
    );
}
