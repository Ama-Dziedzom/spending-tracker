import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import {
    Button, Card, CategoryTile, Dialog, Icon, ListGroup, ListRow, RoundButton, Screen, Sheet, Tap, Text, TopBar, useToast,
} from '@/components/ui';
import { WalletList } from '@/components/transactions/pickers';
import { FONT, HIT_SLOP, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { getWallets } from '@/lib/wallet-service';
import { type ExpectedIncome, getExpectedIncome, ordinal, removeExpectedIncome, saveExpectedIncome } from '@/lib/income-service';
import { heroAmount } from '@/lib/format';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Expected income (Figma 1010:1946). For banks that don't text. One row per
 * expected payment; on the day, Spending asks if it came.
 */
export default function ExpectedIncomeScreen() {
    const { colors } = useTheme();
    const toast = useToast();
    const [items, setItems] = useState<ExpectedIncome[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [editingId, setEditingId] = useState<string | undefined>();
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [day, setDay] = useState(25);
    const [walletId, setWalletId] = useState<string | null>(null);
    const [picker, setPicker] = useState<'day' | 'wallet' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<ExpectedIncome | null>(null);

    const load = useCallback(async () => {
        const [list, w] = await Promise.all([getExpectedIncome(), getWallets().catch(() => [] as Wallet[])]);
        setItems(list);
        setWallets(w);
        setWalletId((cur) => cur ?? w.find((x) => x.type === 'bank')?.id ?? w[0]?.id ?? null);
    }, []);
    useEffect(() => { load(); }, [load]);

    const reset = () => { setEditingId(undefined); setLabel(''); setAmount(''); setDay(25); setError(null); };
    const edit = (item: ExpectedIncome) => {
        setEditingId(item.id); setLabel(item.label); setAmount(String(item.amount)); setDay(item.day_of_month); setWalletId(item.wallet_id); setError(null);
    };

    const save = async () => {
        const value = parseFloat(amount.replace(/,/g, ''));
        if (!label.trim()) { setError('Say what it is, like Salary or Rent from tenant.'); return; }
        if (!value || value <= 0) { setError('Add roughly how much comes in, like 3000.'); return; }
        setBusy(true);
        const ok = await saveExpectedIncome({ label: label.trim(), amount: value, day_of_month: day, wallet_id: walletId }, editingId);
        setBusy(false);
        if (!ok) { toast.show({ message: 'Couldn’t save. Check your connection and try again.', icon: 'alert' }); return; }
        toast.show({ message: `${editingId ? 'Saved' : 'Added'} · ${label.trim()} on the ${ordinal(day)}` });
        reset();
        load();
    };

    const remove = async () => {
        const item = confirmRemove;
        setConfirmRemove(null);
        if (!item) return;
        await removeExpectedIncome(item.id);
        if (editingId === item.id) reset();
        toast.show({ message: `Stopped expecting ${item.label}` });
        load();
    };

    const walletName = (id: string | null) => wallets.find((w) => w.id === id)?.name ?? 'Any wallet';
    const inputStyle = { fontFamily: FONT.semibold, fontSize: 13, color: colors.text.primary, textAlign: 'right' as const, flex: 1, paddingVertical: 12 };

    return (
        <>
            <Screen header={<TopBar title="Expected income" />} contentStyle={{ gap: 12 }}>
                <Text size={13} style={{ color: RAW.onBandSecondary, paddingHorizontal: 4 }}>
                    Some banks don’t text when money comes in. Tell LogIt what to expect and it’ll ask on the day.
                </Text>

                {items.length > 0 && (
                    <ListGroup>
                        {items.map((item) => (
                            <ListRow
                                key={item.id}
                                leading={<CategoryTile tone="success" icon="receive" size={40} />}
                                title={item.label}
                                meta={`≈GHS ${heroAmount(Number(item.amount))} · ${ordinal(item.day_of_month)} · ${walletName(item.wallet_id)}`}
                                trailing={<Icon name="edit" size={16} color={colors.text.tertiary} />}
                                onPress={() => edit(item)}
                                accessibilityLabel={`Edit ${item.label}`}
                            />
                        ))}
                    </ListGroup>
                )}

                <Card gap={0}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text size={14} weight="bold">{editingId ? `Edit ${label || 'income'}` : items.length ? 'Add another' : 'Add expected income'}</Text>
                        {editingId && <RoundButton icon="close" tone="card" label="Cancel editing" onPress={reset} />}
                    </View>
                    <FormRow label="What">
                        <TextInput value={label} onChangeText={(t) => { setLabel(t); setError(null); }} placeholder="Salary" placeholderTextColor={colors.text.tertiary} style={inputStyle} accessibilityLabel="What" maxLength={40} />
                    </FormRow>
                    <FormRow label="About how much" divider>
                        <Text size={13} weight="semibold">GHS </Text>
                        <TextInput value={amount} onChangeText={(t) => { setAmount(t.replace(/[^\d.,]/g, '')); setError(null); }} placeholder="3000" placeholderTextColor={colors.text.tertiary} keyboardType="decimal-pad" style={[inputStyle, { flex: 0, minWidth: 60 }]} accessibilityLabel="About how much, in cedis" />
                    </FormRow>
                    <FormRow label="Usually on the" divider onPress={() => setPicker('day')}>
                        <Text size={13} weight="semibold">{ordinal(day)}</Text>
                    </FormRow>
                    <FormRow label="Into" divider onPress={() => setPicker('wallet')}>
                        <Text size={13} weight="semibold">{walletName(walletId)}</Text>
                    </FormRow>
                    {error && <Text variant="meta" tone="danger" style={{ marginTop: 6 }}>{error}</Text>}
                    <Button label={editingId ? 'Save changes' : 'Save'} busy={busy} onPress={save} style={{ marginTop: 12 }} />
                    {editingId && (
                        <Tap onPress={() => setConfirmRemove(items.find((i) => i.id === editingId) ?? null)} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                            <Text size={13} weight="bold" tone="danger">Stop expecting it</Text>
                        </Tap>
                    )}
                </Card>
            </Screen>

            <Sheet visible={picker === 'day'} onClose={() => setPicker(null)} title="Usually on the…" subtitle="If the month is shorter, LogIt asks on its last day.">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                    {DAYS.map((d) => {
                        const active = d === day;
                        return (
                            <Pressable
                                key={d}
                                onPress={() => { setDay(d); setPicker(null); }}
                                hitSlop={HIT_SLOP}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={ordinal(d)}
                                style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.brand.accent : colors.bg.muted }}
                            >
                                <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-accent'] : colors.text.primary }}>{d}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </Sheet>
            <Sheet visible={picker === 'wallet'} onClose={() => setPicker(null)} title="Into which wallet?">
                <WalletList wallets={wallets} selected={walletId} onPick={(w) => { setWalletId(w.id); setPicker(null); }} />
                <Button label="Any wallet" variant="secondary" onPress={() => { setWalletId(null); setPicker(null); }} />
            </Sheet>
            <Dialog
                visible={!!confirmRemove}
                icon="trash"
                title={`Stop expecting ${confirmRemove?.label ?? 'it'}?`}
                body="LogIt will stop asking about it. Transactions already logged stay."
                cancelLabel="Keep"
                confirmLabel="Stop"
                onCancel={() => setConfirmRemove(null)}
                onConfirm={remove}
            />
        </>
    );
}

/** "What · Rent from tenant": label left, value or input right (Figma 1010:1946). */
function FormRow({ label, children, divider, onPress }: { label: string; children: React.ReactNode; divider?: boolean; onPress?: () => void }) {
    const { colors } = useTheme();
    const body = (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, divider && { borderTopWidth: 1, borderTopColor: colors.line.default }]}>
            <Text size={13} tone="secondary">{label}</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>{children}</View>
            {onPress && <Icon name="next" size={14} color={colors.text.tertiary} />}
        </View>
    );
    return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Change ${label.toLowerCase()}`}>{body}</Pressable> : body;
}
