import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AskBar, BrandBand, Button, CategoryTile, Icon, ListGroup, ListRow, RoundButton, Sheet, Tap, Text, UserBubble, useToast,
    type IconName,
} from '@/components/ui';
import { AnswerView, answerText } from '@/components/ask/answer-view';
import { ListeningOverlay } from '@/components/ask/listening';
import { TransactionRow } from '@/components/spending/transaction-row';
import { useTheme } from '@/lib/theme';
import { answer as answerQuestion, STARTERS, type Answer, type AskContext } from '@/lib/ask-engine';
import { loadMoneyWindow } from '@/lib/money-window';
import { addToAskHistory, getAskHistory, type PastQuestion } from '@/lib/ask-history';
import { isNetworkError } from '@/lib/network';
import { listen, micPermission, requestMic, voiceAvailable, type Listening } from '@/lib/voice';
import { dayHeading } from '@/lib/format';
import { CATEGORIES } from '@/lib/categories';
import { categoryStyle } from '@/lib/category-style';
import { RAW, type CategoryColor } from '@/constants/theme';

interface Turn {
    id: number;
    q: string;
    state: 'thinking' | 'done' | 'offline';
    answer?: Answer;
    /** "Looking at 46 transactions…" */
    looking?: number;
}

const STARTER_STYLE: { tone: CategoryColor; icon: IconName }[] = [
    { tone: 'food', icon: 'food' },
    { tone: 'people', icon: 'people' },
    { tone: 'airtime', icon: 'airtime' },
    { tone: 'transport', icon: 'idea' },
];

/**
 * Ask LogIt (Figma 993:52, right side). A chat you can type or talk to.
 * Opens from the Ask bar on Insights and any "Ask about…" button.
 */
