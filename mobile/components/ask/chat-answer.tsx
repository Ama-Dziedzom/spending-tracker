import React from 'react';
import { View } from 'react-native';
import { AnswerAction, LogItLabel, SuggestionRow, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { ChatCard, ChatReply } from '@/lib/ask-chat';
import type { Answer } from '@/lib/ask-engine';
import { categoryStyle } from '@/lib/category-style';
import { initials } from '@/lib/format';
import { AnswerView } from './answer-view';

/**
 * A reply from LogIt's chat. When the server sends a card, it's drawn with
 * the same answer shapes as the on-device answers (Figma "Answer shapes"
 * 1045:5607: Total, Verdict, Ranking). Chatty replies ("note") stay a short
 * bubble.
 */
export function ChatAnswer({ reply, onFollowUp, onCopy, onRefresh }: {
    reply: ChatReply;
    onFollowUp: (q: string) => void;
    onCopy: () => void;
    onRefresh: () => void;
}) {
    const { colors, shadows } = useTheme();
    const shaped = reply.card ? toAnswer(reply.card, reply.suggestions) : null;
    if (shaped) {
        return (
            <AnswerView
                answer={shaped}
                onFollowUp={onFollowUp}
                onSource={() => {}}
                onCopy={onCopy}
                onRefresh={onRefresh}
                onFix={() => {}}
            />
        );
    }
    const text = reply.card?.sentence ?? reply.reply;
    return (
        <View style={{ gap: 12 }}>
            <LogItLabel />
            <View style={{ alignSelf: 'flex-start', maxWidth: '92%', padding: 14, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: colors.bg.surface, ...shadows.card }}>
                <Text size={15} weight="medium" style={{ lineHeight: 22 }} selectable>{text}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
                <AnswerAction icon="copy" label="Copy answer" onPress={onCopy} />
                <AnswerAction icon="refresh" label="Ask again with the latest numbers" onPress={onRefresh} />
            </View>
            {reply.suggestions.length > 0 && (
                <View style={{ gap: 8 }}>
                    {reply.suggestions.map((s) => <SuggestionRow key={s} label={s} onPress={() => onFollowUp(s)} />)}
                </View>
            )}
        </View>
    );
}

const SOURCE = { label: 'From your LogIt data', icon: 'paste' as const, txs: [] };
/** A real category gets its tile; people and places get initials, as in Figma 1045:5425. */
const KNOWN = (id: string) => !!id && id !== 'people' && categoryStyle(id).tone !== 'muted';

/** Server card → the Answer the shared AnswerView draws. Null for a plain note. */
function toAnswer(c: ChatCard, followUps: string[]): Answer | null {
    if (c.shape === 'total') {
        const lead = c.bars.find((b) => b.current);
        return {
            shape: 'total',
            amount: c.amount,
            unit: c.unit,
            sentence: c.sentence,
            chart: c.bars.length >= 2
                ? { title: c.chartTitle || 'Compared', delta: c.delta || undefined, color: 'accent', rows: c.bars.map((b) => ({ label: b.label, value: b.value, current: b === lead })) }
                : undefined,
            source: SOURCE,
            followUps,
            context: {},
        };
    }
    if (c.shape === 'verdict') {
        const tagIcon = c.tagTone === 'success' ? 'tick' as const : c.tagTone === 'warn' ? 'info' as const : undefined;
        return {
            shape: 'verdict',
            tag: c.tag,
            tagTone: c.tagTone,
            tagIcon,
            sentence: c.sentence,
            rows: c.rows.map((r) => ({ label: r.label, value: r.display || String(Math.round(r.value)), strong: r.strong })),
            source: SOURCE,
            followUps,
            context: {},
        };
    }
    if (c.shape === 'ranking') {
        return {
            shape: 'ranking',
            sentence: c.sentence,
            rows: c.rows.map((r) => ({
                label: r.label,
                value: r.value,
                display: r.display || String(Math.round(r.value)),
                meta: r.meta || undefined,
                ...(KNOWN(r.category) ? { category: r.category } : { initials: initials(r.label) }),
            })),
            source: SOURCE,
            followUps,
            context: {},
        };
    }
    return null;
}
