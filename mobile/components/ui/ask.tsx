import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { FONT } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon } from './icon';
import { Text } from './text';
import { Tap } from './tap';

interface AskBarProps {
    /** Read-only bar (Insights) navigates on press; editable bar (Ask LogIt) takes input. */
    onPress?: () => void;
    value?: string;
    onChangeText?: (t: string) => void;
    onSubmit?: () => void;
    onKeyboard?: () => void;
    onMic: () => void;
    placeholder?: string;
    /** Insights: 52 tall, 40 mic (Figma 1022:4635). Ask LogIt: 56 tall, 44 mic. */
    compact?: boolean;
    autoFocus?: boolean;
    inputRef?: React.Ref<TextInput>;
}

/** Sparkle, input, keyboard and mic. 56 tall pill on bg/surface. */
export function AskBar({ onPress, value, onChangeText, onSubmit, onKeyboard, onMic, placeholder = 'Ask about your money…', compact, autoFocus, inputRef }: AskBarProps) {
    const { colors, shadows } = useTheme();
    const editable = !!onChangeText;
    // Typing: the mic turns into send (Figma 1009:1601).
    const canSend = editable && !!value?.trim();
    const btn = compact ? 40 : 44;

    return (
        <View
            style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, height: compact ? 52 : 56,
                paddingLeft: compact ? 16 : 18, paddingRight: 6, borderRadius: 999,
                backgroundColor: colors.bg.surface, borderWidth: canSend ? 1.5 : 1, borderColor: canSend ? colors.brand.accent : colors.line.default, ...shadows.card,
            }}
        >
            <Icon name="sparkle" size={compact ? 18 : 20} color={colors.brand['accent-text']} />
            {editable ? (
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    onSubmitEditing={onSubmit}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.tertiary}
                    returnKeyType="send"
                    autoFocus={autoFocus}
                    blurOnSubmit={false}
                    style={{ flex: 1, fontFamily: FONT.medium, fontSize: compact ? 14 : 15, color: colors.text.primary, paddingVertical: 0 }}
                    accessibilityLabel="Ask LogIt"
                />
            ) : (
                <Pressable onPress={onPress} style={{ flex: 1, justifyContent: 'center', height: '100%' }} accessibilityRole="button" accessibilityLabel="Ask LogIt">
                    <Text size={compact ? 14 : 15} tone="tertiary">{placeholder}</Text>
                </Pressable>
            )}
            {onKeyboard && !canSend && (
                <Pressable onPress={onKeyboard} accessibilityRole="button" accessibilityLabel="Type a question" style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="keyboard" size={20} color={colors.text.secondary} />
                </Pressable>
            )}
            <Tap
                onPress={canSend ? onSubmit : onMic}
                accessibilityRole="button"
                accessibilityLabel={canSend ? 'Send question' : 'Start voice question'}
                style={({ pressed }) => ({ width: btn, height: btn, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand.accent, opacity: pressed ? 0.85 : 1 })}
            >
                <Icon name={canSend ? 'send' : 'mic'} size={compact ? 20 : 22} color={colors.brand['on-accent']} />
            </Tap>
        </View>
    );
}

/** The user's question: bg/surface with a soft shadow, right-aligned. Never blue on blue. */
export function UserBubble({ children }: { children: string }) {
    const { colors, shadows } = useTheme();
    return (
        <View style={{ alignItems: 'flex-end' }}>
            <View
                style={{
                    maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 11,
                    backgroundColor: colors.bg.surface,
                    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 6,
                    ...shadows.bubble,
                }}
            >
                <Text variant="row">{children}</Text>
            </View>
        </View>
    );
}

/** "✦ LogIt" label above an answer. */
export function LogItLabel() {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: colors.brand['accent-tint'], alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={14} color={colors.brand['accent-text']} />
            </View>
            <Text size={13} weight="bold" tone="secondary">LogIt</Text>
        </View>
    );
}

/** Suggested follow-up question row ("Ask next"). */
export function SuggestionRow({ label, onPress }: { label: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <Tap
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44,
                paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16,
                backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.line.default,
                opacity: pressed ? 0.7 : 1,
            })}
        >
            <Icon name="sparkle" size={14} color={colors.brand['accent-text']} />
            <Text size={13} weight="semibold" style={{ flex: 1 }}>{label}</Text>
            <Icon name="next" size={14} color={colors.text.tertiary} />
        </Tap>
    );
}

/** Small round icon action under an answer (copy, refresh). 32 visual, 44 tap. */
export function AnswerAction({ icon, label, onPress }: { icon: 'copy' | 'refresh'; label: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel={label}
            style={{ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={16} color={colors.text.secondary} />
        </Pressable>
    );
}
