import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import {
    BandPill, Banner, Button, Card, Icon, InlineLoader, InsetPanel, ListDayHeader, ListGroup,
    SegmentedControl, Screen, Skeleton, SkeletonRow, TAB_BAR_SPACE, Text, TopBar,
} from '@/components/ui';
import { TransactionRow, type RowContext } from '@/components/spending/transaction-row';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import { usePendingRemovals } from '@/lib/transaction-edits';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import {
    dedupeTransfers, fetchTransactionsPage, groupByDay, groupByWeek, searchTransactions,
    type TxFilter, type TxGroup,
} from '@/lib/transactions-list';
import { flowOf } from '@/lib/spending-service';
import { listAmount } from '@/lib/format';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { useTheme } from '@/lib/theme';
import { FONT, HIT_SLOP, RAW } from '@/constants/theme';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'spent', label: 'Spent' },
    { value: 'in', label: 'Received' },
    { value: 'moved', label: 'Moved' },
] as const;

const EMPTY_FILTER: Record<Exclude<TxFilter, 'all'>, string> = {
    spent: 'Nothing spent yet.',
    in: 'Nothing received yet.',
    moved: 'No moves between your wallets yet.',
};

/**
 * Transactions (Figma section 993:50): every entry, grouped by day. Filter,
 * search, and open any one to see exactly what LogIt read. Opens from
 * Spending; the Spending tab stays highlighted.
 */
