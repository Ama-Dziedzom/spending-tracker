import React, { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
    Banner, Button, Card, CategoryTile, Icon, ListGroup, ListRow, Screen, Text, TopBar, useToast,
} from '@/components/ui';
import { AddEntrySheet, type AddPrefill } from '@/components/transactions/add-entry-sheet';
import { pickStyle } from '@/components/transactions/pickers';
import { money } from '@/components/transactions/money';
import { useTheme } from '@/lib/theme';
import { readAlert, saveAlert, sentenceCase, sourceLabel, splitAlerts, type ReadAlert, type SaveOutcome } from '@/lib/sms-api';
import { dayHeading, listAmount, receivedAmount, time24 } from '@/lib/format';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Paste a message (Figma 1005:1279) and Paste · read (1005:1319). The manual
 * fallback: works for many alerts at once, same reader as autopilot, and
 * shows exactly what will be added before it's added.
 */
export default function Paste() {
    const { colors } = useTheme();
    const toast = useToast();
    const [text, setText] = useState('');
    const [focused, setFocused] = useState(false);
    const [reading, setReading] = useState(false);
    const [readError, setReadError] = useState(false);
    const [alerts, setAlerts] = useState<ReadAlert[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [editPrefill, setEditPrefill] = useState<AddPrefill | undefined>();

    const paste = async () => {
        try {
            // Lazy so an app built before expo-clipboard was added doesn't crash.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
            const s = await Clipboard.getStringAsync();
            if (s.trim()) setText(s);
            else toast.show({ message: 'Nothing copied yet. Copy an alert in Messages first.', icon: 'info' });
        } catch {
            toast.show({ message: 'Long-press the box and choose Paste.', icon: 'info' });
        }
    };

    const read = async () => {
        const parts = splitAlerts(text);
        if (parts.length === 0) return;
        setReading(true);
        setReadError(false);
        try {
            setAlerts(await Promise.all(parts.map(readAlert)));
        } catch (e) {
            console.error('Reading pasted alerts failed:', e);
            setReadError(true);
        } finally {
            setReading(false);
        }
    };

    const addAll = async () => {
        if (!alerts || saving) return;
        setSaving(true);
        const outcomes: SaveOutcome[] = [];
        for (const a of alerts) outcomes.push(await saveAlert(a.sms));
        setSaving(false);

        const logged = outcomes.filter((o) => o === 'logged').length;
        const dupes = outcomes.filter((o) => o === 'duplicate').length;
        const toCheck = outcomes.filter((o) => o === 'check').length;
        const failed = outcomes.filter((o) => o === 'failed').length;

        if (failed > 0 && logged + dupes + toCheck === 0) {
            toast.show({ message: 'Couldn’t add them. Check your connection and try again.', icon: 'alert' });
            return;
        }
        const first = alerts.find((a, i) => a.parsed && outcomes[i] === 'logged')?.parsed;
        const parts = [
            logged === 1 && first && alerts.length === 1
                ? `Logged · ${money(first.amount)} on ${pickStyle(first.category).label}`
                : logged > 0 ? `Logged ${logged} ${logged === 1 ? 'alert' : 'alerts'}` : null,
            dupes > 0 ? `${dupes} already logged` : null,
            toCheck > 0 ? `${toCheck} sent to Check` : null,
            failed > 0 ? `${failed} not sent, try again` : null,
        ].filter(Boolean);
        toast.show({ message: parts.join(' · ') });
        if (failed === 0) router.back();
        else setAlerts(alerts.filter((_, i) => outcomes[i] === 'failed'));
    };

    const readable = alerts?.filter((a) => a.parsed) ?? [];
    const unreadable = (alerts?.length ?? 0) - readable.length;
    const rows = readable.reduce((n, a) => n + 1 + (a.parsed!.fee > 0 ? 1 : 0), 0);
    const feeCategory = readable.find((a) => a.parsed!.fee > 0)?.parsed!.category;
    const addLabel = rows <= 1 ? 'Add it' : rows === 2 ? 'Add both' : `Add all ${rows}`;

    return (
        <>
            <Screen header={<TopBar title="Paste a message" />} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
                {!alerts ? (
                    <Card hero gap={16}>
                        <Text tone="secondary">Copy an alert from Messages and paste it here.</Text>
                        <TextInput
                            value={text}
                            onChangeText={(t) => { setText(t); setReadError(false); }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            multiline
                            placeholder="Payment for GHS 20.00 to …"
                            placeholderTextColor={colors.text.tertiary}
                            accessibilityLabel="Alert text"
                            textAlignVertical="top"
                            autoCorrect={false}
                            autoCapitalize="none"
                            style={{
                                minHeight: 120, maxHeight: 320,
                                backgroundColor: colors.bg.muted, borderRadius: 18, padding: 14, paddingTop: 14,
                                borderWidth: 1.5, borderColor: focused || text ? colors.brand.accent : 'transparent',
                                fontFamily: MONO, fontSize: 12, lineHeight: 19, color: colors.text.primary,
                            }}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Button label="Paste" icon="copy" variant="secondary" size="sm" fill onPress={paste} />
                            <Button label="Read it" size="sm" fill busy={reading} disabled={!text.trim()} onPress={read} />
                        </View>
                        {readError && (
                            <Banner
                                tone="danger"
                                title="Couldn’t read it right now"
                                body="Check your connection and try again. Nothing was added."
                                action={{ label: 'Try again', onPress: read }}
                            />
                        )}
                        <Text variant="meta" tone="tertiary">Tip: you can paste several alerts at once.</Text>
                    </Card>
                ) : (
                    <Card hero gap={16}>
                        {readable.length > 0 && (
                            <View style={{ backgroundColor: colors.status['success-tint'], borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Icon name="tick" size={18} color={colors.status.success} />
                                <Text size={13} weight="bold" tone="success">
                                    Read {readable.length} {readable.length === 1 ? 'alert' : 'alerts'}
                                </Text>
                            </View>
                        )}
                        {unreadable > 0 && (
                            <Banner
                                tone="warn"
                                title={`Couldn’t read ${unreadable} ${unreadable === 1 ? 'alert' : 'alerts'}`}
                                body="Adding sends it to Check, where you can fill it in with a few taps."
                            />
                        )}

                        {readable.length > 0 && (
                            <ListGroup bare>
                                {readable.flatMap((a, i) => {
                                    const p = a.parsed!;
                                    const s = pickStyle(p.isTransfer && p.category === 'transfer' ? 'transfer' : p.category);
                                    const when = a.date ?? new Date();
                                    const meta = `${sourceLabel(p.source)} · ${dayHeading(when)}, ${time24(when)}`;
                                    const into = p.type === 'credit';
                                    const out = [
                                        <ListRow
                                            key={`t${i}`}
                                            leading={<CategoryTile tone={s.tone} icon={s.icon} />}
                                            title={sentenceCase(p.description)}
                                            meta={meta}
                                            value={into ? receivedAmount(p.amount) : listAmount(p.amount)}
                                            valueTone={into ? 'success' : 'primary'}
                                        />,
                                    ];
                                    if (p.fee > 0) {
                                        out.push(
                                            <ListRow key={`f${i}`} leading={<CategoryTile tone="fees" icon="fees" />} title="Fee" meta={meta} value={listAmount(p.fee)} />,
                                        );
                                    }
                                    return out;
                                })}
                            </ListGroup>
                        )}

                        {feeCategory && (
                            <Text size={13} tone="secondary">
                                The fee is logged on its own so your {pickStyle(feeCategory).label} total stays honest.
                            </Text>
                        )}

                        <View style={{ gap: 8 }}>
                            <Button
                                label={readable.length === 0 ? 'Send to Check' : addLabel}
                                busy={saving}
                                busyLabel="Adding"
                                onPress={addAll}
                            />
                            {alerts.length === 1 && readable.length === 1 && readable[0].parsed!.fee === 0 ? (
                                <Button
                                    label="Edit first"
                                    variant="ghost"
                                    onPress={() => {
                                        const p = readable[0].parsed!;
                                        setEditPrefill({
                                            amount: String(p.amount),
                                            type: p.type === 'credit' ? 'income' : 'expense',
                                            description: sentenceCase(p.description),
                                            categoryId: p.category,
                                            date: (readable[0].date ?? new Date()).toISOString(),
                                            rawSms: readable[0].sms,
                                        });
                                    }}
                                />
                            ) : (
                                <Button label="Paste something else" variant="ghost" onPress={() => setAlerts(null)} />
                            )}
                        </View>
                    </Card>
                )}
            </Screen>

            <AddEntrySheet
                visible={!!editPrefill}
                prefill={editPrefill}
                onClose={() => setEditPrefill(undefined)}
                onSuccess={() => { setEditPrefill(undefined); router.back(); }}
            />
        </>
    );
}
