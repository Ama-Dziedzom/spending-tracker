import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, Icon, SegmentedControl, Sheet, Text, useToast } from '@/components/ui';
import { FONT, HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { getWallets } from '@/lib/wallet-service';
import { suggestCategory } from '@/lib/categories';
import { addEntry, addMove, getAddDefaults } from '@/lib/add-transaction';
import { dayHeading, time24 } from '@/lib/format';
import {
    AmountInput, CategoryGrid, CategoryValue, FactRow, IN_CATEGORIES, SPENT_CATEGORIES, WalletList, WhenForm,
    parseAmount, pickStyle,
} from './pickers';
import { money } from './money';

type Kind = 'spent' | 'in' | 'moved';
type Mode = 'form' | 'category' | 'wallet' | 'to' | 'when';

const KINDS = [
    { value: 'spent', label: 'Spent' },
    { value: 'in', label: 'Received' },
    { value: 'moved', label: 'Moved' },
] as const;

export interface AddPrefill {
    amount?: string;
    type?: 'expense' | 'income';
    description?: string;
    /** ISO; defaults to now. */
    date?: string;
    rawSms?: string;
    walletId?: string;
    categoryId?: string;
}

/**
 * Add manually (Figma 1005:1055): amount first and big; category, wallet,
 * when and note default sensibly, so most adds are two taps.
 */
export function AddEntrySheet({ visible, onClose, onSuccess, prefill }: {
    visible: boolean;
    onClose: () => void;
    /** After saving, with the new entry's id. */
    onSuccess: (id: string) => void;
    prefill?: AddPrefill;
}) {
    const { colors } = useTheme();
    const toast = useToast();

    const [mode, setMode] = useState<Mode>('form');
    const [kind, setKind] = useState<Kind>('spent');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('food');
    const [categoryTouched, setCategoryTouched] = useState(false);
    const [wallets, setWallets] = useState<Wallet[] | null>(null);
    const [walletId, setWalletId] = useState<string | null>(null);
    const [toWalletId, setToWalletId] = useState<string | null>(null);
    const [when, setWhen] = useState<Date | null>(null); // null = now
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    // Reset to sensible defaults each time it opens.
    useEffect(() => {
        if (!visible) return;
        let live = true;
        setMode('form');
        setBusy(false);
        const k: Kind = prefill?.type === 'income' ? 'in' : 'spent';
        setKind(k);
        setAmount(prefill?.amount ?? '');
        setNote(prefill?.description ?? '');
        setWhen(prefill?.date ? new Date(prefill.date) : null);
        setToWalletId(null);
        setCategoryTouched(!!prefill?.categoryId);
        (async () => {
            const [list, defaults] = await Promise.all([getWallets().catch(() => [] as Wallet[]), getAddDefaults()]);
            if (!live) return;
            setWallets(list);
            const preferred = prefill?.walletId ?? defaults.walletId;
            setWalletId(list.find((w) => w.id === preferred)?.id ?? list[0]?.id ?? null);
            setCategory(prefill?.categoryId ?? (k === 'in' ? 'income' : defaults.spentCategory ?? 'food'));
        })();
        return () => { live = false; };
    }, [visible, prefill]);

    // Typing a note suggests a category until the user picks one.
    useEffect(() => {
        if (categoryTouched || kind === 'moved' || note.trim().length < 3) return;
        const s = suggestCategory(note, kind === 'in' ? 'income' : 'expense');
        if (s && s.id !== 'other') setCategory(s.id);
    }, [note, kind, categoryTouched]);

    const switchKind = (k: Kind) => {
        setKind(k);
        if (!categoryTouched) setCategory(k === 'in' ? 'income' : 'food');
        else if (k === 'in' && !IN_CATEGORIES.includes(category)) setCategory('income');
        else if (k === 'spent' && !SPENT_CATEGORIES.includes(category)) setCategory('food');
    };

    const wallet = wallets?.find((w) => w.id === walletId) ?? null;
    const toWallet = wallets?.find((w) => w.id === toWalletId) ?? null;
    const value = parseAmount(amount);
    const canSave = value > 0 && !!wallet && (kind !== 'moved' || !!toWallet);

    const save = async () => {
        if (!canSave || !wallet || busy) return;
        setBusy(true);
        const at = when ?? new Date();
        try {
            if (kind === 'moved' && toWallet) {
                const id = await addMove({ amount: value, fromId: wallet.id, toId: toWallet.id, when: at, note });
                toast.show({ message: `Moved · ${money(value)} to ${toWallet.name}` });
                onSuccess(id);
            } else {
                const label = pickStyle(category).label;
                const id = await addEntry({
                    kind: kind === 'in' ? 'in' : 'spent',
                    amount: value,
                    category,
                    walletId: wallet.id,
                    when: at,
                    description: note.trim() || label,
                    rawSms: prefill?.rawSms,
                });
                toast.show({ message: kind === 'in' ? `Logged · ${money(value)} received` : `Logged · ${money(value)} on ${label}` });
                onSuccess(id);
            }
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save it. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet visible={visible} onClose={onClose} title={mode === 'category' ? 'What was it?' : mode === 'wallet' ? (kind === 'moved' ? 'From which wallet?' : 'Which wallet?') : mode === 'to' ? 'To which wallet?' : mode === 'when' ? 'When was it?' : undefined}>
            {mode === 'form' && (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text variant="screenTitle" size={20} style={{ letterSpacing: -0.4 }} accessibilityRole="header">Add a transaction</Text>
                        <Pressable onPress={onClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="close" size={22} color={colors.text.secondary} />
                        </Pressable>
                    </View>

                    <SegmentedControl options={KINDS} value={kind} onChange={switchKind} />

                    <AmountInput value={amount} onChange={setAmount} autoFocus={!prefill?.amount} />

                    <View>
                        {kind !== 'moved' && (
                            <FactRow label="Category" value={<CategoryValue id={category} />} onPress={() => setMode('category')} />
                        )}
                        <FactRow
                            divider={kind !== 'moved'}
                            label={kind === 'moved' ? 'From' : 'Wallet'}
                            value={<Text variant="row" tone={wallet ? 'primary' : 'accent'}>{wallet?.name ?? (wallets?.length === 0 ? 'Add a wallet first' : 'Choose')}</Text>}
                            onPress={() => setMode('wallet')}
                        />
                        {kind === 'moved' && (
                            <FactRow
                                divider
                                label="To"
                                value={<Text variant="row" tone={toWallet ? 'primary' : 'accent'}>{toWallet?.name ?? 'Choose'}</Text>}
                                onPress={() => setMode('to')}
                            />
                        )}
                        <FactRow
                            divider
                            label="When"
                            value={<Text variant="row">{when ? `${dayHeading(when)}, ${time24(when)}` : 'Today, now'}</Text>}
                            onPress={() => setMode('when')}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderTopWidth: 1, borderTopColor: colors.line.default }}>
                            <Text variant="row" tone="secondary">Note</Text>
                            <BottomSheetTextInput
                                value={note}
                                onChangeText={setNote}
                                placeholder={kind === 'moved' ? 'Optional' : 'What was it? (optional)'}
                                placeholderTextColor={colors.text.tertiary}
                                accessibilityLabel="Note"
                                returnKeyType="done"
                                maxLength={80}
                                style={{ flex: 1, textAlign: 'right', fontFamily: FONT.semibold, fontSize: 14, color: colors.text.primary, paddingVertical: 13 }}
                            />
                        </View>
                    </View>

                    {kind === 'moved' && (
                        <Text variant="meta" tone="secondary">Moves between your own wallets aren’t spending, so they’re left out of your totals.</Text>
                    )}

                    <Button label="Save" busy={busy} busyLabel="Saving" disabled={!canSave} onPress={save} style={{ marginTop: 8 }} />
                </>
            )}

            {mode === 'category' && (
                <CategoryGrid
                    options={kind === 'in' ? IN_CATEGORIES : SPENT_CATEGORIES}
                    selected={category}
                    onPick={(id) => { setCategory(id); setCategoryTouched(true); setTimeout(() => setMode('form'), 200); }}
                />
            )}

            {(mode === 'wallet' || mode === 'to') && (
                <>
                    <WalletList
                        wallets={wallets ?? undefined}
                        selected={mode === 'to' ? toWalletId : walletId}
                        exclude={mode === 'to' ? walletId : null}
                        onPick={(w) => {
                            if (mode === 'to') setToWalletId(w.id);
                            else {
                                setWalletId(w.id);
                                if (w.id === toWalletId) setToWalletId(null);
                            }
                            setMode('form');
                        }}
                    />
                    <Button label="Back" variant="secondary" size="md" onPress={() => setMode('form')} />
                </>
            )}

            {mode === 'when' && (
                <WhenForm
                    initial={when ?? new Date()}
                    saveLabel="Done"
                    onBack={() => setMode('form')}
                    onSave={(d) => { setWhen(d); setMode('form'); }}
                />
            )}
        </Sheet>
    );
}
