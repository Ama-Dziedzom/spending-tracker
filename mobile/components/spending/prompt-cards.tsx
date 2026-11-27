import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, CategoryTile, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { IncomePrompt } from '@/lib/income-service';
import { ghs } from '@/lib/format';
import { curLabel } from '@/lib/currency';

/**
 * "Has your salary come in?" (Figma "Salary check"). Only for banks that don't
 * send credit alerts. From the due day it's here every day until it's answered.
 */
export function SalaryPromptCard({ prompt, walletName, onYes, onDifferent, onNotYet }: {
    prompt: IncomePrompt;
    walletName?: string;
    onYes: () => Promise<void>;
    onDifferent: () => void;
    onNotYet: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const label = prompt.item.label.toLowerCase();
    const today = new Date();
    const onTheDay = prompt.dueDate.toDateString() === today.toDateString();
    const due = onTheDay ? 'Due today' : `Due ${prompt.dueDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
    const meta = [due, walletName].filter(Boolean).join(' · ');

    return (
        <Card hero gap={14}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <CategoryTile tone="success" icon="receive" size={34} />
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="row" weight="bold">Has your {label} come in?</Text>
                    <Text variant="meta" tone="secondary">{meta}</Text>
                </View>
            </View>
            <Text size={13} tone="secondary">
                Your bank doesn’t text when money arrives. I’ll ask each morning until it’s in.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                    label={`Yes, ${ghs(prompt.item.amount)}`}
                    size="md"
                    busy={busy}
                    busyLabel="Logging"
                    fill
                    onPress={async () => {
                        setBusy(true);
                        try { await onYes(); } finally { setBusy(false); }
                    }}
                />
                <Button label="Different amount" variant="secondary" size="md" fill onPress={onDifferent} />
            </View>
            <Pressable onPress={onNotYet} accessibilityRole="button" hitSlop={12} style={{ alignSelf: 'center' }}>
                <Text size={13} weight="semibold" tone="secondary">Not yet, ask tomorrow</Text>
            </Pressable>
        </Card>
    );
}

/**
 * After "Yes" (Figma "Salary check · logged"): says it was counted and where
 * the money went, with Undo. Goes when you leave Spending.
 */
export function SalaryLoggedCard({ label, amount, walletName, balance, onUndo }: {
    label: string;
    amount: number;
    walletName?: string;
    balance?: number;
    onUndo: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
    return (
        <Card hero gap={14}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <CategoryTile tone="success" icon="tick" size={34} />
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="row" weight="bold">{label} in · {ghs(amount)}</Text>
                    <Text variant="meta" tone="secondary">Counted as income for {month}</Text>
                </View>
            </View>
            {walletName && (
                <Text size={13} tone="secondary">
                    Added to {walletName}.{balance !== undefined ? ` Its balance is now ${ghs(balance)}.` : ''}
                </Text>
            )}
            <Pressable
                onPress={async () => { if (busy) return; setBusy(true); try { await onUndo(); } finally { setBusy(false); } }}
                accessibilityRole="button"
                hitSlop={12}
                style={{ alignSelf: 'center' }}
            >
                <Text size={13} weight="semibold" tone="secondary">{busy ? 'Undoing…' : 'Undo'}</Text>
            </Pressable>
        </Card>
    );
}

/** First run (Figma 1002:743): ghost bars, autopilot first, paste as the low-effort try. */
export function FirstRunCard({ onAutopilot, onPaste }: { onAutopilot: () => void; onPaste: () => void }) {
    const { colors } = useTheme();
    const ghost = [16, 30, 12, 40, 22, 44, 26];
    return (
        <Card hero gap={14}>
            <Text size={13} weight="semibold" tone="secondary">Spent this week</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text size={15} weight="bold" tone="secondary">{curLabel()}</Text>
                <Text variant="hero">0</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 48 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {ghost.map((h, i) => <View key={i} style={{ width: 34, height: h, borderRadius: 10, backgroundColor: colors.bg.muted }} />)}
            </View>
            <View style={{ gap: 6 }}>
                <Text variant="cardTitle" size={16}>Your week fills in by itself</Text>
                <Text size={13} tone="secondary">
                    Turn on autopilot and every MoMo and bank alert lands here. Or paste one to try.
                </Text>
            </View>
            <Button label="Turn on autopilot" icon="flash" onPress={onAutopilot} size="md" />
            <Button label="Paste a message" icon="paste" variant="secondary" onPress={onPaste} size="md" />
        </Card>
    );
}
