import React, { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, CategoryTile, FieldError, Icon, ListGroup, ListRow, Text } from '@/components/ui';
import { FONT, HIT_SLOP } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import type { Wallet } from '@/lib/supabase';
import { getWallets } from '@/lib/wallet-service';
import { categoryStyle } from '@/lib/category-style';
import { sameDay, shortDate, time24 } from '@/lib/format';

/**
 * Pieces shared by Transaction detail, Add manually and Log cash
 * (Figma 1005:804, 1005:1055, 1005:1161): the same tiles, rows and inputs
 * everywhere.
 */

/** Category choices, in the design's order (Figma 1005:911). */
export const SPENT_CATEGORIES = ['food', 'shopping', 'airtime', 'bills', 'transport', 'transfer', 'cash', 'subscription', 'fees', 'loans', 'other'];
export const IN_CATEGORIES = ['income', 'transfer', 'gifts', 'loans', 'other'];

/** Style for a category id; money to or from a person is "People". */
export function pickStyle(id: string) {
    return id === 'transfer' ? { tone: 'people' as const, icon: 'people' as const, label: 'People' } : categoryStyle(id);
}

/** Three-column tile grid (Figma 1005:965). */
export function CategoryGrid({ options, selected, onPick, disabled }: {
    options: string[];
    selected: string | null;
    onPick: (id: string) => void;
    disabled?: boolean;
}) {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const tileWidth = Math.floor((Math.min(width, 520) - 40 - 20) / 3);
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
            {options.map((id) => {
                const s = pickStyle(id);
                const active = id === selected;
                return (
                    <Pressable
                        key={id}
                        onPress={() => onPick(id)}
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active, disabled }}
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
    );
}

/** "Category · Shopping ›". 44+ tall, label left, value and chevron right. */
export function FactRow({ label, value, onPress, divider, accessibilityLabel }: {
    label: string;
    value: React.ReactNode;
    onPress?: () => void;
    divider?: boolean;
    accessibilityLabel?: string;
}) {
    const { colors } = useTheme();
    const body = (
        <View
            style={[
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 44 },
                divider && { borderTopWidth: 1, borderTopColor: colors.line.default },
            ]}
        >
            <Text variant="row" tone="secondary">{label}</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                {value}
                {onPress && <Icon name="next" size={16} color={colors.text.tertiary} />}
            </View>
        </View>
    );
    if (!onPress) return body;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? `Change ${label.toLowerCase()}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
            {body}
        </Pressable>
    );
}

/** Small tile + label for the Category fact row. */
export function CategoryValue({ id }: { id: string }) {
    const s = pickStyle(id);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CategoryTile tone={s.tone} icon={s.icon} size={24} />
            <Text variant="row">{s.label}</Text>
        </View>
    );
}

/** Wallet list with a tick on the current one. Loads wallets itself unless given. */
export function WalletList({ selected, onPick, wallets: given, exclude }: {
    selected?: string | null;
    onPick: (w: Wallet) => void;
    wallets?: Wallet[];
    /** Hide one wallet (the "from" side of a move). */
    exclude?: string | null;
}) {
    const { colors } = useTheme();
    const [loaded, setLoaded] = useState<Wallet[] | null>(given ?? null);
    useEffect(() => {
        if (given) { setLoaded(given); return; }
        getWallets().then(setLoaded).catch(() => setLoaded([]));
    }, [given]);

    if (loaded === null) return <Text tone="secondary">Loading your wallets…</Text>;
    const list = loaded.filter((w) => w.id !== exclude);
    if (list.length === 0) return <Text tone="secondary">You have no other wallets yet. Add one from the Wallets tab.</Text>;
    return (
        <ListGroup bare>
            {list.map((w) => (
                <ListRow
                    key={w.id}
                    leading={<CategoryTile tone={w.type === 'cash' ? 'cash' : 'muted'} icon={w.type === 'cash' ? 'cash' : w.type === 'bank' ? 'bank' : 'wallet'} />}
                    title={w.name}
                    trailing={w.id === selected ? <Icon name="tick" size={18} color={colors.brand['accent-text']} /> : 'none'}
                    onPress={() => onPick(w)}
                    accessibilityLabel={`${w.name}${w.id === selected ? ', current' : ''}`}
                />
            ))}
        </ListGroup>
    );
}

/** "Today", "Yesterday", "Mon 3 Nov". */
function dayChipLabel(d: Date, today: Date): string {
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, y)) return 'Yesterday';
    return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${shortDate(d)}`;
}

/**
 * The last seven days as chips, then a 24-hour time. JS only, so it works
 * without a native date picker.
 */
export function WhenForm({ initial, onSave, onBack, saveLabel = 'Save' }: {
    initial: Date;
    onSave: (d: Date) => Promise<void> | void;
    onBack: () => void;
    saveLabel?: string;
}) {
    const { colors } = useTheme();
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    const inRange = days.some((d) => sameDay(d, initial));
    const [day, setDay] = useState<Date>(inRange ? new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()) : days[0]);
    const [time, setTime] = useState(time24(initial));
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
            await onSave(when);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {!inRange && (
                <Text size={13} tone="secondary">Currently {shortDate(initial)}, {time24(initial)}. You can move it to one of the last seven days.</Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
                {days.map((d) => {
                    const active = sameDay(d, day);
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
                            <Text size={13} weight="bold" style={{ color: active ? colors.brand['on-accent'] : colors.text.primary }}>
                                {dayChipLabel(d, today)}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <View style={{ gap: 6 }}>
                <Text variant="row" tone="secondary">Time</Text>
                <BottomSheetTextInput
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
                <Button label={saveLabel} size="md" fill busy={busy} onPress={save} />
            </View>
        </>
    );
}

/**
 * Big amount entry: "GHS 45|" (Figma 1005:1120). Digits and one decimal
 * point, up to two decimals.
 */
export function AmountInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, paddingVertical: 10 }}>
            <Text size={18} weight="bold" tone="tertiary">GHS</Text>
            <BottomSheetTextInput
                value={value}
                onChangeText={(t) => onChange(cleanAmount(t))}
                keyboardType="decimal-pad"
                autoFocus={autoFocus}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                selectionColor={colors.brand.accent}
                cursorColor={colors.brand.accent}
                accessibilityLabel="Amount in cedis"
                maxLength={12}
                style={{
                    fontFamily: FONT.extrabold, fontSize: 52, letterSpacing: -2.08,
                    color: colors.text.primary, minWidth: 40, padding: 0, textAlign: 'center',
                }}
            />
        </View>
    );
}

/** Keep digits and the first decimal point, at most two decimals; commas are dropped. */
export function cleanAmount(t: string): string {
    const s = t.replace(/[^\d.]/g, '');
    const [whole, ...rest] = s.split('.');
    if (rest.length === 0) return whole.replace(/^0+(?=\d)/, '');
    return `${whole.replace(/^0+(?=\d)/, '') || '0'}.${rest.join('').slice(0, 2)}`;
}

export function parseAmount(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
