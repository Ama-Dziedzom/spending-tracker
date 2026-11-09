import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconName } from '@/components/ui';
import type { TransactionWithWallet } from './transaction-service';
import { loadMoneyWindow, merchantName, cedis, at } from './money-window';
import { flowOf } from './spending-service';
import { getCheckItems } from './check-service';
import { computeInsights } from './insights-engine';
import { getLimits, limitStatus } from './limits';

/**
 * Notifications (Figma 1003:862): what LogIt did and what needs you, newest
 * first. Built from your own activity, so it always matches the app: alerts
 * it logged, messages to check, salary in, this week's insight, limits
 * nearly reached. Unread = newer than when you last opened the list.
 */
export type ActivityTone = 'accent' | 'warn' | 'success' | 'insight';

export interface ActivityItem {
    id: string;
    icon: IconName;
    tone: ActivityTone;
    title: string;
    meta: string;
    at: Date;
    /** What tapping does. */
    open:
        | { kind: 'transaction'; tx: TransactionWithWallet }
        | { kind: 'check' }
        | { kind: 'insight'; category: string }
        | { kind: 'limits' };
}

const SEEN = 'logit.notificationsSeenAt';

export async function lastSeen(): Promise<Date | null> {
    const v = await AsyncStorage.getItem(SEEN).catch(() => null);
    return v ? new Date(v) : null;
}

export async function markSeen(): Promise<void> {
    await AsyncStorage.setItem(SEEN, new Date().toISOString()).catch(() => {});
}

/** "2 min ago", "1 h ago", "Fri", "3 Nov" (Figma 1003:893). */
export function when(d: Date, now = new Date()): string {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export async function getActivity(now = new Date()): Promise<ActivityItem[]> {
    const since = new Date(now.getTime() - 14 * 86_400_000);
    const [w, check, limits] = await Promise.all([
        loadMoneyWindow(true),
        getCheckItems().catch(() => []),
        getLimits().catch(() => []),
    ]);
    const items: ActivityItem[] = [];

    // Alerts LogIt logged by itself, and money that came in.
    for (const t of w.txs) {
        const d = new Date(t.created_at || t.transaction_date);
        if (d < since || !t.raw_sms) continue;
        const flow = flowOf(t);
        if (flow === 'moved') continue;
        const who = merchantName(t.description);
        const amount = Number(t.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (flow === 'in') {
            const salary = w.expected.find((e) => Math.abs(Number(e.amount) - Number(t.amount)) <= Number(e.amount) * 0.15);
            items.push({
                id: `in:${t.id}`, icon: 'receive', tone: 'success', at: d,
                title: salary ? `${salary.label} of GHS ${cedis(Number(t.amount))} logged` : `GHS ${amount} came in from ${who}`,
                meta: [t.wallet?.name, when(d, now)].filter(Boolean).join(' · '),
                open: { kind: 'transaction', tx: t },
            });
        } else {
            const toPerson = t.category === 'transfer';
            items.push({
                id: `tx:${t.id}`, icon: 'flash', tone: 'accent', at: d,
                title: `Logged GHS ${amount} ${toPerson ? 'to' : 'at'} ${toPerson ? who.split(' ')[0] : who}`,
                meta: [t.wallet?.name, when(d, now)].filter(Boolean).join(' · '),
                open: { kind: 'transaction', tx: t },
            });
        }
    }

    // Messages waiting in Check.
    if (check.length) {
        const newest = check
            .map((c) => new Date(c.kind === 'account' ? c.tx.created_at || c.tx.transaction_date : c.review.created_at))
            .sort((a, b) => b.getTime() - a.getTime())[0];
        items.push({
            id: `check:${check.length}:${newest.toISOString()}`, icon: 'check', tone: 'warn', at: newest,
            title: `${check.length} ${check.length === 1 ? 'message needs' : 'messages need'} a look`,
            meta: `LogIt wasn’t sure · ${when(newest, now)}`,
            open: { kind: 'check' },
        });
    }

    // This week's insight.
    const finding = computeInsights(w, now).findings.find((f) => f.kind === 'category');
    if (finding && finding.kind === 'category') {
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 9);
        items.push({
            id: `insight:${finding.category}:${monday.toDateString()}`, icon: 'idea', tone: 'insight', at: monday,
            title: `${finding.style.label} is ${finding.headline.toLowerCase()} this week`,
            meta: `Insight · ${when(monday, now)}`,
            open: { kind: 'insight', category: finding.category },
        });
    }

    // Limits nearly reached or passed this week.
    for (const l of limits) {
        const s = limitStatus(l, w.txs, now);
        if (!s.warned) continue;
        const latest = w.txs.filter((t) => t.category === l.category).map(at).sort((a, b) => b.getTime() - a.getTime())[0] ?? now;
        const name = l.category === 'airtime' ? 'Airtime & data' : l.category.charAt(0).toUpperCase() + l.category.slice(1);
        items.push({
            id: `limit:${l.id}:${s.over > 0 ? 'over' : 'near'}`, icon: 'shield', tone: 'warn', at: latest,
            title: s.over > 0 ? `${name} is GHS ${cedis(s.over)} over this week` : `${name}: GHS ${cedis(s.spent)} of ${cedis(l.amount)}`,
            meta: s.over > 0 ? `It happens · resets ${s.resetsOn}` : `GHS ${cedis(s.left)} left until ${s.resetsOn}`,
            open: { kind: 'limits' },
        });
    }

    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);
}
