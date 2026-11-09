import React from 'react';
import { CategoryTile, ListRow } from '@/components/ui';
import type { TransactionWithWallet } from '@/lib/transaction-service';
import { categoryStyle } from '@/lib/category-style';
import { flowOf, startOfWeek } from '@/lib/spending-service';
import { dayHeading, initials, listAmount, receivedAmount, shortDate, time24 } from '@/lib/format';

/**
 * Where a row sits changes its meta line:
 * - 'day'    (default) under a day header: "Sent · MTN MoMo · 13:02", moved rows "Moved · not spending".
 * - 'search' no day header, so the date leads: "12 Nov · Card · 11:20" (Figma 1004:853).
 * - 'moved'  the Moved filter, which explains itself once at the top: "MTN MoMo → Cash · Mon" (Figma 1004:755).
 * - 'wallet' inside one wallet, so no wallet name: "Sent · Today 13:02" (Figma 1006:1096).
 */
export type RowContext = 'day' | 'search' | 'moved' | 'wallet';

/**
 * One transaction in a v1 list (Figma 1004:617): tile, name, meta, amount
 * without currency; received money green with a plus; moved money neutral.
 */
export function TransactionRow({ tx, onPress, context = 'day' }: {
    tx: TransactionWithWallet;
    onPress?: () => void;
    context?: RowContext;
}) {
    const flow = flowOf(tx);
    const style = categoryStyle(tx.category);
    const isPerson = tx.category === 'transfer' || (flow === 'in' && !tx.category);
    const at = new Date(tx.transaction_date || tx.created_at);
    const time = `${tx.date_source === 'estimated' ? '≈ ' : ''}${time24(at)}`;

    const kind = flow === 'moved' ? 'Moved' : flow === 'in' ? 'Received' : isPerson ? 'Sent' : null;
    let meta: string;
    if (context === 'moved' && flow === 'moved') {
        meta = [movedRoute(tx), weekdayOrDate(at)].filter(Boolean).join(' · ');
    } else if (flow === 'moved' && context === 'day') {
        meta = 'Moved · not spending';
    } else if (context === 'wallet') {
        meta = [kind, `${dayHeading(at)} ${time}`].filter(Boolean).join(' · ');
    } else if (context === 'search') {
        meta = [dayHeading(at), tx.wallet?.name, time].filter(Boolean).join(' · ');
    } else {
        meta = [kind, tx.wallet?.name, time].filter(Boolean).join(' · ');
    }

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

/** "MTN MoMo → Cash", or "From MTN MoMo" when only one side is known. */
function movedRoute(tx: TransactionWithWallet): string | null {
    const from = tx.transfer?.from_wallet?.name;
    const to = tx.transfer?.to_wallet?.name;
    if (from && to) return `${from} → ${to}`;
    const own = tx.wallet?.name;
    if (!own) return null;
    return tx.transfer_side === 'to' ? `Into ${own}` : `From ${own}`;
}

/** "Tue" within this week, otherwise "26 Nov". */
function weekdayOrDate(d: Date, now = new Date()): string {
    return d >= startOfWeek(now)
        ? d.toLocaleDateString('en-GB', { weekday: 'short' })
        : shortDate(d);
}
