import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, CategoryTile, Text, type IconName } from '@/components/ui';
import { AuthLayout, BandHero, CardLink } from '@/components/onboarding/auth-layout';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const POINTS: { icon: IconName; text: string }[] = [
    { icon: 'flash', text: 'Logs MoMo and bank alerts by itself' },
    { icon: 'shield', text: 'Only money alerts, never your chats' },
    { icon: 'wifiOff', text: 'Works offline and catches up later' },
];

/**
 * You're in (Figma 1001:158). Celebrate briefly, then the one setup that
 * matters. Skippable, but it's the main path.
 */
export default function YoureIn() {
    const { shadows } = useTheme();
    const [first, setFirst] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            const full = (data.user?.user_metadata?.full_name as string | undefined) ?? '';
            setFirst(full.trim().split(/\s+/)[0] || null);
        });
    }, []);

    return (
        <AuthLayout
            back={false}
            cardTop={370}
            hero={<BandHero icon="tick" title={first ? `You’re in, ${first}` : 'You’re in'} />}
            footer={
                <>
                    <Button label="Turn on autopilot" icon="flash" size="xl" onPress={() => router.push('/onboarding/autopilot')} style={shadows.fab} />
                    <CardLink label="Later" onPress={() => router.replace('/spending')} />
                </>
            }
        >
            <View style={{ gap: 8 }}>
                <Text variant="cardTitle">One last thing</Text>
                <Text size={14} tone="secondary">Let LogIt read your money alerts and it logs everything for you. You never type a transaction.</Text>
            </View>
            <View style={{ gap: 12 }}>
                {POINTS.map((p) => (
                    <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <CategoryTile tone="accent" icon={p.icon} size={28} />
                        <Text size={13} weight="semibold" style={{ flex: 1 }}>{p.text}</Text>
                    </View>
                ))}
            </View>
        </AuthLayout>
    );
}
