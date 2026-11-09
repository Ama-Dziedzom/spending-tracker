import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Banner, Button, Card, CategoryTile, Dialog, Icon, ListGroup, ListRow, Screen, Sheet, SkeletonRow, Text,
    TopBar, useToast,
} from '@/components/ui';
import { AddEntrySheet } from '@/components/transactions/add-entry-sheet';
import { WalletList } from '@/components/transactions/pickers';
import { highlight } from '@/components/transactions/transaction-detail-sheet';
import { money } from '@/components/transactions/money';
import { getCheckItems, discardUnplaced, placeInWallet, providerOf, suggestWallets, type CheckItem } from '@/lib/check-service';
import { dismissReview, resolveReview } from '@/lib/review-service';
import { getWallets } from '@/lib/wallet-service';
import type { Wallet } from '@/lib/supabase';
import { categoryStyle } from '@/lib/category-style';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { useTheme } from '@/lib/theme';
import { listAmount, shortDate, time24 } from '@/lib/format';
import { RAW } from '@/constants/theme';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Phase = 'queue' | 'step' | 'learned' | 'done';

/**
 * Check (Figma 993:51, bottom row). Reached from the Spending banner or a
 * notification. A short, finite list: one question, one answer each.
 */
export default function Check() {
    const toast = useToast();
    const [items, setItems] = useState<CheckItem[] | null>(null);
    const [error, setError] = useState(false);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [phase, setPhase] = useState<Phase>('queue');
    const [index, setIndex] = useState(0);
    const [total, setTotal] = useState(0);
    const [learned, setLearned] = useState<{ title: string; meta: string } | null>(null);
    const [editing, setEditing] = useState<CheckItem & { kind: 'unread' } | null>(null);
    const [confirmSkip, setConfirmSkip] = useState(false);
    const [chosen, setChosen] = useState<Wallet | null>(null);
    const [pickOpen, setPickOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const [list, w] = await Promise.all([getCheckItems(), getWallets().catch(() => [] as Wallet[])]);
            setItems(list);
            setWallets(w);
            setError(false);
        } catch (e) {
            console.error('Error loading Check:', e);
            setError(true);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    // Live updates only while browsing the queue, so a step doesn't shift under you.
    useLiveRefresh(() => { if (phase === 'queue') load(); }, 'review');

    const current = phase === 'step' || phase === 'learned' ? items?.[index] ?? null : null;

    // Each "which account" step starts on LogIt's best guess.
    const currentId = current?.id;
    useEffect(() => {
        if (current?.kind === 'account') setChosen(suggestWallets(current.tx, wallets)[0] ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentId, wallets]);

    const start = () => {
        if (!items?.length) return;
        setTotal(items.length);
        setIndex(0);
        setPhase('step');
    };

    /** After an answer: show what was learned, then move on. */
    const advance = (shown: { title: string; meta: string } | null) => {
        const next = () => {
            setLearned(null);
            if (items && index + 1 < items.length) {
                setIndex(index + 1);
                setPhase('step');
            } else {
                setPhase('done');
            }
        };
        if (shown) {
            setLearned(shown);
            setPhase('learned');
            setTimeout(next, 1400);
        } else {
            next();
        }
    };

    const skip = async () => {
        setConfirmSkip(false);
        if (!current) return;
        try {
            if (current.kind === 'account') await discardUnplaced(current.tx);
            else if (!(await dismissReview(current.review.id))) throw new Error('Couldn’t skip it. Try again.');
            toast.show({ message: 'Skipped · not money' });
            advance(null);
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t skip it. Try again.', icon: 'alert' });
        }
    };

    if (phase === 'queue' || phase === 'done' || !current) {
        const empty = items !== null && items.length === 0;
        return (
            <Screen header={<TopBar title="Check" />}>
                {error && !items ? (
                    <Banner tone="danger" title="Couldn’t load Check" body="Check your connection and try again." action={{ label: 'Try again', onPress: load }} />
                ) : items === null ? (
                    <Card hero gap={18}><SkeletonRow /><SkeletonRow /></Card>
                ) : phase === 'done' || empty ? (
                    <AllCaughtUp />
                ) : (
                    <Queue items={items} onStart={start} />
                )}
            </Screen>
        );
    }

    return (
        <>
            <Screen header={<StepHeader index={index} total={total} />}>
                {phase === 'learned' && learned ? (
                    <Card hero style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                        <TickCircle />
                        <Text variant="cardTitle" align="center">{learned.title}</Text>
                        <Text size={13} tone="secondary" align="center">{learned.meta}</Text>
                    </Card>
                ) : current.kind === 'account' ? (
                    <AccountStep
                        key={current.id}
                        item={current}
                        wallets={wallets}
                        chosen={chosen}
                        onChoose={setChosen}
                        onPickAnother={() => setPickOpen(true)}
                        onDone={(wallet, remembered) => {
                            const p = providerOf(current.tx.source);
                            toast.show({
                                icon: 'sparkle',
                                message: remembered && p
                                    ? `Got it. ${p.type === 'bank' ? 'That card' : 'That wallet'} is ${wallet.name} from now on.`
                                    : `Added · ${money(Number(current.tx.amount))} to ${wallet.name}`,
                            });
                            advance({
                                title: `Added ${money(Number(current.tx.amount))}`,
                                meta: `${current.tx.description} · ${wallet.name}`,
                            });
                        }}
                        onNotMoney={() => setConfirmSkip(true)}
                    />
                ) : (
                    <UnreadStep key={current.id} item={current} onAdd={() => setEditing(current)} onNotMoney={() => setConfirmSkip(true)} />
                )}
            </Screen>

            <AddEntrySheet
                visible={!!editing}
                prefill={editing ? { ...editing.prefill, rawSms: editing.review.raw_sms } : undefined}
                onClose={() => setEditing(null)}
                onSuccess={async (txId) => {
                    if (!editing) return;
                    await resolveReview(editing.review.id, txId);
                    setEditing(null);
                    advance({ title: 'Added', meta: 'It’s in your transactions now.' });
                }}
            />

            <Sheet visible={pickOpen} onClose={() => setPickOpen(false)} title="Which account?">
                <WalletList wallets={wallets} selected={chosen?.id} onPick={(w) => { setChosen(w); setPickOpen(false); }} />
            </Sheet>

            <Dialog
                visible={confirmSkip}
                tone="neutral"
                icon="close"
                title="Not a transaction?"
                body="LogIt will skip it and it won’t count anywhere."
                cancelLabel="Cancel"
                confirmLabel="Skip it"
                onCancel={() => setConfirmSkip(false)}
                onConfirm={skip}
            />
        </>
    );
}

// ---------------------------------------------------------------------------

function itemTitle(item: CheckItem): string {
    if (item.kind === 'account') {
        const t = item.tx;
        const into = t.type === 'income' || t.type === 'credit';
        return `${money(Number(t.amount))} ${into ? 'from' : 'at'} ${t.description}`;
    }
    const p = item.prefill;
    if (p.amount) return `${money(Number(p.amount))}${p.description ? ` ${p.type === 'income' ? 'from' : 'to'} ${p.description}` : ''}`;
    return 'A message I couldn’t read';
}

function itemMeta(item: CheckItem): string {
    if (item.kind === 'account') {
        const p = providerOf(item.tx.source);
        return [p?.name ?? item.tx.source, shortDate(new Date(item.tx.transaction_date)), 'which account?'].filter(Boolean).join(' · ');
    }
    return [item.review.guess?.provider, shortDate(new Date(item.review.created_at)), 'what was it?'].filter(Boolean).join(' · ');
}

/** Check · queue (Figma 1007:1175). */
function Queue({ items, onStart }: { items: CheckItem[]; onStart: () => void }) {
    return (
        <Card hero gap={12}>
            <Text size={13} tone="secondary">
                {items.length} {items.length === 1 ? 'message' : 'messages'} I couldn’t read on my own. Each takes a tap.
            </Text>
            <ListGroup bare>
                {items.map((item) => (
                    <ListRow
                        key={item.id}
                        leading={<CategoryTile tone={item.kind === 'account' ? 'accent' : 'muted'} icon={item.kind === 'account' ? (providerOf(item.tx.source)?.type === 'momo' ? 'wallet' : 'bank') : 'message'} />}
                        title={itemTitle(item)}
                        meta={itemMeta(item)}
                        trailing="chevron"
                        onPress={onStart}
                    />
                ))}
            </ListGroup>
            <Button label="Start" onPress={onStart} />
        </Card>
    );
}

/** Close, title, "1 of 2" and a segment per item (Figma 1007:1235). */
function StepHeader({ index, total }: { index: number; total: number }) {
    return (
        <View>
            <TopBar
                title="Check"
                leading="close"
                onLeading={() => router.back()}
                right={
                    <View style={{ backgroundColor: RAW.onBandFill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text size={12} weight="bold" tone="onBand">{index + 1} of {total}</Text>
                    </View>
                }
            />
            <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: 22, marginTop: -10, marginBottom: 16 }} accessibilityElementsHidden>
                {Array.from({ length: total }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= index ? RAW.onBand : RAW.onBandFill }} />
                ))}
            </View>
        </View>
    );
}

