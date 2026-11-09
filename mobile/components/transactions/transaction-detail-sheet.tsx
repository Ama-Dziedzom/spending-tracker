import React, { useEffect, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { Button, CategoryTile, SectionLabel, Sheet, Text, useToast } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { updateTransactionCategory, type TransactionWithWallet } from '@/lib/transaction-service';
import { categoryStyle } from '@/lib/category-style';
import { flowOf } from '@/lib/spending-service';
import { getRule, merchantLabel, removeRule, saveRule } from '@/lib/category-rules';
import { changeWallet, changeWhen, scheduleRemoval } from '@/lib/transaction-edits';
import { dayHeading, initials, listAmount, receivedAmount, time24 } from '@/lib/format';
import {
    CategoryGrid, CategoryValue, FactRow, IN_CATEGORIES, SPENT_CATEGORIES, WalletList, WhenForm, pickStyle,
} from './pickers';

type Mode = 'detail' | 'category' | 'wallet' | 'when';

/**
 * Transaction detail (Figma 1005:804): three facts you can change, then the
 * message itself with what LogIt read marked in blue. Change category,
 * wallet and time happen inside the same sheet.
 */
export function TransactionDetailSheet({ transaction, onClose, onChanged }: {
    transaction: TransactionWithWallet | null;
    onClose: () => void;
    /** Something was saved or removed; refresh the list behind. */
    onChanged: () => void;
}) {
    const toast = useToast();
    const [tx, setTx] = useState<TransactionWithWallet | null>(transaction);
    const [mode, setMode] = useState<Mode>('detail');

    useEffect(() => {
        if (transaction) {
            setTx(transaction);
            setMode('detail');
        }
    }, [transaction]);

    const close = () => { onClose(); };

    const remove = (kind: 'delete' | 'notMoney') => {
        if (!tx) return;
        const removed = tx;
        const undo = scheduleRemoval(removed, (ok) => {
            if (!ok) toast.show({ message: 'Couldn’t delete it. It’s back in your list.', icon: 'alert' });
            onChanged();
        });
        toast.show({
            message: kind === 'notMoney' ? 'Removed · not money' : `Deleted · ${removed.description || 'entry'}`,
            icon: 'trash',
            action: { label: 'Undo', onPress: () => { undo(); onChanged(); } },
        });
        onChanged();
        close();
    };

    return (
        <Sheet
            visible={!!transaction}
            onClose={close}
            title={titleFor(mode)}
            footer={tx && mode === 'detail' ? <DetailActions tx={tx} onRemove={remove} /> : undefined}
        >
            {tx && mode === 'detail' && (
                <Detail
                    tx={tx}
                    onCategory={() => setMode('category')}
                    onWallet={() => setMode('wallet')}
                    onWhen={() => setMode('when')}
                />
            )}
            {tx && mode === 'category' && (
                <CategoryPicker
                    tx={tx}
                    onPicked={(category) => {
                        setTx({ ...tx, category });
                        onChanged();
                        setTimeout(() => setMode('detail'), 250);
                    }}
                />
            )}
            {tx && mode === 'wallet' && (
                <WalletPicker
                    tx={tx}
                    onPicked={(wallet) => {
                        setTx({ ...tx, wallet_id: wallet.id, wallet });
                        onChanged();
                        setMode('detail');
                    }}
                    onBack={() => setMode('detail')}
                />
            )}
            {tx && mode === 'when' && (
                <WhenPicker
                    tx={tx}
                    onSaved={(when) => {
                        setTx({ ...tx, transaction_date: when.toISOString(), date_source: 'manual' });
                        onChanged();
                        setMode('detail');
                    }}
                    onBack={() => setMode('detail')}
                />
            )}
        </Sheet>
    );
}

function titleFor(mode: Mode): string | undefined {
    return mode === 'category' ? 'What was it?' : mode === 'wallet' ? 'Which wallet?' : mode === 'when' ? 'When was it?' : undefined;
}

// ---------------------------------------------------------------------------

function Detail({ tx, onCategory, onWallet, onWhen }: {
    tx: TransactionWithWallet;
    onCategory: () => void;
    onWallet: () => void;
    onWhen: () => void;
}) {
    const { colors } = useTheme();
    const flow = flowOf(tx);
    const style = categoryStyle(tx.category);
    const isPerson = tx.category === 'transfer' || (flow === 'in' && !tx.category);
    const at = new Date(tx.transaction_date || tx.created_at);
    const rawSms = tx.raw_sms ?? null;

    const from = tx.transfer?.from_wallet?.name;
    const to = tx.transfer?.to_wallet?.name;
    const walletLabel = flow === 'moved' && from && to ? `${from} → ${to}` : tx.wallet?.name ?? 'Choose a wallet';
    const subtitle = flow === 'moved'
        ? 'Moved between your wallets'
        : [flow === 'in' ? 'Received' : isPerson ? 'Sent' : null, tx.wallet?.name].filter(Boolean).join(' · ') || 'No wallet yet';

    const leading = flow === 'moved'
        ? <CategoryTile tone="muted" icon="moved" size={48} />
        : isPerson
            ? <CategoryTile tone="people" initials={initials(tx.description)} size={48} />
            : <CategoryTile tone={style.tone} icon={style.icon} size={48} />;

    return (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {leading}
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="cardTitle">{tx.description || style.label}</Text>
                    <Text size={13} tone="secondary">{subtitle}</Text>
                </View>
            </View>

            <Text
                weight="extrabold"
                size={36}
                tone={flow === 'in' ? 'success' : 'primary'}
                style={{ letterSpacing: -1 }}
                accessibilityLabel={`${flow === 'in' ? 'Received' : flow === 'moved' ? 'Moved' : 'Spent'} GHS ${listAmount(tx.amount)}`}
            >
                {flow === 'in' ? receivedAmount(tx.amount) : listAmount(tx.amount)}
            </Text>

            <View>
                <FactRow
                    label="Category"
                    onPress={flow === 'moved' ? undefined : onCategory}
                    value={flow === 'moved'
                        ? <Text variant="row">Not spending</Text>
                        : <CategoryValue id={isPerson ? 'transfer' : (tx.category ?? 'other')} />}
                />
                <FactRow
                    divider
                    label="Wallet"
                    onPress={flow === 'moved' ? undefined : onWallet}
                    value={<Text variant="row" tone={tx.wallet ? 'primary' : 'accent'}>{walletLabel}</Text>}
                />
                <FactRow
                    divider
                    label="When"
                    onPress={onWhen}
                    value={
                        <Text variant="row">
                            {tx.date_source === 'estimated' ? 'About ' : ''}{dayHeading(at)}, {time24(at)}
                        </Text>
                    }
                />
            </View>

            {rawSms ? (
                <View style={{ backgroundColor: colors.bg.muted, borderRadius: 18, padding: 14, gap: 8 }}>
                    <SectionLabel>What LogIt read</SectionLabel>
                    <ReadMessage sms={rawSms} description={tx.description} />
                </View>
            ) : (
                <Text variant="meta" tone="tertiary">You added this yourself.</Text>
            )}

        </>
    );
}

/** Not money / Delete, pinned to the bottom of the sheet (Figma 1005:899). */
function DetailActions({ tx, onRemove }: { tx: TransactionWithWallet; onRemove: (kind: 'delete' | 'notMoney') => void }) {
    return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
            {tx.raw_sms && flowOf(tx) !== 'moved' && (
                <Button label="Not money" variant="secondary" size="sm" fill onPress={() => onRemove('notMoney')} />
            )}
            <Button label="Delete" icon="trash" variant="dangerSoft" size="sm" fill onPress={() => onRemove('delete')} />
        </View>
    );
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * The SMS as received, with the amount, the place and the date LogIt took
 * from it in brand/accent-text (Figma 1005:895).
 */
function ReadMessage({ sms, description }: { sms: string; description: string }) {
    const { colors } = useTheme();
    const parts = highlight(sms, description);
    return (
        <Text style={{ fontFamily: MONO, fontSize: 12, lineHeight: 19, color: colors.text.secondary }} selectable>
            {parts.map((p, i) => (
                <Text
                    key={i}
                    style={p.mark
                        ? { fontFamily: MONO, fontSize: 12, lineHeight: 19, fontWeight: '600', color: colors.brand['accent-text'] }
                        : { fontFamily: MONO, fontSize: 12, lineHeight: 19, color: colors.text.secondary }}
                >
                    {p.text}
                </Text>
            ))}
        </Text>
    );
}

const AMOUNT = /(?:GHS|GH₵|GHC|GH¢)\s?[\d,]+(?:\.\d{1,2})?/gi;
const DATE = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2})(?:[ T,]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)?/gi;

