import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, CategoryTile, FieldError, Icon, Text, useToast } from '@/components/ui';
import { Tap } from '@/components/ui/tap';
import { FONT, HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { checkParts, logCashOutParts, partsOf, saveSplit, type SplitPart } from '@/lib/splits';
import { invalidateMoneyWindow } from '@/lib/money-window';
import { listAmount } from '@/lib/format';
import { CategoryGrid, SPENT_CATEGORIES, cleanAmount, parseAmount, pickStyle } from './pickers';
import { money } from './money';

interface Row { key: number; category: string; amount: string }

/**
 * Split one payment across categories (or, for a cash-out, say what the cash
 * went on). In a split, the first row is "the rest": it takes whatever the
 * other rows leave, so the parts always add up to the payment.
 */
export function SplitEditor({ tx, cashOut, onSaved, onBack }: {
    tx: TransactionWithWallet;
    /** A cash-out into the Cash wallet: parts are logged as cash spends; the rest stays in Cash. */
    cashOut: boolean;
    onSaved: (result: { category: string; splits: SplitPart[] | null } | null) => void;
    onBack: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const total = Number(tx.amount);
    const existing = cashOut ? null : partsOf(tx);

    const [rows, setRows] = useState<Row[]>(() => {
        if (cashOut) return [];
        if (existing) {
            const sorted = [...existing].sort((a, b) => b.amount - a.amount);
            return sorted.map((p, i) => ({ key: i, category: p.category, amount: i === 0 ? '' : String(p.amount) }));
        }
        return [{ key: 0, category: tx.category ?? 'other', amount: '' }];
    });
    const [picking, setPicking] = useState<number | 'new' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // In a split, row 0 is the rest; in a cash-out, every row is typed and the rest stays in Cash.
    const typed = cashOut ? rows : rows.slice(1);
    const typedSum = typed.reduce((s, r) => s + parseAmount(r.amount), 0);
    const rest = Math.round((total - typedSum) * 100) / 100;

    const options = useMemo(() => {
        const base = cashOut ? SPENT_CATEGORIES.filter((c) => c !== 'cash') : SPENT_CATEGORIES;
        const used = new Set(rows.filter((_, i) => i !== picking).map((r) => r.category));
        return base.filter((c) => !used.has(c));
    }, [rows, picking, cashOut]);

    const parts = (): SplitPart[] => cashOut
        ? rows.map((r) => ({ category: r.category, amount: parseAmount(r.amount) }))
        : [{ category: rows[0].category, amount: rest }, ...typed.map((r) => ({ category: r.category, amount: parseAmount(r.amount) }))];

    const problem = (): string | null => {
        if (cashOut) {
            if (rows.length === 0) return 'Add what the cash went on.';
            if (rows.some((r) => !(parseAmount(r.amount) > 0))) return 'Give every category an amount.';
            if (rest < 0) return `That’s ${money(-rest)} more than the cash-out.`;
            return null;
        }
        if (rows.length < 2) return 'Add a second category to split it.';
        if (rest <= 0) return `The other parts use up the whole ${money(total)}. Lower one of them.`;
        return checkParts(parts(), total);
    };

    const save = async () => {
        const p = problem();
        if (p) { setError(p); return; }
        setBusy(true);
        try {
            if (cashOut) {
                await logCashOutParts(tx, parts());
                invalidateMoneyWindow();
                toast.show({ message: rest > 0 ? `Logged · ${money(rest)} still in Cash` : 'Logged from your Cash' });
                onSaved(null);
            } else {
                const result = await saveSplit(tx, parts());
                invalidateMoneyWindow();
                toast.show({ message: `Split across ${result.splits?.length ?? 1} categories` });
                onSaved(result);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Couldn’t save that. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const unsplit = async () => {
        setBusy(true);
        try {
            const result = await saveSplit(tx, null);
            invalidateMoneyWindow();
            toast.show({ message: `Not split · ${pickStyle(result.category).label}` });
            onSaved(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Couldn’t save that. Try again.');
        } finally {
            setBusy(false);
        }
    };

    if (picking !== null) {
        return (
            <>
                <CategoryGrid
                    options={options}
                    selected={picking === 'new' ? null : rows[picking]?.category ?? null}
                    onPick={(id) => {
                        setError(null);
                        if (picking === 'new') setRows((r) => [...r, { key: Date.now(), category: id, amount: '' }]);
                        else setRows((r) => r.map((x, i) => (i === picking ? { ...x, category: id } : x)));
                        setPicking(null);
                    }}
                />
                <Button label="Back" variant="secondary" size="md" onPress={() => setPicking(null)} />
            </>
        );
    }

    return (
        <>
            <Text size={13} tone="secondary">
                {cashOut
                    ? `What did the ${money(total)} go on? Each part is logged from your Cash. Already logged some with Log cash? Only add what isn’t logged yet.`
                    : `Share the ${money(total)} across categories. The first one takes whatever the others leave.`}
            </Text>

            <View>
                {rows.map((r, i) => {
                    const isRest = !cashOut && i === 0;
                    const s = pickStyle(r.category);
                    return (
                        <View
                            key={r.key}
                            style={[
                                { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 56 },
                                i > 0 && { borderTopWidth: 1, borderTopColor: colors.line.default },
                            ]}
                        >
                            <Tap
                                onPress={() => setPicking(i)}
                                accessibilityRole="button"
                                accessibilityLabel={`${s.label}. Change category`}
                                style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 })}
                            >
                                <CategoryTile tone={s.tone} icon={s.icon} size={36} />
                                <View style={{ flex: 1 }}>
                                    <Text variant="row">{s.label}</Text>
                                    {isRest && <Text variant="meta" tone="secondary">The rest</Text>}
                                </View>
                            </Tap>
                            {isRest ? (
                                <Text weight="semibold" size={15} tone={rest > 0 ? 'primary' : 'secondary'}>
                                    {listAmount(Math.max(0, rest))}
                                </Text>
                            ) : (
                                <>
                                    <BottomSheetTextInput
                                        value={r.amount}
                                        onChangeText={(t) => { setError(null); setRows((all) => all.map((x) => (x.key === r.key ? { ...x, amount: cleanAmount(t) } : x))); }}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                        placeholderTextColor={colors.text.tertiary}
                                        accessibilityLabel={`${s.label} amount in cedis`}
                                        autoFocus={r.amount === '' && i === rows.length - 1}
                                        maxLength={12}
                                        style={{
                                            fontFamily: FONT.semibold, fontSize: 15, color: colors.text.primary, textAlign: 'right',
                                            backgroundColor: colors.bg.muted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 96,
                                        }}
                                    />
                                    <Tap
                                        onPress={() => { setError(null); setRows((all) => all.filter((x) => x.key !== r.key)); }}
                                        hitSlop={HIT_SLOP}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Remove ${s.label}`}
                                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                                    >
                                        <Icon name="close" size={18} color={colors.text.tertiary} />
                                    </Tap>
                                </>
                            )}
                        </View>
                    );
                })}
            </View>

            {options.length > 0 && (
                <Button
                    label={rows.length === 0 ? 'Add a category' : 'Add another category'}
                    icon="plus"
                    variant="ghost"
                    size="md"
                    onPress={() => setPicking('new')}
                />
            )}

            {cashOut && rows.length > 0 && (
                <Text size={13} tone={rest < 0 ? 'primary' : 'secondary'}>
                    {rest > 0 ? `${money(rest)} stays in Cash.` : rest === 0 ? 'All of it is accounted for.' : `${money(-rest)} more than the cash-out.`}
                </Text>
            )}

            {error && <FieldError message={error} />}

            <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Back" variant="secondary" size="md" fill onPress={onBack} />
                <Button label={cashOut ? 'Log it' : 'Save split'} size="md" fill busy={busy} onPress={save} />
            </View>
            {existing && (
                <Button label="Don’t split it" variant="ghost" size="md" disabled={busy} onPress={unsplit} />
            )}
        </>
    );
}