export default function Ask() {
    const { colors, shadows } = useTheme();
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const params = useLocalSearchParams<{ q?: string; voice?: string }>();
    const [text, setText] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    /** What the last answer was about, so "Why is it up?" knows. */
    const context = useRef<AskContext>({});
    const input = useRef<TextInput>(null);
    const [source, setSource] = useState<Answer | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState<PastQuestion[]>([]);
    const [explainMic, setExplainMic] = useState(false);
    const [listening, setListening] = useState(false);
    const [words, setWords] = useState('');
    const listener = useRef<Listening | null>(null);
    const scroll = useRef<ScrollView>(null);
    const nextId = useRef(1);
    const started = useRef(false);

    const run = useCallback(async (q: string, id?: number) => {
        const question = q.trim();
        if (!question) return;
        const turnId = id ?? nextId.current++;
        setTurns((t) => (id ? t.map((x) => (x.id === id ? { ...x, state: 'thinking' } : x)) : [...t, { id: turnId, q: question, state: 'thinking' }]));
        if (!id) addToAskHistory(question);
        setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
        try {
            const started = Date.now();
            const w = await loadMoneyWindow();
            setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, looking: w.txs.length } : x)));
            // A short, honest pause so the count can be read.
            await new Promise((r) => setTimeout(r, Math.max(0, 600 - (Date.now() - started))));
            const a = answerQuestion(question, w, context.current);
            if (a.context.category || a.context.period) context.current = a.context;
            setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, state: 'done', answer: a } : x)));
        } catch (e) {
            console.error('Ask failed:', e);
            if (isNetworkError(e)) {
                setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, state: 'offline' } : x)));
            } else {
                setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, state: 'done', answer: { shape: 'cant', sentence: 'Something went wrong working that out. Try again in a moment.', chips: [], context: {} } } : x)));
            }
        }
        setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
    }, []);

    /** "Set an airtime limit" opens the limit sheet; anything else is asked. */
    const followUp = (q: string) => {
        const m = q.match(/^Set an? (.+) limit$/i);
        if (m) {
            const label = m[1].toLowerCase();
            const id = CATEGORIES.find((c) => categoryStyle(c.id).label.toLowerCase() === label || c.name.toLowerCase() === label)?.id;
            if (id) { router.push({ pathname: '/limits', params: { category: id } }); return; }
        }
        run(q);
    };

    const send = () => {
        const q = text;
        setText('');
        run(q);
    };

    // Voice: explain first (Figma 1009:1800), then the system prompt, then listen.
    const startVoice = useCallback(async () => {
        if (!voiceAvailable()) {
            toast.show({ message: 'Voice isn’t available on this phone. Type your question instead.', icon: 'info' });
            return;
        }
        const p = await micPermission();
        if (p === 'undetermined') { setExplainMic(true); return; }
        if (p === 'denied') { toast.show({ message: 'Allow the microphone for LogIt in your phone’s Settings, or type instead.', icon: 'info' }); return; }
        setWords('');
        setListening(true);
        listener.current = listen(setWords, (final, err) => {
            setListening(false);
            listener.current = null;
            if (err) toast.show({ message: 'Didn’t catch that. Try again, or type instead.', icon: 'info' });
            else if (final) run(final);
        });
        if (!listener.current) setListening(false);
    }, [run, toast]);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        if (params.q) run(params.q);
        else if (params.voice) startVoice();
    }, [params.q, params.voice, run, startVoice]);

    const copy = async (a: Answer) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
            await Clipboard.setStringAsync(answerText(a));
            toast.show({ message: 'Answer copied' });
        } catch {
            toast.show({ message: 'Couldn’t copy on this build.', icon: 'info' });
        }
    };

    const openHistory = async () => {
        setHistoryOpen(true);
        setHistory(await getAskHistory().catch(() => []));
    };

    const empty = turns.length === 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
            <StatusBar style="light" />
            <BrandBand height={300} />
            <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 22, height: insets.top + 10 + 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                    <RoundButton icon="back" label="Back" onPress={() => router.back()} />
                    <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: RAW.onBand, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="sparkle" size={18} color={colors.brand.accent} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                        <Text size={17} weight="bold" tone="onBand" accessibilityRole="header">Ask LogIt</Text>
                        <Text size={12} weight="semibold" style={{ color: RAW.onBandTertiary }}>Answers from your own money</Text>
                    </View>
                </View>
                <RoundButton icon="more" label="Earlier questions" onPress={openHistory} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    ref={scroll}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 18 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    {empty ? (
                        <>
                            <View style={{ gap: 8, paddingHorizontal: 6, marginBottom: 10 }}>
                                <Text weight="bold" size={24} tone="onBand" style={{ letterSpacing: -0.48 }}>What would you like to know?</Text>
                                <Text size={14} style={{ color: RAW.onBandTertiary }}>Type, or tap the mic and just ask.</Text>
                            </View>
                            <View style={{ gap: 8 }}>
                                {STARTERS.map((s, i) => (
                                    <Tap
                                        key={s}
                                        onPress={() => run(s)}
                                        accessibilityRole="button"
                                        style={({ pressed }) => ({
                                            flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 12, paddingVertical: 10,
                                            borderRadius: 16, backgroundColor: colors.bg.surface, opacity: pressed ? 0.8 : 1, ...shadows.small,
                                        })}
                                    >
                                        <CategoryTile tone={STARTER_STYLE[i].tone} icon={STARTER_STYLE[i].icon} size={30} />
                                        <Text size={13} weight="semibold" style={{ flex: 1 }}>{s}</Text>
                                    </Tap>
                                ))}
                            </View>
                        </>
                    ) : (
                        turns.map((t) => (
                            <View key={t.id} style={{ gap: 14 }}>
                                <UserBubble>{t.q}</UserBubble>
                                {t.state === 'thinking' && <Thinking count={t.looking} />}
                                {t.state === 'offline' && <OfflineBubble onRetry={() => run(t.q, t.id)} />}
                                {t.state === 'done' && t.answer && (
                                    <AnswerView
                                        answer={t.answer}
                                        onFollowUp={followUp}
                                        onSource={() => setSource(t.answer!)}
                                        onCopy={() => copy(t.answer!)}
                                        onRefresh={() => { loadMoneyWindow(true).catch(() => {}); run(t.q, t.id); }}
                                        onFix={(action) => router.push(action === 'paste' ? '/paste' : '/wallets')}
                                    />
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
                    <AskBar inputRef={input} value={text} onChangeText={setText} onSubmit={send} onMic={startVoice} onKeyboard={() => input.current?.focus()} />
                </View>
            </KeyboardAvoidingView>

            <ListeningOverlay
                visible={listening}
                words={words}
                onDone={() => listener.current?.stop()}
                onCancel={() => { listener.current?.cancel(); setListening(false); }}
                onType={() => { listener.current?.cancel(); setListening(false); setTimeout(() => input.current?.focus(), 300); }}
            />

            <MicExplainer
                visible={explainMic}
                onAllow={async () => { setExplainMic(false); if (await requestMic()) startVoice(); }}
                onType={() => { setExplainMic(false); setTimeout(() => input.current?.focus(), 300); }}
            />

            <Sheet visible={historyOpen} onClose={() => setHistoryOpen(false)} title="Earlier questions" footer={
                <Button label="New question" icon="sparkle" onPress={() => { setHistoryOpen(false); setTurns([]); context.current = {}; }} />
            }>
                {history.length === 0 ? (
                    <Text tone="secondary">Nothing yet. Questions you ask show up here, and re-run on today’s numbers.</Text>
                ) : (
                    <ListGroup bare>
                        {history.map((h) => (
                            <ListRow
                                key={h.at}
                                dense
                                leading={<Icon name="message" size={16} color={colors.text.secondary} />}
                                title={h.q}
                                value={relativeDay(new Date(h.at))}
                                valueStyle="setting"
                                valueTone="secondary"
                                onPress={() => { setHistoryOpen(false); run(h.q); }}
                            />
                        ))}
                    </ListGroup>
                )}
            </Sheet>

            <Sheet visible={!!source} onClose={() => setSource(null)} title={source && source.shape !== 'cant' ? source.source.label : undefined}>
                {source && source.shape !== 'cant' && (
                    <ListGroup bare>
                        {source.source.txs.slice(0, 60).map((tx) => <TransactionRow key={tx.id} tx={tx} context="search" />)}
                    </ListGroup>
                )}
            </Sheet>
        </View>
    );
}

/** "Today", "Yesterday", "Mon", "2 Nov" (Figma 1009:1848). */
function relativeDay(d: Date): string {
    const h = dayHeading(d);
    if (h === 'Today' || h === 'Yesterday') return h;
    const days = (Date.now() - d.getTime()) / 86_400_000;
    return days < 7 ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Says what it's doing, with a real count, so the wait feels earned (Figma 1008:1756). */
function Thinking({ count }: { count?: number }) {
    const { colors, shadows } = useTheme();
    return (
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: colors.bg.surface, ...shadows.bubble }} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.accent, opacity: 0.5 + i * 0.25 }} />)}
            </View>
            <Text size={13} tone="secondary">{count ? `Looking at ${count} transactions…` : 'Looking…'}</Text>
        </View>
    );
}

