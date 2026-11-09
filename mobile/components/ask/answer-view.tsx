import React from 'react';
import { View } from 'react-native';
import { AnswerAction, CategoryTile, HBars, Icon, LogItLabel, SuggestionRow, Tap, Text } from '@/components/ui';
import { categoryStyle } from '@/lib/category-style';
import { useTheme } from '@/lib/theme';
import type { Answer } from '@/lib/ask-engine';
import { cedis } from '@/lib/money-window';
import type { CategoryColor } from '@/constants/theme';

/**
 * One answer in the thread (Figma 1009:1514, 1045:5274, 1045:5425,
 * 1009:1654). Plain sentence first, a small chart only when it helps, and
 * the evidence one tap away.
 */
export function AnswerView({ answer: a, onFollowUp, onSource, onCopy, onRefresh, onFix }: {
    answer: Answer;
    onFollowUp: (q: string) => void;
    onSource: () => void;
    onCopy: () => void;
    onRefresh: () => void;
    onFix: (action: 'paste' | 'wallets') => void;
}) {
    const { colors, shadows } = useTheme();
    const catColor = (c?: string) => (c && c !== 'accent' && c !== 'muted' && c in colors.cat ? colors.cat[c as CategoryColor] : c === 'muted' ? colors.text.tertiary : colors.brand.accent);
    const card = { backgroundColor: colors.bg.surface, borderRadius: 20, padding: 16, ...shadows.card };

    if (a.shape === 'cant') {
        return (
            <View style={{ gap: 10, alignItems: 'flex-start' }}>
                <View style={{ ...card, padding: 14, gap: 10, maxWidth: '92%', borderTopLeftRadius: 6 }}>
                    <Text size={14} style={{ lineHeight: 20 }}>{a.sentence}</Text>
                    {a.fix && (
                        <Tap
                            onPress={() => onFix(a.fix!.action)}
                            accessibilityRole="button"
                            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 999, backgroundColor: colors.bg.muted, opacity: pressed ? 0.8 : 1 })}
                        >
                            <Icon name="paste" size={16} color={colors.text.primary} />
                            <Text size={13} weight="bold">{a.fix.label}</Text>
                        </Tap>
                    )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {a.chips.map((c) => (
                        <Tap
                            key={c}
                            onPress={() => onFollowUp(c)}
                            accessibilityRole="button"
                            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.line.default, opacity: pressed ? 0.8 : 1 })}
                        >
                            <Text size={12} weight="bold" tone="accent">{c}</Text>
                        </Tap>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={{ gap: 14 }}>
            <LogItLabel />

            {a.shape === 'total' && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <Text weight="extrabold" size={34} style={{ letterSpacing: -1.02 }}>GHS {cedis(a.amount)}</Text>
                    <Text size={14} weight="semibold" tone="secondary">{a.unit}</Text>
                </View>
            )}
            {a.shape === 'verdict' && (
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: a.tagTone === 'success' ? colors.status['success-tint'] : a.tagTone === 'warn' ? colors.status['warn-tint'] : colors.bg.muted }}>
                    {a.tagIcon && <Icon name={a.tagIcon} size={14} color={a.tagTone === 'success' ? colors.status.success : a.tagTone === 'warn' ? colors.status.warn : colors.text.secondary} />}
                    <Text size={13} weight="bold">{a.tag}</Text>
                </View>
            )}

            {/* Verdicts and rankings lead with the sentence (Figma 1045:5386); totals lead with the number. */}
            {a.shape === 'total'
                ? <Text size={15} weight="medium" style={{ lineHeight: 22 }}>{a.sentence}</Text>
                : <Text size={20} weight="bold" style={{ lineHeight: 25, letterSpacing: -0.2 }}>{a.sentence}</Text>}

            {a.shape === 'total' && a.chart && (
                <View style={{ ...card, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text size={13} weight="bold">{a.chart.title}</Text>
                        {a.chart.delta && (
                            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: a.chart.color !== 'accent' && a.chart.color in colors.cat ? colors.cat[`${a.chart.color as CategoryColor}-tint`] : colors.brand['accent-tint'] }}>
                                <Text size={11} weight="bold">{a.chart.delta}</Text>
                            </View>
                        )}
                    </View>
                    <HBars rows={a.chart.rows.map((r) => ({ ...r, display: cedis(r.value) }))} color={catColor(a.chart.color)} />
                </View>
            )}

            {a.shape === 'verdict' && (
                <View style={{ ...card, paddingVertical: 6 }}>
                    {a.rows.map((r, i) => (
                        <View
                            key={r.label}
                            style={[
                                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: 8 },
                                i > 0 && { borderTopWidth: r.strong ? 1.5 : 1, borderTopColor: colors.line.default },
                            ]}
                        >
                            <Text size={13} weight={r.strong ? 'bold' : 'medium'} tone={r.strong ? 'primary' : 'secondary'} style={{ flex: 1 }}>{r.label}</Text>
                            <Text size={r.strong ? 15 : 13} weight={r.strong ? 'extrabold' : 'semibold'}>{r.value}</Text>
                        </View>
                    ))}
                </View>
            )}

            {a.shape === 'ranking' && (
                <View style={{ ...card, paddingVertical: 6 }}>
                    {a.rows.map((r, i) => {
                        const max = Math.max(1, ...a.rows.map((x) => x.value));
                        const color = r.category ? catColor(categoryStyle(r.category).tone) : catColor(a.color);
                        return (
                            <View
                                key={r.label}
                                style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line.default }]}
                                accessible
                                accessibilityLabel={`${i + 1}. ${r.label}, ${r.display}${r.meta ? `, ${r.meta}` : ''}`}
                            >
                                <Text size={12} weight="bold" tone="tertiary" style={{ width: 10 }}>{i + 1}</Text>
                                {r.initials ? (
                                    <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: colors.cat['people-tint'], alignItems: 'center', justifyContent: 'center' }}>
                                        <Text size={11} weight="bold" tone="accent">{r.initials}</Text>
                                    </View>
                                ) : r.category ? (
                                    <CategoryTile tone={categoryStyle(r.category).tone} icon={categoryStyle(r.category).icon} size={32} />
                                ) : null}
                                <View style={{ flex: 1, gap: 5 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text size={13} weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{r.label}</Text>
                                        <Text size={13} weight="bold">{r.display}</Text>
                                    </View>
                                    <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${(r.value / max) * 100}%` }} />
                                    {r.meta && <Text size={11} weight="medium" tone="tertiary">{r.meta}</Text>}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tap
                    onPress={onSource}
                    disabled={a.source.txs.length === 0}
                    accessibilityRole="button"
                    accessibilityLabel={`${a.source.label}. Show them`}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 12, minHeight: 32, borderRadius: 999, backgroundColor: colors.bg.muted, opacity: pressed ? 0.8 : 1 })}
                    hitSlop={6}
                >
                    <Icon name={a.source.icon ?? 'paste'} size={14} color={colors.text.secondary} />
                    <Text size={12} weight="semibold" tone="secondary">{a.source.label}</Text>
                    {a.source.txs.length > 0 && <Icon name="next" size={12} color={colors.text.secondary} />}
                </Tap>
                <View style={{ flex: 1 }} />
                <AnswerAction icon="copy" label="Copy answer" onPress={onCopy} />
                <AnswerAction icon="refresh" label="Ask again with today’s numbers" onPress={onRefresh} />
            </View>

            {a.followUps.length > 0 && (
                <View style={{ gap: 8 }}>
                    <Text size={11} weight="bold" tone="tertiary" style={{ letterSpacing: 0.66, textTransform: 'uppercase' }}>Ask next</Text>
                    {a.followUps.slice(0, 3).map((f) => <SuggestionRow key={f} label={f} onPress={() => onFollowUp(f)} />)}
                </View>
            )}
        </View>
    );
}

/** Plain text of an answer, for Copy. */
export function answerText(a: Answer): string {
    if (a.shape === 'cant') return a.sentence;
    if (a.shape === 'total') return `GHS ${cedis(a.amount)} ${a.unit}. ${a.sentence}`;
    if (a.shape === 'verdict') return `${a.tag}. ${a.sentence}\n${a.rows.map((r) => `${r.label}: ${r.value}`).join('\n')}`;
    return `${a.sentence}\n${a.rows.map((r) => `${r.label}: ${r.display}`).join('\n')}`;
}
