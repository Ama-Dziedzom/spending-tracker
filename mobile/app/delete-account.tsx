import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, CategoryTile, Icon, Screen, Tap, Text, TopBar, useToast } from '@/components/ui';
import { FONT } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { accountCounts, deleteAccount, exportTransactions } from '@/lib/settings-service';

/**
 * Delete account (Figma 1013:2101). Counts what will go, offers export, then
 * a typed confirm. The button stays disabled until it matches.
 */
export default function DeleteAccount() {
    const { colors } = useTheme();
    const toast = useToast();
    const [counts, setCounts] = useState<{ transactions: number; wallets: number; expected: number } | null>(null);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { accountCounts().then(setCounts).catch(() => {}); }, []);

    const matches = typed.trim().toUpperCase() === 'DELETE';

    const remove = async () => {
        if (!matches || busy) return;
        setBusy(true);
        try {
            await deleteAccount();
            toast.show({ message: 'Your account and data are deleted.' });
            router.replace('/welcome');
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t delete your account. Try again.', icon: 'alert' });
            setBusy(false);
        }
    };

    const items = [
        counts ? `All ${counts.transactions.toLocaleString('en-US')} transactions and transfers` : 'All your transactions and transfers',
        counts ? `Your ${counts.wallets} ${counts.wallets === 1 ? 'wallet' : 'wallets'}${counts.expected ? ' and expected income' : ''}` : 'Your wallets and expected income',
        'Your phone login. You can sign up again later.',
    ];

    return (
        <Screen header={<TopBar title="Delete account" />} contentStyle={{ gap: 12 }}>
            <Card gap={12}>
                <CategoryTile tone="danger" icon="trash" size={40} />
                <Text variant="cardTitle">This deletes everything</Text>
                <View style={{ gap: 8 }}>
                    {items.map((t) => (
                        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon name="close" size={14} color={colors.status.danger} />
                            <Text variant="meta" tone="secondary" style={{ flex: 1 }}>{t}</Text>
                        </View>
                    ))}
                </View>
                <Tap
                    onPress={() => exportTransactions().catch((e) => toast.show({ message: e instanceof Error ? e.message : 'Couldn’t export.', icon: 'alert' }))}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12,
                        borderRadius: 14, backgroundColor: colors.bg.muted, opacity: pressed ? 0.8 : 1,
                    })}
                >
                    <Icon name="download" size={16} color={colors.brand['accent-text']} />
                    <Text size={13} weight="bold" tone="accent" style={{ flex: 1 }}>Export a copy first</Text>
                    <Icon name="next" size={14} color={colors.text.tertiary} />
                </Tap>
            </Card>

            <View style={{ gap: 6 }}>
                <Text variant="meta" weight="bold">Type DELETE to confirm</Text>
                <TextInput
                    value={typed}
                    onChangeText={setTyped}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="DELETE"
                    placeholderTextColor={colors.text.tertiary}
                    accessibilityLabel="Type DELETE to confirm"
                    style={{
                        fontFamily: FONT.semibold, fontSize: 15, color: colors.text.primary, minHeight: 48,
                        backgroundColor: colors.bg.surface, borderRadius: 14, paddingHorizontal: 14,
                        borderWidth: 1.5, borderColor: typed && !matches ? colors.status.danger : colors.line.default,
                    }}
                />
            </View>
            <Button label="Delete forever" variant="danger" disabled={!matches} busy={busy} busyLabel="Deleting" onPress={remove} />
        </Screen>
    );
}