/** The question stays put; retry is in the bubble, not a modal (Figma 1009:1726). */
function OfflineBubble({ onRetry }: { onRetry: () => void }) {
    const { colors } = useTheme();
    return (
        <View style={{ alignSelf: 'flex-start', maxWidth: '86%', gap: 6, padding: 14, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: colors.status['danger-tint'] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="wifiOff" size={14} color={colors.status.danger} />
                <Text size={13} weight="bold" tone="danger">You’re offline</Text>
            </View>
            <Text size={13} tone="danger">I’ll answer as soon as you’re back online. Your question is saved.</Text>
            <Tap onPress={onRetry} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' }}>
                <Icon name="refresh" size={14} color={colors.text.primary} />
                <Text size={13} weight="bold">Try again</Text>
            </Tap>
        </View>
    );
}

/** Explained before the system prompt: when it listens, and that audio isn't kept (Figma 1009:1800). */
function MicExplainer({ visible, onAllow, onType }: { visible: boolean; onAllow: () => void; onType: () => void }) {
    const { colors, shadows } = useTheme();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onType} statusBarTranslucent>
            <Pressable onPress={onType} style={{ flex: 1, backgroundColor: colors.bg.scrim, justifyContent: 'center', paddingHorizontal: 20 }} accessibilityLabel="Dismiss">
                <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: colors.bg.raised, borderRadius: 28, padding: 20, gap: 12, alignItems: 'center', ...shadows.card }}>
                    <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.brand['accent-tint'], alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="mic" size={22} color={colors.brand['accent-text']} />
                    </View>
                    <Text variant="cardTitle" align="center" accessibilityRole="header">Talk to LogIt</Text>
                    <Text size={13} tone="secondary" align="center">LogIt needs your microphone to hear questions. It only listens while the mic is on, and audio isn’t kept.</Text>
                    <Button label="Allow microphone" onPress={onAllow} style={{ alignSelf: 'stretch' }} />
                    <Button label="Type instead" variant="ghost" onPress={onType} />
                </Pressable>
            </Pressable>
        </Modal>
    );
}