export default function Transactions() {
    const router = useRouter();

    const [filter, setFilter] = useState<TxFilter>('all');
    const [rows, setRows] = useState<TransactionWithWallet[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    /** Whether the user has any transactions at all, so a filter with none isn't the first-run empty state. */
    const [hasAny, setHasAny] = useState<boolean | null>(null);

    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TransactionWithWallet[] | null>(null);
    const [searchBusy, setSearchBusy] = useState(false);
    const [searchError, setSearchError] = useState(false);
    /** Bumped to re-run the current search (Try again, or after an edit). */
    const [searchRun, setSearchRun] = useState(0);

    const [detailTx, setDetailTx] = useState<TransactionWithWallet | null>(null);
    const removing = usePendingRemovals();

    // Ignore responses that arrive after the filter changed.
    const requestId = useRef(0);

    const load = useCallback(async (f: TxFilter, p: number) => {
        const id = ++requestId.current;
        try {
            const { rows: next, hasMore: more } = await fetchTransactionsPage(f, p);
            if (id !== requestId.current) return;
            setRows((prev) => (p === 0 ? next : [...prev, ...next]));
            setPage(p);
            setHasMore(more);
            if (f === 'all' && p === 0) setHasAny(next.length > 0);
            setError(false);
        } catch (e) {
            console.error('Error loading transactions:', e);
            if (id === requestId.current) setError(true);
        } finally {
            if (id === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(filter, 0);
    }, [filter, load]);

    // First-run check when opened on a filter other than All.
    useEffect(() => {
        if (hasAny !== null || filter === 'all') return;
        fetchTransactionsPage('all', 0).then((r) => setHasAny(r.rows.length > 0)).catch(() => {});
    }, [filter, hasAny]);

    useLiveRefresh(() => load(filter, 0), 'activity');

    // Debounced search.
    useEffect(() => {
        if (!searching) return;
        const q = query.trim();
        if (!q) { setResults(null); setSearchError(false); return; }
        setSearchBusy(true);
        let live = true;
        const t = setTimeout(async () => {
            try {
                const found = await searchTransactions(q);
                if (live) { setResults(found); setSearchError(false); }
            } catch (e) {
                console.error('Search failed:', e);
                if (live) setSearchError(true);
            } finally {
                if (live) setSearchBusy(false);
            }
        }, 250);
        return () => { live = false; clearTimeout(t); };
    }, [query, searching, searchRun]);

    const groups: TxGroup[] = useMemo(() => {
        // Hide entries inside their Undo window; both legs of a move go together.
        const goneTransfers = new Set(rows.filter((r) => removing.has(r.id) && r.transfer_id).map((r) => r.transfer_id));
        const list = dedupeTransfers(rows).filter((t) => !removing.has(t.id) && !(t.transfer_id && goneTransfers.has(t.transfer_id)));
        return filter === 'moved' ? groupByWeek(list) : groupByDay(list, listAmount);
    }, [rows, filter, removing]);

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        if (!searching && hasMore && !loadingMore && !loading
            && layoutMeasurement.height + contentOffset.y >= contentSize.height - 400) {
            setLoadingMore(true);
            load(filter, page + 1);
        }
    };

    const closeSearch = () => {
        setSearching(false);
        setQuery('');
        setResults(null);
        setSearchError(false);
    };

    const refreshAll = () => {
        load(filter, 0);
        if (searching) setSearchRun((n) => n + 1);
    };

    const firstRun = !loading && !error && hasAny === false;

    return (
        <>
            <Screen
                bottomInset={TAB_BAR_SPACE}
                header={searching
                    ? <SearchBar value={query} onChange={setQuery} onCancel={closeSearch} />
                    : (
                        <TopBar
                            title="Transactions"
                            right={firstRun ? undefined : <BandPill icon="search" label="Search" onPress={() => setSearching(true)} />}
                        />
                    )}
                scrollProps={{
                    onScroll,
                    scrollEventThrottle: 200,
                    keyboardShouldPersistTaps: 'handled',
                    keyboardDismissMode: 'on-drag',
                    refreshControl: searching ? undefined : (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(filter, 0); }}
                            tintColor={RAW.onBand}
                            colors={[RAW.onBand]}
                        />
                    ),
                }}
            >
                {searching ? (
                    <SearchResults
                        query={query}
                        results={results}
                        busy={searchBusy}
                        error={searchError}
                        onRetry={() => setSearchRun((n) => n + 1)}
                        onClear={() => setQuery('')}
                        onOpen={setDetailTx}
                    />
                ) : loading && rows.length === 0 ? (
                    <ListSkeleton />
                ) : error && rows.length === 0 ? (
                    <Banner
                        tone="danger"
                        title="Couldn’t load your transactions"
                        body="Check your connection and try again. Nothing you logged is lost."
                        action={{ label: 'Try again', onPress: () => { setLoading(true); load(filter, 0); } }}
                    />
                ) : firstRun ? (
                    <FirstRun onAutopilot={() => router.push('/sms-settings')} />
                ) : (
                    <Card hero gap={8}>
                        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />

                        {filter === 'moved' && (
                            <InsetPanel>
                                <InfoIcon />
                                <Text variant="meta" weight="semibold" tone="secondary" style={{ flex: 1 }}>
                                    Money between your own wallets. It isn’t spending, so it’s left out of your totals.
                                </Text>
                            </InsetPanel>
                        )}

                        {loading ? (
                            <View style={{ gap: 18, paddingVertical: 12 }}>
                                <SkeletonRow /><SkeletonRow /><SkeletonRow />
                            </View>
                        ) : groups.length === 0 ? (
                            <Text tone="secondary" align="center" style={{ paddingVertical: 24 }}>
                                {EMPTY_FILTER[filter as Exclude<TxFilter, 'all'>] ?? 'Nothing here yet.'}
                            </Text>
                        ) : (
                            groups.map((g) => (
                                <View key={g.key} style={{ gap: 8 }}>
                                    <ListDayHeader title={g.title} summary={g.summary} />
                                    <ListGroup bare>
                                        {g.rows.map((tx) => (
                                            <TransactionRow
                                                key={tx.id}
                                                tx={tx}
                                                context={(filter === 'moved' ? 'moved' : 'day') as RowContext}
                                                onPress={() => setDetailTx(tx)}
                                            />
                                        ))}
                                    </ListGroup>
                                </View>
                            ))
                        )}

                        {loadingMore && (
                            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                                <InlineLoader label="Loading older transactions…" />
                            </View>
                        )}
                        {error && rows.length > 0 && (
                            <Banner
                                tone="danger"
                                title="Couldn’t load more"
                                action={{ label: 'Try again', onPress: () => { setLoadingMore(true); load(filter, page + 1); } }}
                            />
                        )}
                    </Card>
                )}
            </Screen>

            <TransactionDetailSheet
                transaction={detailTx}
                onClose={() => setDetailTx(null)}
                onChanged={refreshAll}
            />
        </>
    );
}

function InfoIcon() {
    const { colors } = useTheme();
    return <Icon name="info" size={18} color={colors.text.secondary} />;
}