/** The alert with what LogIt read in blue, and the card name it's unsure of underlined in amber. */
function Message({ sms, description }: { sms: string; description: string }) {
    const { colors } = useTheme();
    const base = { fontFamily: MONO, fontSize: 12, lineHeight: 19 } as const;
    const UNSURE = /(VISA|MASTERCARD)[A-Z ]*?(PREPAID|DEBIT|CREDIT|CLASSIC|GOLD|PLATINUM)( [A-Z]+)?|card ending \d{3,4}|[A-Z]+ CASH LOAN/i;
    const parts = highlight(sms, description).flatMap((p) => {
        if (p.mark) return [{ ...p, unsure: false }];
        const m = UNSURE.exec(p.text);
        if (!m) return [{ ...p, unsure: false }];
        return [
            { text: p.text.slice(0, m.index), mark: false, unsure: false },
            { text: m[0], mark: false, unsure: true },
            { text: p.text.slice(m.index + m[0].length), mark: false, unsure: false },
        ];
    });
    return (
        <View style={{ backgroundColor: colors.bg.muted, borderRadius: 16, padding: 14 }}>
            <Text style={{ ...base, color: colors.text.secondary }} selectable>
                {parts.map((p, i) => (
                    <Text
                        key={i}
                        style={
                            p.mark ? { ...base, fontWeight: '600', color: colors.brand['accent-text'] }
                                : p.unsure ? { ...base, fontWeight: '600', color: colors.status.warn, textDecorationLine: 'underline', textDecorationColor: colors.status.warn }
                                    : { ...base, color: colors.text.secondary }
                        }
                    >
                        {p.text}
                    </Text>
                ))}
            </Text>
        </View>
    );
}

