import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, CategoryTile, Icon, Sheet, Text, useToast, type IconName } from '@/components/ui';
import { HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { supabase, type Wallet } from '@/lib/supabase';
import { getWallets } from '@/lib/wallet-service';
import { addEntry, createCashWallet } from '@/lib/add-transaction';
import { categoryStyle } from '@/lib/category-style';
import { shortDate } from '@/lib/format';
import { AmountInput, parseAmount } from './pickers';
import { money } from './money';
import { Tap } from '@/components/ui/tap';

/** Quick chips (Figma 1005:1227). Each is a category plus the entry's name. */
const CHIPS: {
    key: string;
    label: string;
    icon: IconName;
    category: string;
    description: string;
}[] = [
    {
        key: 'trotro',
        label: 'Trotro',
        icon: 'transport',
        category: 'transport',
        description: 'Trotro',
    },
    {
        key: 'food',
        label: 'Food',
        icon: 'food',
        category: 'food',
        description: 'Food',
    },
    {
        key: 'market',
        label: 'Market',
        icon: 'shopping',
        category: 'shopping',
        description: 'Market',
    },
    {
        key: 'gift',
        label: 'Gift',
        icon: 'people',
        category: 'gifts',
        description: 'Gift',
    },
    {
        key: 'other',
        label: 'Other',
        icon: 'more',
        category: 'cash',
        description: 'Cash spend',
    },
];

const LAST_CHIP = 'logit.lastCashChip';

/**
 * Log cash (Figma 1005:1161): cash is the one thing LogIt can't see. Quick
 * chips and a running "cash left" make it painless.
 */
export function LogCashSheet({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: (id: string) => void }) {
    const { colors } = useTheme();
    const toast = useToast();
    const [wallet, setWallet] = useState<Wallet | null | undefined>(undefined); // undefined = loading, null = none
    const [source, setSource] = useState<{ amount: number; date: Date } | null>(null);
    const [amount, setAmount] = useState('');
    const [chip, setChip] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        let live = true;
        setAmount('');
        setBusy(false);
        AsyncStorage.getItem(LAST_CHIP)
            .then((c) => {
                if (live) setChip(c);
            })
            .catch(() => {});
        (async () => {
            const cash = (await getWallets().catch(() => [] as Wallet[])).find((w) => w.type === 'cash') ?? null;
            if (!live) return;
            setWallet(cash);
            setSource(cash ? await lastCashIn(cash.id) : null);
        })();
        return () => {
            live = false;
        };
    }, [visible]);

    const value = parseAmount(amount);
    const picked = CHIPS.find((c) => c.key === chip) ?? null;
    const balance = wallet ? Number(wallet.current_balance) || 0 : null;
    const left = balance !== null ? balance - value : null;

    const subtitle = source
        ? `From the ${money(source.amount)} you took out ${dayWord(source.date)}`
        : wallet
          ? `From your ${wallet.name} wallet`
          : 'LogIt will start a Cash wallet for you';

    const save = async () => {
        if (value <= 0 || busy) return;
        setBusy(true);
        try {
            let target = wallet;
            if (!target) target = await createCashWallet();
            const c = picked ?? CHIPS[CHIPS.length - 1];
            const id = await addEntry({
                kind: 'spent',
                amount: value,
                category: c.category,
                walletId: target.id,
                when: new Date(),
                description: c.description,
            });
            if (picked) AsyncStorage.setItem(LAST_CHIP, picked.key).catch(() => {});
            toast.show({
                message: `Logged · ${money(value)} on ${categoryStyle(c.category).label}`,
            });
            onSuccess(id);
            onClose();
        } catch (e) {
            toast.show({
                message: e instanceof Error ? e.message : 'Couldn’t log it. Try again.',
                icon: 'alert',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            footer={
                <Button
                    label={value > 0 ? `Log ${money(value)} cash` : 'Log cash'}
                    busy={busy}
                    busyLabel="Logging"
                    disabled={value <= 0 || wallet === undefined}
                    onPress={save}
                />
            }
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CategoryTile tone="cash" icon="cash" size={44} />
                <View style={{ flex: 1, gap: 1 }}>
                    <Text variant="screenTitle" size={20} style={{ letterSpacing: -0.4 }} accessibilityRole="header">
                        Log cash
                    </Text>
                    <Text size={13} tone="secondary">
                        {wallet === undefined ? ' ' : subtitle}
                    </Text>
                </View>
            </View>

            <AmountInput value={amount} onChange={setAmount} autoFocus />

            <Text variant="sectionLabel" tone="tertiary" size={12}>
                What was it for?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                {CHIPS.map((c) => {
                    const active = c.key === chip;
                    const fg = active ? colors.brand['on-accent'] : colors.text.primary;
                    return (
                        <Tap
                            key={c.key}
                            onPress={() => setChip(active ? null : c.key)}
                            hitSlop={HIT_SLOP}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={c.label}
                            style={({ pressed }) => ({
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingLeft: 12,
                                paddingRight: 14,
                                minHeight: 44,
                                borderRadius: 999,
                                backgroundColor: active ? colors.brand.accent : colors.bg.muted,
                                opacity: pressed ? 0.8 : 1,
                            })}
                        >
                            <Icon name={c.icon} size={16} color={active ? fg : (colors.cat[categoryTone(c.category)] ?? colors.text.secondary)} />
                            <Text size={13} weight="bold" style={{ color: fg }}>
                                {c.label}
                            </Text>
                        </Tap>
                    );
                })}
            </View>

            {left !== null &&
                balance !== null &&
                balance > 0 &&
                (left >= 0 ? (
                    <View
                        style={{
                            backgroundColor: colors.cat['cash-tint'],
                            borderRadius: 16,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Icon name="cash" size={18} color={colors.cat.cash} />
                        <Text size={13} weight="semibold">
                            {money(left)} cash left after this
                        </Text>
                    </View>
                ) : (
                    <View
                        style={{
                            backgroundColor: colors.status['warn-tint'],
                            borderRadius: 16,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Icon name="alert" size={18} color={colors.status.warn} />
                        <Text size={13} weight="semibold" style={{ flex: 1 }}>
                            That’s more than the {money(balance)} LogIt knows about. You can count your cash in Wallets.
                        </Text>
                    </View>
                ))}
        </Sheet>
    );
}

/** The chip icon takes its category colour (icons only, handoff §3). */
function categoryTone(category: string): 'transport' | 'food' | 'shopping' | 'people' | 'cash' {
    const t = categoryStyle(category).tone;
    return t === 'transport' || t === 'food' || t === 'shopping' || t === 'cash' ? t : 'people';
}

/** "Monday" within the last week, otherwise "on 3 Nov". */
function dayWord(d: Date): string {
    const now = new Date();
    const days = Math.round(
        (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000,
    );
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `on ${shortDate(d)}`;
}

/** The latest money into this cash wallet in the last 30 days (a cash-out, usually). */
async function lastCashIn(walletId: string): Promise<{ amount: number; date: Date } | null> {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data, error } = await supabase
        .from('transactions')
        .select('amount, transaction_date')
        .eq('wallet_id', walletId)
        .in('type', ['income', 'credit'])
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: false })
        .limit(1);
    if (error || !data?.[0]) return null;
    return {
        amount: Number(data[0].amount),
        date: new Date(data[0].transaction_date),
    };
}
