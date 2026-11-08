import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, CategoryTile, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { IncomePrompt } from '@/lib/income-service';
import { ordinal } from '@/lib/income-service';
import { ghs } from '@/lib/format';

/**
 * "Did your salary come in?" (Figma 1002:627). Only for banks that don't send
 * credit alerts. Appears on the day, gone after one tap.
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
    const meta = [`Usually around the ${ordinal(prompt.item.day_of_month)}`, walletName].filter(Boolean).join(' · ');

    return (
        <Card hero gap={14}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <CategoryTile tone="success" icon="receive" size={34} />
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="row" weight="bold">Did your {label} come in?</Text>
                    <Text variant="meta" tone="secondary">{meta}</Text>
                </View>
            </View>
            <Text size={13} tone="secondary">
                Your bank doesn’t text when money arrives, so I’m checking.
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
                <Text size={13} weight="semibold" tone="secondary">Not yet</Text>
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
                <Text size={15} weight="bold" tone="secondary">GHS</Text>
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
