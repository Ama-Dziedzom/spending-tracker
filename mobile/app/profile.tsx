import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
    Avatar, CategoryTile, Dialog, Icon, ListGroup, ListRow, Screen, Tap, Text, TopBar, useToast, type AvatarChoice,
} from '@/components/ui';
import { AvatarPickerSheet } from '@/components/settings/avatar-picker-sheet';
import { TextEditSheet } from '@/components/settings/text-edit-sheet';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { getProfile, setName, setRecoveryEmail, type Profile } from '@/lib/settings-service';
import { formatPhone } from '@/lib/phone';
import { RAW } from '@/constants/theme';

/**
 * Profile (Figma 1010:1802). Phone is the account, so it's shown as verified
 * and leads to Change phone. Email is optional, for recovery.
 */
export default function ProfileScreen() {
    const { colors, shadows } = useTheme();
    const toast = useToast();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const [edit, setEdit] = useState<'name' | 'email' | null>(null);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const load = useCallback(() => { getProfile().then(setProfile).catch(() => {}); }, []);
    useFocusEffect(load);

    const logOut = async () => {
        setLogoutOpen(false);
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.show({ message: 'Couldn’t log out. Try again.', icon: 'alert' });
            return;
        }
        router.replace('/welcome');
    };

    const p = profile;
    const tile = (icon: 'user' | 'airtime' | 'mail') => <CategoryTile tone="accent" icon={icon} size={34} />;

    return (
        <>
            <Screen header={<TopBar title="Profile" />} contentStyle={{ gap: 12 }}>
                <View style={{ alignItems: 'center', marginBottom: 6 }}>
                    <Avatar choice={p?.avatar} name={p?.name} size={72} />
                    <Tap
                        onPress={() => setAvatarOpen(true)}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                            marginTop: -10, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44,
                            paddingHorizontal: 14, borderRadius: 999, backgroundColor: RAW.onBand, opacity: pressed ? 0.85 : 1, ...shadows.small,
                        })}
                    >
                        <Icon name="edit" size={14} color={colors.brand.accent} />
                        <Text size={13} weight="bold" style={{ color: colors.brand.accent }}>Change avatar</Text>
                    </Tap>
                </View>

                <ListGroup label="You" labelOnBand>
                    <ListRow dense leading={tile('user')} title="Name" value={p?.name ?? 'Add your name'} valueStyle="setting" valueTone="secondary" trailing="chevron" onPress={() => setEdit('name')} />
                    <ListRow
                        dense
                        leading={tile('airtime')}
                        title="Phone"
                        meta={p?.phone ? 'Verified' : undefined}
                        value={p?.phone ? formatPhone(p.phone) : 'Add your phone'}
                        valueStyle="setting"
                        valueTone="secondary"
                        trailing="chevron"
                        onPress={() => router.push('/add-phone')}
                    />
                    <ListRow
                        dense
                        leading={tile('mail')}
                        title="Email"
                        meta={p?.email && !p.emailConfirmed ? 'Check your inbox to confirm' : undefined}
                        value={p?.email ?? 'Add for recovery'}
                        valueStyle="setting"
                        valueTone={p?.email ? 'secondary' : 'accent'}
                        trailing="chevron"
                        onPress={() => setEdit('email')}
                    />
                </ListGroup>

                <ListGroup>
                    <ListRow dense title="Log out" onPress={() => setLogoutOpen(true)} />
                    <Tap onPress={() => router.push('/delete-account')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingVertical: 9 }}>
                        <Text variant="row" tone="danger">Delete account and data</Text>
                    </Tap>
                </ListGroup>
            </Screen>

            <AvatarPickerSheet
                visible={avatarOpen}
                current={p?.avatar ?? 'initials'}
                name={p?.name ?? null}
                onClose={() => setAvatarOpen(false)}
                onSaved={(a: AvatarChoice) => { if (p) setProfile({ ...p, avatar: a }); toast.show({ message: 'Avatar updated' }); }}
            />
            <TextEditSheet
                visible={edit === 'name'}
                title="Your name"
                label="Name"
                initial={p?.name ?? ''}
                placeholder="Ama Barnor"
                validate={(v) => (v.length < 2 ? 'Add the name you’d like to be greeted by.' : null)}
                onSave={async (v) => { await setName(v); if (p) setProfile({ ...p, name: v }); toast.show({ message: 'Name updated' }); }}
                onClose={() => setEdit(null)}
            />
            <TextEditSheet
                visible={edit === 'email'}
                title="Email for recovery"
                subtitle="If you ever lose your number, you can get back in with this. We’ll send a link to confirm it."
                label="Email"
                initial={p?.email ?? ''}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                saveLabel="Send link"
                validate={(v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Use a full email address, like ama@gmail.com.')}
                onSave={async (v) => { await setRecoveryEmail(v); toast.show({ message: 'Link sent · check your inbox' }); load(); }}
                onClose={() => setEdit(null)}
            />
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