/** Split the SMS into plain and marked spans. Only the first amount is marked; balances stay plain. */
export function highlight(sms: string, description: string): { text: string; mark: boolean }[] {
    const ranges: [number, number][] = [];
    const firstAmount = new RegExp(AMOUNT.source, 'i').exec(sms);
    if (firstAmount) ranges.push([firstAmount.index, firstAmount.index + firstAmount[0].length]);
    const firstDate = new RegExp(DATE.source, 'i').exec(sms);
    if (firstDate) ranges.push([firstDate.index, firstDate.index + firstDate[0].length]);
    // "Shoprite, Accra Mall" is "SHOPRITE ACCRA MALL" in the message; try without
    // the comma, then just the part before it.
    const lower = sms.toLowerCase();
    const candidates = [description.replace(/,\s*/g, ' '), description.split(',')[0]]
        .map((c) => c.trim().replace(/\s+/g, ' '))
        .filter((c) => c.length >= 3);
    for (const name of candidates) {
        const at = lower.indexOf(name.toLowerCase());
        if (at >= 0) { ranges.push([at, at + name.length]); break; }
    }

    ranges.sort((a, b) => a[0] - b[0]);
    const out: { text: string; mark: boolean }[] = [];
    let i = 0;
    for (const [s, e] of ranges) {
        if (s < i) continue; // overlapping; keep the earlier mark
        if (s > i) out.push({ text: sms.slice(i, s), mark: false });
        out.push({ text: sms.slice(s, e), mark: true });
        i = e;
    }
    if (i < sms.length) out.push({ text: sms.slice(i), mark: false });
    return out;
}

