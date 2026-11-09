import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, CategoryTile, Icon, InsetPanel, Sheet, Text, useToast } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { countCash } from '@/lib/wallets-overview';
import { createCashWallet } from '@/lib/add-transaction';
import { AmountInput, parseAmount } from '@/components/transactions/pickers';
import { money } from '@/components/transactions/money';

/**
 * Count cash (Figma 1006:1283): a starting number, once. After that
 * cash-outs top it up and Log cash draws it down.
 */
export function CountCashSheet({ visible, wallet, onClose, onSaved }: {
    visible: boolean;
    /** The cash wallet; null starts one. */
    wallet: Wallet | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (visible) {
            const current = Number(wallet?.current_balance) || 0;
            setAmount(current > 0 ? String(current) : '');
            setBusy(false);
        }
    }, [visible, wallet]);

    const value = parseAmount(amount);

    const save = async () => {
        setBusy(true);
        try {
            const target = wallet ?? (await createCashWallet());
            await countCash(target.id, value);
            toast.show({ message: `Counted · ${money(value)} cash` });
            onSaved();
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save your count. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            footer={<Button label={`Save ${money(value)}`} busy={busy} busyLabel="Saving" onPress={save} />}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryTile tone="cash" icon="cash" size={44} />
                <View style={{ flex: 1, gap: 1 }}>
                    <Text variant="cardTitle" accessibilityRole="header">How much cash do you have?</Text>
                    <Text size={13} tone="secondary">Count it once. LogIt keeps up from here.</Text>
                </View>
            </View>
            <AmountInput value={amount} onChange={setAmount} autoFocus />
            <InsetPanel>
                <Icon name="info" size={16} color={colors.text.secondary} />
                <Text variant="meta" tone="secondary" style={{ flex: 1 }}>
                    Cash outs from MoMo add here automatically; cash you spend, you log.
                </Text>
            </InsetPanel>
        </Sheet>
    );
}
