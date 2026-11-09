import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
    BandPill, Banner, Button, Card, CardHeader, CategoryTile, Icon, ListGroup, ListRow, Screen, Skeleton, SkeletonRow,
    TAB_BAR_SPACE, Text, TopBar,
} from '@/components/ui';
import { AddWalletSheet } from '@/components/wallets/add-wallet-sheet';
import { CountCashSheet } from '@/components/wallets/count-cash-sheet';
import { fetchWalletsOverview, type ComingUp, type WalletLine, type WalletsOverview } from '@/lib/wallets-overview';
import type { Wallet } from '@/lib/supabase';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { useTheme } from '@/lib/theme';
import { ago, heroAmount, listAmount, shortDate } from '@/lib/format';
import { RAW } from '@/constants/theme';

/**
 * Wallets (Figma section 993:51): what you have, wallet by wallet, and
 * what's about to land. Cash invites a count.
 */
export default function Wallets() {
    const router = useRouter();
    const [data, setData] = useState<WalletsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [countFor, setCountFor] = useState<Wallet | null | undefined>(undefined); // undefined = closed, null = new cash wallet

    const load = useCallback(async () => {
        try {
            setData(await fetchWalletsOverview());
            setError(false);
        } catch (e) {
            console.error('Error loading wallets:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useLiveRefresh(() => load(), 'wallets');

    const empty = !!data && data.lines.length === 0;
    const openWallet = (w: Wallet) => router.push({ pathname: '/wallets/wallet', params: { walletId: w.id } });

    return (
        <>
            <Screen
                bottomInset={TAB_BAR_SPACE}
                header={<TopBar title="Wallets" leading="none" right={<BandPill icon="plus" label="Add" onPress={() => setAddOpen(true)} />} />}
                scrollProps={{
                    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={RAW.onBand} colors={[RAW.onBand]} />,
                }}
            >
                {loading && !data ? (
                    <LoadingCards />
                ) : error && !data ? (
                    <Banner
                        tone="danger"
                        title="Couldn’t load your wallets"
                        body="Check your connection and try again."
                        action={{ label: 'Try again', onPress: () => { setLoading(true); load(); } }}
                    />
                ) : empty ? (
                    <EmptyWallets onAutopilot={() => router.push('/sms-settings')} onAdd={() => setAddOpen(true)} />
                ) : data && (
                    <>
                        <Card hero gap={16}>
                            <View style={{ gap: 2 }}>
                                <Text size={13} weight="semibold" tone="secondary">You have</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }} accessible accessibilityLabel={`GHS ${listAmount(data.total)}`}>
                                    <Text size={15} weight="bold" tone="secondary">GHS</Text>
                                    <Text weight="extrabold" size={32} style={{ letterSpacing: -0.96 }}>{listAmount(data.total)}</Text>
                                </View>
                                <Text variant="meta" tone="tertiary">
                                    Across {data.counted} {data.counted === 1 ? 'wallet' : 'wallets'}{data.cashUncounted ? ' · Cash not counted' : ''}
                                </Text>
                            </View>
                            <ListGroup bare>
                                {data.lines.map((l) => (
                                    <WalletRow key={l.wallet.id} line={l} onPress={() => openWallet(l.wallet)} onCount={() => setCountFor(l.wallet)} />
                                ))}
                            </ListGroup>
                        </Card>

                        {data.comingUp.length > 0 && (
                            <Card hero gap={8}>
                                <CardHeader title="Coming up" />
                                <ListGroup bare>
                                    {data.comingUp.map((c) => <ComingUpRow key={c.id} item={c} onPress={() => router.push('/expected-income')} />)}
                                </ListGroup>
                            </Card>
                        )}
                    </>
                )}
            </Screen>

            <AddWalletSheet
                visible={addOpen}
                onClose={() => setAddOpen(false)}
                onAdded={() => load()}
                onCash={() => setCountFor(data?.lines.find((l) => l.wallet.type === 'cash')?.wallet ?? null)}
            />
            <CountCashSheet visible={countFor !== undefined} wallet={countFor ?? null} onClose={() => setCountFor(undefined)} onSaved={load} />
        </>
    );
}

function WalletRow({ line, onPress, onCount }: { line: WalletLine; onPress: () => void; onCount: () => void }) {
    const w = line.wallet;
    const isCash = w.type === 'cash';
    const meta = line.uncounted
        ? 'Not counted yet'
        : line.lastActivity && Date.now() - line.lastActivity.getTime() < 86_400_000
            ? `Updated ${ago(line.lastActivity)}`
            : line.lastActivity
                ? `Last message ${shortDate(line.lastActivity)}`
                : isCash ? `Counted ${ago(new Date(w.updated_at ?? w.created_at))}` : 'No alerts yet';

    return (
        <ListRow
            leading={<CategoryTile tone={isCash ? 'cash' : 'accent'} icon={isCash ? 'cash' : w.type === 'bank' ? 'bank' : 'wallet'} />}
            title={w.name}
            meta={meta}
            value={line.uncounted ? undefined : listAmount(Number(w.current_balance) || 0)}
            trailing={line.uncounted ? <Button label="Count" variant="secondary" size="sm" onPress={onCount} /> : 'none'}
            onPress={onPress}
            accessibilityLabel={`${w.name}, ${line.uncounted ? 'not counted yet' : `GHS ${listAmount(Number(w.current_balance) || 0)}`}`}
        />
    );
}

function ComingUpRow({ item, onPress }: { item: ComingUp; onPress: () => void }) {
    const when = item.inDays === 0 ? 'today' : item.inDays === 1 ? 'tomorrow' : `in ${item.inDays} days`;
    return (
        <ListRow
            leading={<CategoryTile tone="cash" icon="receive" />}
            title={item.label}
            meta={item.meta}
            trailing={
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text size={15} weight="semibold" tone="success">≈ {heroAmount(item.amount)}</Text>
                    <Text variant="meta" weight="semibold" tone="secondary">{when}</Text>
                </View>
            }
            onPress={onPress}
            accessibilityLabel={`${item.label}, about GHS ${heroAmount(item.amount)}, ${when}`}
        />
    );
}

/** Shows the wallets you're likely to have, quietly, and how they'll appear (Figma 1006:1341). */
function EmptyWallets({ onAutopilot, onAdd }: { onAutopilot: () => void; onAdd: () => void }) {
    const { colors } = useTheme();
    const ghosts: { name: string; icon: 'wallet' | 'bank' }[] = [
        { name: 'MTN MoMo', icon: 'wallet' },
        { name: 'Telecel Cash', icon: 'wallet' },
        { name: 'Your bank', icon: 'bank' },
    ];
    return (
        <Card hero gap={16}>
            <View style={{ gap: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {ghosts.map((g) => (
                    <View key={g.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Icon name={g.icon} size={18} color={colors.text.tertiary} />
                        <Text size={13} weight="semibold" tone="secondary">{g.name}</Text>
                    </View>
                ))}
            </View>
            <View style={{ gap: 6, alignItems: 'center' }}>
                <Text variant="cardTitle" align="center">Wallets add themselves</Text>
                <Text size={13} tone="secondary" align="center">The first alert from each MoMo wallet or bank creates it, with its balance.</Text>
            </View>
            <Button label="Turn on autopilot" icon="flash" onPress={onAutopilot} />
            <Button label="Add one by hand" variant="ghost" onPress={onAdd} />
        </Card>
    );
}

/** Same two cards, greyed (Figma 1006:1426). */
function LoadingCards() {
    return (
        <>
            <Card hero gap={14}>
                <Skeleton width={70} height={10} radius={5} />
                <Skeleton width={160} height={28} radius={8} />
                <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </Card>
            <Card hero gap={14}>
                <Skeleton width={90} height={14} radius={6} />
                <SkeletonRow />
            </Card>
        </>
    );
}