function SourceHeader({ icon, name, date }: { icon: 'bank' | 'wallet' | 'message'; name: string; date: Date }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CategoryTile tone="muted" icon={icon} size={32} />
            <View style={{ flex: 1 }}>
                <Text size={14} weight="bold">{name}</Text>
                <Text variant="meta" tone="secondary">{shortDate(date)} · {time24(date)}</Text>
            </View>
        </View>
    );
}

/** One answer chip: ink when chosen (Figma 1007:1235). */
function AnswerChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 999, backgroundColor: active ? colors.brand['ink-button'] : colors.bg.muted }}
        >
            <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-ink-button'] : colors.text.secondary }}>{label}</Text>
        </Pressable>
    );
}

function NotMoneyLink({ onPress }: { onPress: () => void }) {
    return (
        <Pressable onPress={onPress} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }} style={{ alignSelf: 'center', paddingVertical: 6 }}>
            <Text size={13} weight="bold" tone="secondary">Not money</Text>
        </Pressable>
    );
}

/** Check · which account (Figma 1007:1235). */
function AccountStep({ item, wallets, chosen, onChoose, onPickAnother, onDone, onNotMoney }: {
    item: CheckItem & { kind: 'account' };
    wallets: Wallet[];
    chosen: Wallet | null;
    onChoose: (w: Wallet) => void;
    onPickAnother: () => void;
    onDone: (wallet: Wallet, remembered: boolean) => void;
    onNotMoney: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const tx = item.tx;
    const provider = providerOf(tx.source);
    const shown = suggestWallets(tx, wallets)[0];
    const [remember, setRemember] = useState(true);
    const [busy, setBusy] = useState(false);
    const style = categoryStyle(tx.category);
    const into = tx.type === 'income' || tx.type === 'credit';
    const isCard = provider?.type === 'bank' || /card/i.test(tx.raw_sms ?? '');

    const add = async () => {
        if (!chosen) return;
        setBusy(true);
        try {
            const { remembered } = await placeInWallet(tx, chosen, remember && !!provider);
            onDone(chosen, remembered);
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t add it. Try again.', icon: 'alert' });
            setBusy(false);
        }
    };

    return (
        <Card hero gap={16}>
            <SourceHeader icon={provider?.type === 'momo' ? 'wallet' : 'bank'} name={provider?.name ?? tx.source ?? 'Alert'} date={new Date(tx.transaction_date)} />
            {tx.raw_sms && <Message sms={tx.raw_sms} description={tx.description} />}
            <Text size={15} weight="bold">{isCard ? 'Which account is this card?' : 'Which account is this?'}</Text>
            {wallets.length === 0 ? (
                <Text size={13} tone="secondary">You have no wallets yet. Add one in Wallets, then come back.</Text>
            ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                    {shown && <AnswerChip label={shown.name} active={chosen?.id === shown.id} onPress={() => onChoose(shown)} />}
                    {chosen && chosen.id !== shown?.id && <AnswerChip label={chosen.name} active onPress={onPickAnother} />}
                    <AnswerChip label="Another account" active={false} onPress={onPickAnother} />
                </View>
            )}
            <ListRow
                leading={<CategoryTile tone={style.tone} icon={style.icon} />}
                title={tx.description}
                meta={`${style.label} · ${shortDate(new Date(tx.transaction_date))}`}
                value={into ? `+${listAmount(Number(tx.amount))}` : listAmount(Number(tx.amount))}
                valueTone={into ? 'success' : 'primary'}
            />
            {provider && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text variant="row" style={{ flex: 1 }}>{isCard ? 'Remember this card' : `Remember ${provider.name}`}</Text>
                    <Switch
                        value={remember}
                        onValueChange={setRemember}
                        trackColor={{ false: colors.line.default, true: colors.brand.accent }}
                        thumbColor={colors.brand['on-accent']}
                        ios_backgroundColor={colors.line.default}
                        accessibilityLabel={isCard ? 'Remember this card' : `Remember ${provider.name}`}
                    />
                </View>
            )}
            <Button label={`Add ${money(Number(tx.amount))}`} variant="ink" busy={busy} disabled={!chosen} onPress={add} />
            <NotMoneyLink onPress={onNotMoney} />
        </Card>
    );
}