// ---------------------------------------------------------------------------

/** "What was it?" (Figma 1005:911): the same tiles used everywhere, plus "Always use this". */
function CategoryPicker({ tx, onPicked }: { tx: TransactionWithWallet; onPicked: (category: string) => void }) {
    const { colors } = useTheme();
    const toast = useToast();
    const flow = flowOf(tx);
    const [selected, setSelected] = useState(tx.category ?? 'other');
    const [always, setAlways] = useState(false);
    const [busy, setBusy] = useState(false);
    const merchant = merchantLabel(tx.description || '');
    const direction = flow === 'in' ? 'in' : 'out';

    useEffect(() => {
        let live = true;
        getRule(tx.description || '').then((rule) => { if (live) setAlways(!!rule && rule === (tx.category ?? 'other')); });
        return () => { live = false; };
    }, [tx.description, tx.category]);

    const pick = async (id: string) => {
        if (busy) return;
        setSelected(id);
        setBusy(true);
        const ok = await updateTransactionCategory(tx.id, id);
        if (ok && always && merchant) await saveRule(tx.description, id, direction);
        setBusy(false);
        if (!ok) {
            setSelected(tx.category ?? 'other');
            toast.show({ message: 'Couldn’t change the category. Try again.', icon: 'alert' });
            return;
        }
        toast.show({ message: `Changed to ${pickStyle(id).label}` });
        onPicked(id);
    };

    const toggleAlways = async (on: boolean) => {
        setAlways(on);
        const ok = on ? await saveRule(tx.description, selected, direction) : await removeRule(tx.description);
        if (!ok) {
            setAlways(!on);
            toast.show({ message: 'Couldn’t save that. Try again.', icon: 'alert' });
            return;
        }
        if (on) toast.show({ message: `${merchant} will always be ${pickStyle(selected).label}` });
    };

    return (
        <>
            <CategoryGrid options={flow === 'in' ? IN_CATEGORIES : SPENT_CATEGORIES} selected={selected} onPick={pick} disabled={busy} />
            {merchant.length > 0 && (
                <View style={{ backgroundColor: colors.bg.muted, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text variant="row" style={{ flex: 1 }}>Always use this for {merchant}</Text>
                    <Switch
                        value={always}
                        onValueChange={toggleAlways}
                        trackColor={{ false: colors.line.default, true: colors.brand.accent }}
                        thumbColor={colors.brand['on-accent']}
                        ios_backgroundColor={colors.line.default}
                        accessibilityLabel={`Always use this for ${merchant}`}
                    />
                </View>
            )}
        </>
    );
}

function WalletPicker({ tx, onPicked, onBack }: { tx: TransactionWithWallet; onPicked: (w: Wallet) => void; onBack: () => void }) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const pick = async (w: Wallet) => {
        if (busy) return;
        setBusy(true);
        try {
            await changeWallet(tx, w.id);
            toast.show({ message: `Moved to ${w.name}` });
            onPicked(w);
        } catch (e) {
            console.error('Change wallet failed:', e);
            toast.show({ message: 'Couldn’t change the wallet. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            <WalletList selected={tx.wallet_id} onPick={pick} />
            <Button label="Back" variant="secondary" size="md" onPress={onBack} />
        </>
    );
}

function WhenPicker({ tx, onSaved, onBack }: { tx: TransactionWithWallet; onSaved: (d: Date) => void; onBack: () => void }) {
    const toast = useToast();
    return (
        <WhenForm
            initial={new Date(tx.transaction_date || tx.created_at)}
            onBack={onBack}
            onSave={async (when) => {
                try {
                    await changeWhen(tx, when);
                    toast.show({ message: `Moved to ${dayHeading(when)}, ${time24(when)}` });
                    onSaved(when);
                } catch (e) {
                    console.error('Change date failed:', e);
                    toast.show({ message: 'Couldn’t change the time. Try again.', icon: 'alert' });
                }
            }}
        />
    );
}
