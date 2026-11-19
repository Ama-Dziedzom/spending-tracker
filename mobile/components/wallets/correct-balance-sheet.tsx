import React, { useEffect, useState } from 'react';
import { Button, Icon, InsetPanel, Sheet, Text, useToast } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { setBalance } from '@/lib/wallets-overview';
import { AmountInput, parseAmount } from '@/components/transactions/pickers';
import { money } from '@/components/transactions/money';

/**
 * Correct balance, from "Balance doesn't look right?" on Wallet detail. A
 * quiet fix, not a daily task: the person's number replaces ours and nothing
 * is added to their history. Cash needs it most, since no alerts keep it true.
 */
export function CorrectBalanceSheet({ visible, wallet, onClose, onSaved }: {
    visible: boolean;
    wallet: Wallet;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);

    const isCash = wallet.type === 'cash';
    const current = Number(wallet.current_balance) || 0;

    useEffect(() => {
        if (visible) {
            setAmount('');
            setBusy(false);
        }
    }, [visible]);

    const value = parseAmount(amount);
    const entered = amount.trim() !== '';
    const diff = Math.round((value - current) * 100) / 100;

    const save = async () => {
        setBusy(true);
        try {
            await setBalance(wallet.id, value);
            toast.show({ message: `Balance updated · ${money(value)}` });
            onSaved();
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t update the balance. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Correct balance"
            subtitle={isCash ? 'Count what you have on you and put it here.' : `Put in the balance ${wallet.name} shows you.`}
            footer={
                <Button
                    label={entered ? `Save ${money(value)}` : 'Save'}
                    busy={busy}
                    busyLabel="Saving"
                    disabled={!entered || diff === 0}
                    onPress={save}
                />
            }
        >
            <Text size={13} tone="secondary" align="center">
                LogIt has {money(current)}
            </Text>
            <AmountInput value={amount} onChange={setAmount} autoFocus />
            {entered && diff !== 0 && (
                <Text size={13} tone="secondary" align="center">
                    {money(Math.abs(diff))} {diff > 0 ? 'more' : 'less'} than LogIt has
                </Text>
            )}
            <InsetPanel>
                <Icon name="info" size={16} color={colors.text.secondary} />
                <Text variant="meta" tone="secondary" style={{ flex: 1 }}>
                    {isCash
                        ? 'Your entries stay as they are. Cash you log from now on comes off this number.'
                        : 'Your entries stay as they are. When your next alert shows a balance, LogIt uses that.'}
                </Text>
            </InsetPanel>
        </Sheet>
    );
}
