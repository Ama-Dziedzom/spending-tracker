import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Card, CategoryTile, Icon, ListGroup, ListRow, Screen, SkeletonRow, Text, TopBar } from '@/components/ui';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import { useTheme } from '@/lib/theme';
import { getActivity, lastSeen, markSeen, type ActivityItem, type ActivityTone } from '@/lib/activity';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { RAW } from '@/constants/theme';

const TILE: Record<ActivityTone, 'accent' | 'warn' | 'success' | 'transport'> = {
    accent: 'accent',
    warn: 'warn',
    success: 'success',
    insight: 'transport',
};

/**
 * Notifications (Figma 1003:862) and Notifications · empty (1003:927).
 * Opens from the bell on Spending. A blue dot marks what's new since you
 * last looked.
 */
export default function Notifications() {
    const { colors } = useTheme();
    const [items, setItems] = useState<ActivityItem[] | null>(null);
    const [seenAt, setSeenAt] = useState<Date | null>(null);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [detail, setDetail] = useState<TransactionWithWallet | null>(null);
    const loadedOnce = useRef(false);

    const load = useCallback(async () => {
        try {
            if (!loadedOnce.current) setSeenAt(await lastSeen());
            setItems(await getActivity());
            setError(false);
            if (!loadedOnce.current) { loadedOnce.current = true; markSeen(); }
        } catch (e) {
            console.error('Notifications failed:', e);
            setError(true);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const open = (item: ActivityItem) => {
        const o = item.open;
        if (o.kind === 'transaction') setDetail(o.tx);
        else if (o.kind === 'check') router.push('/review');
        else if (o.kind === 'insight') router.push({ pathname: '/insights/insight', params: { category: o.category } });
        else router.push('/limits');
    };

    return (
        <>
            <Screen
                header={<TopBar title="Notifications" />}
                scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={RAW.onBand} colors={[RAW.onBand]} /> }}
            >
                {error && !items ? (
                    <Banner tone="danger" title="Couldn’t load notifications" body="Check your connection and try again." action={{ label: 'Try again', onPress: load }} />
                ) : !items ? (
                    <Card hero gap={18}><SkeletonRow /><SkeletonRow /><SkeletonRow /></Card>
                ) : items.length === 0 ? (
                    <Card hero style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: colors.brand['accent-tint'], alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="bell" size={26} color={colors.brand['accent-text']} />
                        </View>
                        <Text variant="cardTitle" align="center">Nothing new</Text>
                        <Text size={14} tone="secondary" align="center">When LogIt logs something or needs you, it shows up here.</Text>
                    </Card>
                ) : (
                    <ListGroup style={{ borderRadius: 28, paddingHorizontal: 18, paddingVertical: 7 }}>
                        {items.map((item) => {
                            const unread = !seenAt || item.at > seenAt;
                            return (
                                <ListRow
                                    key={item.id}
                                    leading={<CategoryTile tone={TILE[item.tone]} icon={item.icon} />}
                                    title={item.title}
                                    meta={item.meta}
                                    trailing={unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.accent }} accessibilityLabel="New" /> : 'none'}
                                    onPress={() => open(item)}
                                />
                            );
                        })}
                    </ListGroup>
                )}
            </Screen>

            <TransactionDetailSheet transaction={detail} onClose={() => setDetail(null)} onChanged={load} />
        </>
    );
}