/** An alert LogIt couldn't read: fill it in (pre-filled from the text), or skip it. */
function UnreadStep({ item, onAdd, onNotMoney }: { item: CheckItem & { kind: 'unread' }; onAdd: () => void; onNotMoney: () => void }) {
    const p = item.prefill;
    const into = p.type === 'income';
    return (
        <Card hero gap={16}>
            <SourceHeader icon="message" name={item.review.guess?.provider ?? 'Message'} date={new Date(item.review.created_at)} />
            <Message sms={item.review.raw_sms} description={p.description ?? ''} />
            <Text size={15} weight="bold">I couldn’t read this one. What was it?</Text>
            {p.amount && (
                <ListRow
                    leading={<CategoryTile tone={into ? 'success' : 'muted'} icon={into ? 'receive' : 'sent'} />}
                    title={p.description ?? (into ? 'Money in' : 'Money out')}
                    meta="My best guess · you can change it"
                    value={into ? `+${listAmount(Number(p.amount))}` : listAmount(Number(p.amount))}
                    valueTone={into ? 'success' : 'primary'}
                />
            )}
            <Button label={p.amount ? `Add ${money(Number(p.amount))}` : 'Fill it in'} variant="ink" onPress={onAdd} />
            <NotMoneyLink onPress={onNotMoney} />
        </Card>
    );
}

function TickCircle() {
    const { colors } = useTheme();
    return (
        <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: colors.status['success-tint'], alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="tick" size={26} color={colors.status.success} />
        </View>
    );
}

/** Check · all caught up (Figma 1007:1421). The Spending banner disappears with it. */
function AllCaughtUp() {
    const insets = useSafeAreaInsets();
    return (
        <Card hero style={{ alignItems: 'center', paddingVertical: 32, gap: 10, marginBottom: insets.bottom }}>
            <TickCircle />
            <Text variant="screenTitle" size={20} align="center">All caught up</Text>
            <Text size={13} tone="secondary" align="center">Anything LogIt can’t read on its own will wait here. Nothing gets lost.</Text>
            <Button label="Back to spending" variant="secondary" size="sm" onPress={() => router.dismissTo('/')} style={{ marginTop: 6 }} />
        </Card>
    );
}