/** Search field on the band with Cancel (Figma 1004:853). */
function SearchBar({ value, onChange, onCancel }: { value: string; onChange: (v: string) => void; onCancel: () => void }) {
    const { colors } = useTheme();
    const input = useRef<TextInput>(null);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 20 }}>
            <View
                style={{
                    flex: 1, height: 46, borderRadius: 999, backgroundColor: colors.bg.surface,
                    flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6,
                }}
            >
                <Icon name="search" size={18} color={colors.text.secondary} />
                <TextInput
                    ref={input}
                    value={value}
                    onChangeText={onChange}
                    autoFocus
                    placeholder="Names, places or amounts"
                    placeholderTextColor={colors.text.tertiary}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    accessibilityLabel="Search transactions"
                    style={{
                        flex: 1, fontFamily: FONT.medium, fontSize: 15, color: colors.text.primary,
                        paddingVertical: Platform.OS === 'android' ? 0 : undefined,
                    }}
                />
                {value.length > 0 && (
                    <Pressable
                        onPress={() => { onChange(''); input.current?.focus(); }}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
                        hitSlop={HIT_SLOP}
                    >
                        <Icon name="close" size={16} color={colors.text.secondary} />
                    </Pressable>
                )}
            </View>
            <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}>
                <Text size={14} weight="bold" tone="onBand">Cancel</Text>
            </Pressable>
        </View>
    );
}

/** Results card. The total answers "how much at Shoprite?" (Figma 1004:853, 1004:928). */
function SearchResults({ query, results, busy, error, onRetry, onClear, onOpen }: {
    query: string;
    results: TransactionWithWallet[] | null;
    busy: boolean;
    error: boolean;
    onRetry: () => void;
    onClear: () => void;
    onOpen: (tx: TransactionWithWallet) => void;
}) {
    const { colors } = useTheme();
    const q = query.trim();

    if (!q) {
        return (
            <Card hero>
                <Text tone="secondary">Search by name, place or amount, for example “Shoprite”, “Akosua” or “45”.</Text>
            </Card>
        );
    }
    if (error) {
        return (
            <Banner
                tone="danger"
                title="Couldn’t search right now"
                body="Check your connection and try again."
                action={{ label: 'Try again', onPress: onRetry }}
            />
        );
    }
    if (!results) {
        return (
            <Card hero gap={18}>
                <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </Card>
        );
    }
    if (results.length === 0) {
        return (
            <Card hero style={{ alignItems: 'center', paddingVertical: 40, gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: colors.bg.muted, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="search" size={28} color={colors.text.secondary} />
                </View>
                <Text variant="cardTitle" align="center">Nothing for “{q}”</Text>
                <Text tone="secondary" align="center">Try a shorter word, a person’s name or an amount like 45.</Text>
                <Button label="Clear search" variant="secondary" size="sm" onPress={onClear} />
            </Card>
        );
    }

    const spent = results.filter((t) => flowOf(t) === 'spent').reduce((s, t) => s + Number(t.amount), 0);
    return (
        <Card hero gap={8} style={{ opacity: busy ? 0.6 : 1 }}>
            <ListDayHeader
                title={`${results.length} ${results.length === 1 ? 'result' : 'results'}${results.length === 100 ? '+' : ''}`}
                summary={spent > 0 ? `GHS ${listAmount(spent)} in total` : undefined}
            />
            <ListGroup bare>
                {results.map((tx) => <TransactionRow key={tx.id} tx={tx} context="search" onPress={() => onOpen(tx)} />)}
            </ListGroup>
        </Card>
    );
}

/** Ghost rows show what's coming; the button goes straight to setup (Figma 1004:968). */
function FirstRun({ onAutopilot }: { onAutopilot: () => void }) {
    return (
        <Card hero gap={16}>
            <View style={{ gap: 14, opacity: 0.8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {[0, 1, 2].map((i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Skeleton width={28} height={28} radius={9} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <Skeleton width="62%" height={8} radius={4} />
                            <Skeleton width="40%" height={8} radius={4} />
                        </View>
                        <Skeleton width={36} height={8} radius={4} />
                    </View>
                ))}
            </View>
            <View style={{ gap: 6, alignItems: 'center' }}>
                <Text variant="cardTitle" align="center">No transactions yet</Text>
                <Text tone="secondary" align="center">They appear here as alerts arrive. Turn on autopilot or paste a message to start.</Text>
            </View>
            <Button label="Turn on autopilot" icon="flash" onPress={onAutopilot} />
        </Card>
    );
}

/** Same rhythm as the real list: switch, day header, rows (Figma 1004:1045). */
function ListSkeleton() {
    return (
        <Card hero gap={14}>
            <Skeleton width="100%" height={40} radius={14} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <Skeleton width={60} height={11} radius={5} />
                <Skeleton width={48} height={9} radius={5} />
            </View>
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <Skeleton width={72} height={11} radius={5} />
                <Skeleton width={48} height={9} radius={5} />
            </View>
            <SkeletonRow /><SkeletonRow />
        </Card>
    );
}
