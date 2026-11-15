import React from 'react';
import { View } from 'react-native';
import { AnswerAction, LogItLabel, SuggestionRow, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import type { ChatReply } from '@/lib/ask-chat';

/**
 * A conversational reply from LogIt: the message in a bubble, then up to
 * three things you might ask next. Matches the look of AnswerView.
 */
export function ChatAnswer({ reply, onFollowUp, onCopy, onRefresh }: {
    reply: ChatReply;
    onFollowUp: (q: string) => void;
    onCopy: () => void;
    onRefresh: () => void;
}) {
    const { colors, shadows } = useTheme();
    return (
        <View style={{ gap: 12 }}>
            <LogItLabel />
            <View style={{ alignSelf: 'flex-start', maxWidth: '92%', padding: 14, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: colors.bg.surface, ...shadows.card }}>
                <Text size={15} weight="medium" style={{ lineHeight: 22 }} selectable>{reply.reply}</Text>
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
