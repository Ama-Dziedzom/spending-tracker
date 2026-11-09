import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
    Banner, Button, Card, CardHeader, CategoryTile, Dialog, FieldError, Icon, ListGroup, RoundButton, Screen, Sheet,
    Skeleton, SkeletonRow, TAB_BAR_SPACE, Text, TopBar, useToast,
} from '@/components/ui';
import { TransactionRow } from '@/components/spending/transaction-row';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import { CountCashSheet } from '@/components/wallets/count-cash-sheet';
import { fetchWalletDetail, renameWallet, type WalletDetail } from '@/lib/wallets-overview';
import { deleteWallet } from '@/lib/wallet-service';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { usePendingRemovals } from '@/lib/transaction-edits';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { useTheme } from '@/lib/theme';
import { ago, listAmount } from '@/lib/format';
import { FONT, RAW } from '@/constants/theme';

/**
 * Wallet detail (Figma 1006:1096). The balance comes from the alert itself,
 * so it's labelled with its age. In and out are kept apart. Lives under the
 * Wallets tab, which stays highlighted.
 */
export default function WalletScreen() {
    const { walletId } = useLocalSearchParams<{ walletId: string }>();
    const [data, setData] = useState<WalletDetail | null>(null);
    const [missing, setMissing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [detailTx, setDetailTx] = useState<TransactionWithWallet | null>(null);
    const [manageOpen, setManageOpen] = useState(false);
    const [countOpen, setCountOpen] = useState(false);
    const removing = usePendingRemovals();

    const load = useCallback(async () => {
        if (!walletId) return;
        try {
            const d = await fetchWalletDetail(walletId);
            setData(d);
            setMissing(!d);
            setError(false);
        } catch (e) {
            console.error('Error loading wallet:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [walletId]);

    useEffect(() => { setLoading(true); setData(null); load(); }, [load]);
    useLiveRefresh(() => load(), 'wallet');

    const w = data?.wallet;
    const isCash = w?.type === 'cash';
    const recent = data?.recent.filter((t) => !removing.has(t.id)) ?? [];

    const footnote = !data?.balanceAt ? null
        : data.balanceFrom === 'alert' ? `Balance from your latest alert · ${ago(data.balanceAt)}`
            : data.balanceFrom === 'count' ? `From your count and what you’ve logged · updated ${ago(data.balanceAt)}`
                : `Worked out from your entries · updated ${ago(data.balanceAt)}`;

    return (
        <>
            <Screen
                bottomInset={TAB_BAR_SPACE}
                header={
                    <TopBar
                        title={w?.name ?? ' '}
                        right={w ? <RoundButton icon="more" label="Manage wallet" onPress={() => setManageOpen(true)} /> : undefined}
                    />
                }
                scrollProps={{
                    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={RAW.onBand} colors={[RAW.onBand]} />,
                }}
            >
                {loading && !data ? (
                    <Card hero gap={14}>
                        <Skeleton width={120} height={28} radius={8} />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Skeleton width="48%" height={58} radius={16} />
                            <Skeleton width="48%" height={58} radius={16} />
                        </View>
                        <SkeletonRow /><SkeletonRow />
                    </Card>
                ) : missing ? (
                    <Banner tone="info" title="This wallet isn’t here any more" body="It may have been removed." action={{ label: 'Back to wallets', onPress: () => router.back() }} />
                ) : error && !data ? (
                    <Banner tone="danger" title="Couldn’t load this wallet" body="Check your connection and try again." action={{ label: 'Try again', onPress: () => { setLoading(true); load(); } }} />
                ) : data && w && (
                    <>
                        <Card hero gap={16}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <CategoryTile tone={isCash ? 'cash' : 'accent'} icon={isCash ? 'cash' : w.type === 'bank' ? 'bank' : 'wallet'} size={44} />
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text size={13} weight="semibold" tone="secondary">Balance</Text>
                                    <Text weight="extrabold" size={28} accessibilityLabel={`Balance GHS ${listAmount(Number(w.current_balance) || 0)}`}>
                                        {listAmount(Number(w.current_balance) || 0)}
                                    </Text>
                                </View>
                                {isCash && <Button label="Count" variant="secondary" size="sm" onPress={() => setCountOpen(true)} />}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Flow icon="receive" label="In this week" amount={data.inThisWeek} tone="success" />
                                <Flow icon="sent" label="Out this week" amount={data.outThisWeek} tone="primary" />
                            </View>
                            {footnote && <Text variant="meta" tone="tertiary">{footnote}</Text>}
                        </Card>

                        <Card hero gap={8}>
                            <CardHeader title="Recent" />
                            {recent.length === 0 ? (
                                <Text size={13} tone="secondary" style={{ paddingVertical: 8 }}>
                                    {isCash ? 'Nothing logged yet. Use + and Log cash when you spend cash.' : 'Nothing yet. Entries appear here as alerts arrive.'}
                                </Text>
                            ) : (
                                <ListGroup bare>
                                    {recent.map((tx) => <TransactionRow key={tx.id} tx={tx} context="wallet" onPress={() => setDetailTx(tx)} />)}
                                </ListGroup>
                            )}
                        </Card>
                    </>
                )}
            </Screen>

            <TransactionDetailSheet transaction={detailTx} onClose={() => setDetailTx(null)} onChanged={load} />
            {w && <ManageSheet visible={manageOpen} name={w.name} walletId={w.id} onClose={() => setManageOpen(false)} onChanged={load} />}
            {w && isCash && <CountCashSheet visible={countOpen} wallet={w} onClose={() => setCountOpen(false)} onSaved={load} />}
        </>
    );
}

/** "In this week" / "Out this week" tile. */
function Flow({ icon, label, amount, tone }: { icon: 'receive' | 'sent'; label: string; amount: number; tone: 'success' | 'primary' }) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, backgroundColor: colors.bg.muted, borderRadius: 16, padding: 12, gap: 4 }} accessible accessibilityLabel={`${label}, GHS ${listAmount(amount)}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={icon} size={14} color={colors.text.secondary} />
                <Text variant="meta" weight="semibold" tone="secondary">{label}</Text>
            </View>
            <Text size={16} weight="bold" tone={tone}>{listAmount(amount)}</Text>
        </View>
    );
}

/** Rename or remove. Removing hides the wallet; its entries stay in your history. */
function ManageSheet({ visible, name, walletId, onClose, onChanged }: {
    visible: boolean;
    name: string;
    walletId: string;
    onClose: () => void;
    onChanged: () => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [value, setValue] = useState(name);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);

    useEffect(() => { if (visible) { setValue(name); setError(null); } }, [visible, name]);

    const save = async () => {
        if (!value.trim()) { setError('Give it a name, like MTN MoMo.'); return; }
        setBusy(true);
        try {
            await renameWallet(walletId, value);
            toast.show({ message: `Renamed · ${value.trim()}` });
            onChanged();
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t rename it. Try again.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setConfirm(false);
        const ok = await deleteWallet(walletId);
        if (!ok) { toast.show({ message: 'Couldn’t remove it. Try again.', icon: 'alert' }); return; }
        toast.show({ message: `Removed · ${name}` });
        onClose();
        router.back();
    };

    return (
        <>
            <Sheet visible={visible} onClose={onClose} title="Wallet">
                <View style={{ gap: 6 }}>
                    <Text variant="row" tone="secondary">Name</Text>
                    <BottomSheetTextInput
                        value={value}
                        onChangeText={(t) => { setValue(t); setError(null); }}
                        maxLength={40}
                        accessibilityLabel="Wallet name"
                        style={{
                            fontFamily: FONT.semibold, fontSize: 16, color: colors.text.primary,
                            backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                            borderWidth: 1.5, borderColor: error ? colors.status.danger : 'transparent',
                        }}
                    />
                    {error && <FieldError message={error} />}
                </View>
                <Button label="Save" busy={busy} disabled={value.trim() === name} onPress={save} />
                <Button label="Remove wallet" icon="trash" variant="dangerSoft" size="md" onPress={() => setConfirm(true)} />
            </Sheet>
            <Dialog
                visible={confirm}
                icon="trash"
                title={`Remove ${name}?`}
                body="It disappears from Wallets. Its entries stay in your history."
                cancelLabel="Keep"
                confirmLabel="Remove"
                onCancel={() => setConfirm(false)}
                onConfirm={remove}
            />
        </>
    );
}
