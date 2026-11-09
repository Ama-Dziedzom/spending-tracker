import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Text, useToast, type AvatarChoice } from '@/components/ui';
import { AuthLayout, CardLink } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { setAvatar } from '@/lib/settings-service';

const CHOICES: { value: AvatarChoice; label: string }[] = [
    { value: 'initials', label: 'Initials' },
    { value: 'illustration_1', label: 'Avatar 1' },
    { value: 'illustration_2', label: 'Avatar 2' },
];

/**
 * Pick your look (Figma 1001:97). Three choices, Initials preselected.
 * Saved as a choice (user_metadata.avatar), never as gender.
 */
export default function PickAvatar() {
    const { colors, shadows } = useTheme();
    const toast = useToast();
    const [name, setName] = useState<string | null>(null);
    const [choice, setChoice] = useState<AvatarChoice>('initials');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setName((data.user?.user_metadata?.full_name as string | undefined) ?? null));
    }, []);

    const next = () => router.replace('/success');

    const save = async () => {
        setBusy(true);
        try {
            await setAvatar(choice);
            next();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save that.', icon: 'alert' });
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            back={false}
            title="Pick your look"
            subtitle="It shows on your home screen. Change it any time."
            footer={
                <>
                    <Button label="Continue" size="xl" busy={busy} onPress={save} style={shadows.fab} />
                    <CardLink label="Skip for now" onPress={next} />
                </>
            }
        >
            <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
                {CHOICES.map((c) => {
                    const active = c.value === choice;
                    return (
                        <Pressable
                            key={c.value}
                            onPress={() => setChoice(c.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={c.label}
                            style={{
                                flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, borderWidth: 2,
                                borderColor: active ? colors.brand.accent : colors.line.default,
                                backgroundColor: active ? colors.brand['accent-tint'] : colors.bg.surface,
                            }}
                        >
                            <Avatar choice={c.value} name={name} size={56} />
                            <Text size={12} weight={active ? 'bold' : 'semibold'} tone={active ? 'accent' : 'secondary'}>{c.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            <Text size={12} tone="tertiary" align="center">LogIt never guesses this from your name. You choose, or skip.</Text>
        </AuthLayout>
    );
}
