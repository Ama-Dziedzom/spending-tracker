import React from 'react';
import { CategoryTile, ListRow } from '@/components/ui';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { categoryStyle } from '@/lib/category-style';
import { flowOf } from '@/lib/spending-service';
import { initials, listAmount, receivedAmount, time24 } from '@/lib/format';

/**
 * One transaction in a v1 list (Figma 1004:617): tile, name, "Sent · MTN MoMo · 13:02",
 * amount without currency; received money green with a plus; moved money neutral.
 */
export function TransactionRow({ tx, onPress }: { tx: TransactionWithWallet; onPress?: () => void }) {
    const flow = flowOf(tx);
    const style = categoryStyle(tx.category);
    const isPerson = tx.category === 'transfer' || (flow === 'in' && !tx.category);
    const when = new Date(tx.transaction_date || tx.created_at);

    const kind = flow === 'moved' ? 'Moved' : flow === 'in' ? 'Received' : isPerson ? 'Sent' : null;
    const meta = flow === 'moved'
        ? 'Moved · not spending'
        : [kind, tx.wallet?.name, `${tx.date_source === 'estimated' ? '≈ ' : ''}${time24(when)}`].filter(Boolean).join(' · ');

    const leading = flow === 'moved'
        ? <CategoryTile tone="muted" icon="moved" />
        : isPerson
            ? <CategoryTile tone="people" initials={initials(tx.description)} />
            : <CategoryTile tone={style.tone} icon={style.icon} />;

    return (
        <ListRow
            leading={leading}
            title={tx.description || style.label}
            meta={meta}
            value={flow === 'in' ? receivedAmount(tx.amount) : listAmount(tx.amount)}
            valueTone={flow === 'in' ? 'success' : 'primary'}
            onPress={onPress}
        />
    );
}
