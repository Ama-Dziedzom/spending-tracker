import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, CategoryTile, Icon, Sheet, Tap, Text, useToast } from '@/components/ui';
import { AmountInput, CategoryGrid, SPENT_CATEGORIES, parseAmount, pickStyle } from '@/components/transactions/pickers';
import { HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { WEEKDAYS, removeLimit, saveLimit, type Limit } from '@/lib/limits';
import { cedis } from '@/lib/money-window';

type Mode = 'category' | 'amount' | 'reset' | 'warn';

const WARN_OPTIONS: (number | null)[] = [0.7, 0.8, 0.9, null];

/** "84" → 100: round up to the next 10 above a little headroom. */
const nice = (n: number) => Math.max(10, Math.ceil(n / 10) * 10);

/**
 * Set a limit (Figma 1044:5193). Starts from what you actually spend. One
 * number, a sensible reset day, and a warning before you hit it. No
 * budgeting jargon.
 */
export function SetLimitSheet({ visible, category: initialCategory, usual, existing, onClose, onSaved, taken = [] }: {
    visible: boolean;
    /** Preset category (from an insight); null asks first. */
    category: string | null;
    /** What you usually spend in a week on it (for the suggestions). */
    usual: (category: string) => number;
    existing?: Limit | null;
    onClose: () => void;
    onSaved: () => void;
    /** Categories that already have a limit (hidden when picking). */
    taken?: string[];
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [mode, setMode] = useState<Mode>('amount');
    const [category, setCategory] = useState<string | null>(initialCategory);
    const [amount, setAmount] = useState('');
    const [resetDay, setResetDay] = useState(1);
    const [warnAt, setWarnAt] = useState<number | null>(0.8);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const c = existing?.category ?? initialCategory;
        setCategory(c);
        setMode(c ? 'amount' : 'category');
        setResetDay(existing?.reset_day ?? 1);
        setWarnAt(existing ? existing.warn_at : 0.8);
        setAmount(existing ? String(existing.amount) : c && usual(c) > 0 ? String(nice(usual(c) * 1.2)) : '');
        setBusy(false);
    }, [visible, existing, initialCategory, usual]);

    const style = category ? pickStyle(category) : null;
    const typical = category ? usual(category) : 0;
    const value = parseAmount(amount);
    const suggestions = typical > 0 ? [Math.round(typical), nice(typical * 1.2), nice(typical * 1.4)] : [];

    const save = async () => {
        if (!category || value <= 0) return;
        setBusy(true);
        try {
            await saveLimit({ category, amount: value, reset_day: resetDay, warn_at: warnAt });
            toast.show({ message: `Limit set · GHS ${cedis(value)} a week on ${style!.label}` });
            onSaved();
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save the limit.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!existing) return;
        try {
            await removeLimit(existing.id);
            toast.show({ message: `Removed · ${style?.label ?? ''} limit` });
            onSaved();
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t remove it.', icon: 'alert' });
        }
    };

    const warnLabel = warnAt === null ? 'Off' : `${Math.round(warnAt * 100)}%${value > 0 ? ` · GHS ${cedis(value * warnAt)}` : ''}`;

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            raised
            title={mode === 'category' ? 'Limit which category?' : mode === 'reset' ? 'Week starts on' : mode === 'warn' ? 'Warn me at' : undefined}
            footer={mode === 'amount' ? (
                <>
                    <Button label={existing ? 'Save limit' : 'Set limit'} busy={busy} disabled={value <= 0} onPress={save} />
                    {existing && <Button label="Remove limit" variant="ghost" onPress={remove} />}
                </>
            ) : undefined}
        >
            {mode === 'category' && (
                <CategoryGrid
                    options={SPENT_CATEGORIES.filter((c) => !taken.includes(c) && c !== 'transfer')}
                    selected={category}
                    onPick={(id) => {
                        setCategory(id);
                        const u = usual(id);
                        setAmount(u > 0 ? String(nice(u * 1.2)) : '');
                        setTimeout(() => setMode('amount'), 200);
                    }}
                />
            )}

            {mode === 'amount' && style && (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <CategoryTile tone={style.tone} icon={style.icon} size={36} />
                        <View style={{ flex: 1 }}>
                            <Text size={18} weight="bold">Weekly limit for {style.label}</Text>
                            <Text size={13} tone="secondary">
                                {typical > 0 ? `You usually spend about GHS ${cedis(typical)}` : 'Pick a number that feels right for a week'}
                            </Text>
                        </View>
                    </View>
                    <AmountInput value={amount} onChange={setAmount} size={48} />
                    {suggestions.length > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                            {suggestions.map((s, i) => {
                                const active = value === s;
                                return (
                                    <Pressable
                                        key={i}
                                        onPress={() => setAmount(String(s))}
                                        hitSlop={HIT_SLOP}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        style={{ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 999, backgroundColor: active ? colors.brand.accent : colors.bg.muted }}
                                    >
                                        <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-accent'] : colors.text.primary }}>
                                            {i === 0 ? `${s} · usual` : s}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                    <View style={{ backgroundColor: colors.bg.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line.default, paddingHorizontal: 14, paddingVertical: 2 }}>
                        <SettingRow label="Resets" value={`Every ${WEEKDAYS[resetDay - 1]}`} onPress={() => setMode('reset')} />
                        <SettingRow label="Warn me at" value={warnLabel} onPress={() => setMode('warn')} divider />
                    </View>
                </>
            )}

            {mode === 'reset' && (
                <ChoiceList
                    options={WEEKDAYS.map((d, i) => ({ key: String(i + 1), label: d, selected: resetDay === i + 1 }))}
                    onPick={(k) => { setResetDay(Number(k)); setMode('amount'); }}
                />
            )}

            {mode === 'warn' && (
                <ChoiceList
                    options={WARN_OPTIONS.map((w) => ({
                        key: String(w),
                        label: w === null ? 'Don’t warn me' : `${Math.round(w * 100)}%${value > 0 ? ` · at GHS ${cedis(value * w)}` : ''}`,
                        selected: warnAt === w,
                    }))}
                    onPick={(k) => { setWarnAt(k === 'null' ? null : Number(k)); setMode('amount'); }}
                />
            )}
        </Sheet>
    );
}

/** "Resets · Every Monday ›" (Figma 1044:5272). */
function SettingRow({ label, value, onPress, divider }: { label: string; value: string; onPress: () => void; divider?: boolean }) {
    const { colors } = useTheme();
    return (
        <Tap
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${value}`}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 12 }, divider ? { borderTopWidth: 1, borderTopColor: colors.line.default } : null]}
        >
            <Text size={14} weight="semibold" style={{ flex: 1 }}>{label}</Text>
            <Text size={13} weight="medium" tone="secondary">{value}</Text>
            <Icon name="next" size={14} color={colors.text.tertiary} />
        </Tap>
    );
}

function ChoiceList({ options, onPick }: { options: { key: string; label: string; selected: boolean }[]; onPick: (key: string) => void }) {
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.bg.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line.default, paddingHorizontal: 14 }} accessibilityRole="radiogroup">
            {options.map((o, i) => (
                <Tap
                    key={o.key}
                    onPress={() => onPick(o.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: o.selected }}
                    style={[{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }, i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line.default } : null]}
                >
                    <Text size={14} weight={o.selected ? 'bold' : 'semibold'} style={{ flex: 1 }}>{o.label}</Text>
                    {o.selected && <Icon name="tick" size={18} color={colors.brand['accent-text']} />}
                </Tap>
            ))}
        </View>
    );
}
