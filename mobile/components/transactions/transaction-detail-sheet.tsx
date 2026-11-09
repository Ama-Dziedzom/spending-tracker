import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import {
    Button, CategoryTile, FieldError, Icon, ListGroup, ListRow, SectionLabel, Sheet, Text, useToast,
} from '@/components/ui';
import { FONT, HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { updateTransactionCategory, type TransactionWithWallet } from '@/lib/transaction-service';
import { getWallets } from '@/lib/wallet-service';
import { categoryStyle } from '@/lib/category-style';
import { flowOf } from '@/lib/spending-service';
import { getRule, merchantLabel, removeRule, saveRule } from '@/lib/category-rules';
import { changeWallet, changeWhen, scheduleRemoval } from '@/lib/transaction-edits';
import { dayHeading, initials, listAmount, receivedAmount, sameDay, shortDate, time24 } from '@/lib/format';

type Mode = 'detail' | 'category' | 'wallet' | 'when';

/** Category choices, in the design's order (Figma 1005:911). */
const SPENT_CATEGORIES = ['food', 'shopping', 'airtime', 'bills', 'transport', 'transfer', 'cash', 'subscription', 'fees', 'loans', 'other'];
const IN_CATEGORIES = ['income', 'transfer', 'gifts', 'loans', 'other'];

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
        <Sheet visible={!!transaction} onClose={close} title={titleFor(mode)}>
            {tx && mode === 'detail' && (
                <Detail
                    tx={tx}
                    onCategory={() => setMode('category')}
                    onWallet={() => setMode('wallet')}
                    onWhen={() => setMode('when')}
                    onRemove={remove}
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

function Detail({ tx, onCategory, onWallet, onWhen, onRemove }: {
    tx: TransactionWithWallet;
    onCategory: () => void;
    onWallet: () => void;
    onWhen: () => void;
    onRemove: (kind: 'delete' | 'notMoney') => void;
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
                        : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <CategoryTile tone={isPerson ? 'people' : style.tone} icon={isPerson ? 'people' : style.icon} size={24} />
                                <Text variant="row">{isPerson ? 'People' : style.label}</Text>
                            </View>
                        )}
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

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {rawSms && flow !== 'moved' && (
                    <Button label="Not money" variant="secondary" size="sm" fill onPress={() => onRemove('notMoney')} />
                )}
                <Button label="Delete" icon="trash" variant="dangerSoft" size="sm" fill onPress={() => onRemove('delete')} />
            </View>
        </>
    );
}

/** "Category · Shopping ›". 44+ tall, label left, value and chevron right. */
function FactRow({ label, value, onPress, divider }: {
    label: string;
    value: React.ReactNode;
    onPress?: () => void;
    divider?: boolean;
}) {
    const { colors } = useTheme();
    const body = (
        <View
            style={[
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 44 },
                divider && { borderTopWidth: 1, borderTopColor: colors.line.default },
            ]}
        >
            <Text variant="row" tone="secondary" style={{ flex: 1 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                {value}
                {onPress && <Icon name="next" size={16} color={colors.text.tertiary} />}
            </View>
        </View>
    );
    if (!onPress) return body;
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Change ${label.toLowerCase()}`} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            {body}
        </Pressable>
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
    const { width } = useWindowDimensions();
    const flow = flowOf(tx);
    const options = flow === 'in' ? IN_CATEGORIES : SPENT_CATEGORIES;
    const tileWidth = Math.floor((Math.min(width, 520) - 40 - 20) / 3);

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
        toast.show({ message: `Changed to ${categoryStyle(id).label}` });
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
        if (on) toast.show({ message: `${merchant} will always be ${categoryStyle(selected).label}` });
    };

    return (
        <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
                {options.map((id) => {
                    const s = id === 'transfer' ? { tone: 'people' as const, icon: 'people' as const, label: 'People' } : categoryStyle(id);
                    const active = id === selected;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => pick(id)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active, disabled: busy }}
                            accessibilityLabel={s.label}
                            style={({ pressed }) => ({
                                width: tileWidth,
                                alignItems: 'center',
                                gap: 8,
                                paddingVertical: 12,
                                paddingHorizontal: 6,
                                borderRadius: 20,
                                backgroundColor: active ? colors.brand['accent-tint'] : colors.bg.muted,
                                borderWidth: 2,
                                borderColor: active ? colors.brand.accent : 'transparent',
                                opacity: pressed ? 0.8 : 1,
                            })}
                        >
                            <CategoryTile tone={s.tone} icon={s.icon} size={40} />
                            <Text size={12} weight={active ? 'bold' : 'semibold'} tone={active ? 'accent' : 'primary'} align="center">
                                {s.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

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

// ---------------------------------------------------------------------------

function WalletPicker({ tx, onPicked, onBack }: { tx: TransactionWithWallet; onPicked: (w: Wallet) => void; onBack: () => void }) {
    const { colors } = useTheme();
    const toast = useToast();
    const [wallets, setWallets] = useState<Wallet[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => { getWallets().then(setWallets).catch(() => setWallets([])); }, []);

    const pick = async (w: Wallet) => {
        if (busy) return;
        setBusy(w.id);
        try {
            await changeWallet(tx, w.id);
            toast.show({ message: `Moved to ${w.name}` });
            onPicked(w);
        } catch (e) {
            console.error('Change wallet failed:', e);
            toast.show({ message: 'Couldn’t change the wallet. Try again.', icon: 'alert' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            {wallets === null ? (
                <Text tone="secondary">Loading your wallets…</Text>
            ) : wallets.length === 0 ? (
                <Text tone="secondary">You have no wallets yet. Add one from the Wallets tab.</Text>
            ) : (
                <ListGroup bare>
                    {wallets.map((w) => (
                        <ListRow
                            key={w.id}
                            leading={<CategoryTile tone={w.type === 'cash' ? 'cash' : 'muted'} icon={w.type === 'cash' ? 'cash' : w.type === 'bank' ? 'bank' : 'wallet'} />}
                            title={w.name}
                            trailing={w.id === tx.wallet_id ? <Icon name="tick" size={18} color={colors.brand['accent-text']} /> : 'none'}
                            onPress={() => pick(w)}
                            accessibilityLabel={`${w.name}${w.id === tx.wallet_id ? ', current' : ''}`}
                        />
                    ))}
                </ListGroup>
            )}
            <Button label="Back" variant="secondary" size="md" onPress={onBack} />
        </>
    );
}

// ---------------------------------------------------------------------------

/** Last seven days as chips, then a 24-hour time. */
function WhenPicker({ tx, onSaved, onBack }: { tx: TransactionWithWallet; onSaved: (d: Date) => void; onBack: () => void }) {
    const { colors } = useTheme();
    const toast = useToast();
    const current = new Date(tx.transaction_date || tx.created_at);
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        return d;
    });
    const inRange = days.some((d) => sameDay(d, current));
    const [day, setDay] = useState<Date>(inRange ? new Date(current.getFullYear(), current.getMonth(), current.getDate()) : days[0]);
    const [time, setTime] = useState(time24(current));
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const m = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
        const h = m ? Number(m[1]) : NaN;
        const min = m ? Number(m[2]) : NaN;
        if (!m || h > 23 || min > 59) {
            setError('Use 24-hour time, like 13:02.');
            return;
        }
        const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min);
        if (when.getTime() > Date.now() + 60_000) {
            setError('That’s later than now. Pick an earlier time.');
            return;
        }
        setBusy(true);
        try {
            await changeWhen(tx, when);
            toast.show({ message: `Moved to ${dayHeading(when)}, ${time24(when)}` });
            onSaved(when);
        } catch (e) {
            console.error('Change date failed:', e);
            toast.show({ message: 'Couldn’t change the time. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {!inRange && (
                <Text size={13} tone="secondary">Currently {shortDate(current)}, {time24(current)}. You can move it to one of the last seven days.</Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                {days.map((d) => {
                    const active = sameDay(d, day);
                    const label = sameDay(d, today) ? 'Today' : d.getTime() === days[1].getTime() ? 'Yesterday' : `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${shortDate(d)}`;
                    return (
                        <Pressable
                            key={d.toDateString()}
                            onPress={() => setDay(d)}
                            hitSlop={HIT_SLOP}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            style={{
                                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                                backgroundColor: active ? colors.brand.accent : colors.bg.muted,
                            }}
                        >
                            <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-accent'] : colors.text.primary }}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            <View style={{ gap: 6 }}>
                <Text variant="row" tone="secondary">Time</Text>
                <TextInput
                    value={time}
                    onChangeText={(t) => { setTime(t); setError(null); }}
                    keyboardType="numbers-and-punctuation"
                    placeholder="13:02"
                    placeholderTextColor={colors.text.tertiary}
                    accessibilityLabel="Time, 24-hour"
                    maxLength={5}
                    style={{
                        fontFamily: FONT.semibold, fontSize: 17, color: colors.text.primary,
                        backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                        borderWidth: 1.5, borderColor: error ? colors.status.danger : 'transparent',
                    }}
                />
                {error && <FieldError message={error} />}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Back" variant="secondary" size="md" fill onPress={onBack} />
                <Button label="Save" size="md" fill busy={busy} onPress={save} />
            </View>
        </>
    );
}
