import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
    ActionBanner, Avatar, Banner, Chip, RoundButton, Screen, TAB_BAR_SPACE, Text, TopBar,
    type AvatarChoice,
} from '@/components/ui';
import { SpendingCard, SpendingCardSkeleton, type Period } from '@/components/spending/spending-card';
import { FirstRunCard, SalaryPromptCard } from '@/components/spending/prompt-cards';
import { DayDetailSheet } from '@/components/spending/day-detail-sheet';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import { AddEntrySheet } from '@/components/transactions/add-entry-sheet';
import { useTabContext } from './_layout';
import { supabase, type Wallet } from '@/lib/supabase';
import { getWallets } from '@/lib/wallet-service';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { getCheckCount } from '@/lib/check-service';
import { getIncomePrompts, logExpectedIncome, markIncomeReceived, snoozeIncome, type IncomePrompt } from '@/lib/income-service';
import { fetchSpendingWindow, summarise, type SpendingSummary } from '@/lib/spending-service';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { usePendingRemovals } from '@/lib/transaction-edits';
import { longDate, sameDay } from '@/lib/format';
import { RAW } from '@/constants/theme';

/**
 * Spending (v1 home, Figma section 993:49). What went out, when, and what
 * needs a look. Check lives here as a banner.
 */
export default function Spending() {
    const router = useRouter();
    const tabs = useTabContext();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [period, setPeriod] = useState<Period>('week');

    const [name, setName] = useState<string | null>(null);
    const [avatar, setAvatar] = useState<AvatarChoice | null>(null);
    const [txs, setTxs] = useState<TransactionWithWallet[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [incomePrompt, setIncomePrompt] = useState<IncomePrompt | null>(null);

    const [dayOpen, setDayOpen] = useState<Date | null>(null);
    const [detailTx, setDetailTx] = useState<TransactionWithWallet | null>(null);
    const [incomeSheetFor, setIncomeSheetFor] = useState<IncomePrompt | null>(null);

    // Entries inside their Undo window are left out, so totals change at once.
    const removing = usePendingRemovals();
    const visibleTxs = useMemo(() => {
        const gone = new Set(txs.filter((t) => removing.has(t.id) && t.transfer_id).map((t) => t.transfer_id));
        return txs.filter((t) => !removing.has(t.id) && !(t.transfer_id && gone.has(t.transfer_id)));
    }, [txs, removing]);
    const [loaded, setLoaded] = useState(false);
    const summary: SpendingSummary | null = useMemo(() => (loaded ? summarise(visibleTxs) : null), [loaded, visibleTxs]);

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const meta = user?.user_metadata ?? {};
            setName((meta.full_name as string | undefined)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? null);
            setAvatar((meta.avatar as AvatarChoice | undefined) ?? null);

            // Check covers both unread alerts and entries with no wallet yet.
            const [window, walletList, pending, prompts] = await Promise.all([
                fetchSpendingWindow(),
                getWallets(),
                getCheckCount(),
                getIncomePrompts(),
            ]);
            setTxs(window);
            setLoaded(true);
            setWallets(walletList);
            setReviewCount(pending);
            setIncomePrompt(prompts[0] ?? null);
            setError(false);
        } catch (e) {
            console.error('Error loading Spending:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useLiveRefresh(() => fetchData(), 'home');
    useEffect(() => { tabs?.setRefreshDashboard(fetchData); }, [tabs, fetchData]);


    const firstRun = !loading && !error && summary?.empty && wallets.length === 0;
    const bigDay = summary?.week.bigDay?.date;

    return (
        <>
            <Screen
                bottomInset={TAB_BAR_SPACE}
                header={
                    <TopBar
                        left={
                            <Pressable
                                onPress={() => router.push('/settings')}
                                accessibilityRole="button"
                                accessibilityLabel="Settings"
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}
                            >
                                <Avatar choice={avatar} name={name} size={38} />
                                <View style={{ flexShrink: 1 }}>
                                    <Text size={16} weight="bold" tone="onBand">{name ? `Hi ${name}` : 'Hi there'}</Text>
                                    <Text variant="meta" weight="semibold" style={{ color: RAW.onBandTertiary }}>{longDate(new Date())}</Text>
                                </View>
                            </Pressable>
                        }
                        right={<RoundButton icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />}
                    />
                }
                scrollProps={{
                    refreshControl: (
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={RAW.onBand} colors={[RAW.onBand]} />
                    ),
                }}
            >
                {incomePrompt && !loading && (
                    <SalaryPromptCard
                        prompt={incomePrompt}
                        walletName={wallets.find((w) => w.id === incomePrompt.item.wallet_id)?.name}
                        onYes={async () => { await logExpectedIncome(incomePrompt); await fetchData(); }}
                        onDifferent={() => setIncomeSheetFor(incomePrompt)}
                        onNotYet={async () => { await snoozeIncome(incomePrompt.item.id); fetchData(); }}
                    />
                )}

                {loading ? (
                    <SpendingCardSkeleton />
                ) : error && !summary ? (
                    <Banner
                        tone="danger"
                        title="Couldn’t load your spending"
                        body="Check your connection and try again. Nothing you logged is lost."
                        action={{ label: 'Try again', onPress: () => { setLoading(true); fetchData(); } }}
                    />
                ) : firstRun ? (
                    <FirstRunCard onAutopilot={() => router.push('/sms-settings')} onPaste={() => router.push('/paste')} />
                ) : summary && (
                    <SpendingCard
                        summary={summary}
                        period={period}
                        onPeriod={setPeriod}
                        compact={!!incomePrompt}
                        onMore={() => router.push('/transactions')}
                        onDay={setDayOpen}
                        onTransaction={setDetailTx}
                    />
                )}

                {!loading && reviewCount > 0 && (
                    <ActionBanner
                        icon="check"
                        title={`${reviewCount} ${reviewCount === 1 ? 'message' : 'messages'} to check`}
                        body={`I couldn’t tell what ${reviewCount === 1 ? 'it was' : 'they were'}`}
                        actionLabel="Check"
                        onPress={() => router.push('/review')}
                    />
                )}

                {!loading && !firstRun && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <Chip icon="cash" label="Log cash" onPress={() => tabs?.openAdd('cash')} />
                        <Chip icon="paste" label="Paste a message" onPress={() => router.push('/paste')} />
                        <Chip icon="receive" label="Set salary" onPress={() => router.push('/expected-income')} />
                    </View>
                )}
            </Screen>

            <DayDetailSheet
                date={dayOpen}
                transactions={visibleTxs}
                isBiggest={!!dayOpen && !!bigDay && sameDay(dayOpen, bigDay)}
                onClose={() => setDayOpen(null)}
                onTransaction={setDetailTx}
                onSeeAll={() => router.push('/transactions')}
            />

            <TransactionDetailSheet
                transaction={detailTx}
                onClose={() => setDetailTx(null)}
                onChanged={fetchData}
            />

            <AddEntrySheet
                visible={!!incomeSheetFor}
                onClose={() => setIncomeSheetFor(null)}
                onSuccess={async () => {
                    if (incomeSheetFor) await markIncomeReceived(incomeSheetFor.item.id);
                    setIncomeSheetFor(null);
                    fetchData();
                }}
                prefill={incomeSheetFor ? {
                    type: 'income',
                    amount: String(incomeSheetFor.item.amount),
                    description: incomeSheetFor.item.label,
                    date: incomeSheetFor.dueDate.toISOString(),
                    walletId: incomeSheetFor.item.wallet_id ?? undefined,
                    categoryId: 'income',
                } : undefined}
            />

        </>
    );
}
