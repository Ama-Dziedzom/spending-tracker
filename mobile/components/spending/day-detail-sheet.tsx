import React from 'react';
import { View } from 'react-native';
import { Button, Chip, ListGroup, Sheet, Text } from '@/components/ui';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { flowOf } from '@/lib/spending-service';
import { listAmount, longDate, sameDay } from '@/lib/format';
import { TransactionRow } from './transaction-row';

/**
 * Day detail (Figma 1003:768): tap a bar, that day's entries in a sheet.
 * The week stays behind it for context.
 */
export function DayDetailSheet({ date, transactions, isBiggest, onClose, onTransaction, onSeeAll }: {
    date: Date | null;
    transactions: TransactionWithWallet[];
    isBiggest: boolean;
    onClose: () => void;
    onTransaction: (tx: TransactionWithWallet) => void;
    onSeeAll: () => void;
}) {
    const entries = date
        ? transactions.filter((t) => sameDay(new Date(t.transaction_date), date) && flowOf(t) !== 'moved')
        : [];
    const spent = entries.filter((t) => flowOf(t) === 'spent').reduce((s, t) => s + Number(t.amount), 0);

    return (
        <Sheet visible={!!date} onClose={onClose}>
            {date && (
                <>
                    <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Text variant="screenTitle" size={20} accessibilityRole="header">{longDate(date)}</Text>
                            <Text size={15} weight="semibold">{listAmount(spent)}</Text>
                        </View>
                        {isBiggest && <View style={{ alignSelf: 'flex-start' }}><Chip variant="tag" tone="accent" label="Your biggest day this week" /></View>}
                    </View>
                    <ListGroup bare>
                        {entries.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} onPress={() => { onClose(); onTransaction(tx); }} />
                        ))}
                    </ListGroup>
                    <Button label="See all transactions" variant="secondary" size="md" onPress={() => { onClose(); onSeeAll(); }} />
                </>
            )}
        </Sheet>
    );
}
