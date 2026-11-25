import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconName } from '@/components/ui';
import type { TransactionWithWallet } from './transaction-service';
import { loadMoneyWindow, merchantName, cedis, at } from './money-window';
import { flowOf } from './spending-service';
import { getCheckItems } from './check-service';
import { computeInsights } from './insights-engine';
import { getLimits, limitStatus } from './limits';
import { curLabel } from '@/lib/currency';

/**
 * Notifications (Figma 1003:862): what LogIt did and what needs you, newest
 * first. Built from your own activity, so it always matches the app: alerts
 * it logged, messages to check, salary in, this week's insight, limits
 * nearly reached. An item stays unread (blue dot) until you open it or tap
 * Mark all read (Figma 1003:862, 1154:5680).
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

/** Everything at or before this time is read (set by Mark all read). Same key as the old "last opened". */
const READ_BEFORE = 'logit.notificationsSeenAt';
/** Items opened one by one since then. */
const READ_IDS = 'logit.notificationsReadIds';

export interface ReadState {
    before: Date | null;
    ids: Set<string>;
}

export async function getReadState(): Promise<ReadState> {
    const [before, ids] = await Promise.all([
        AsyncStorage.getItem(READ_BEFORE).catch(() => null),
        AsyncStorage.getItem(READ_IDS).catch(() => null),
    ]);
    let list: string[] = [];
    try { list = ids ? (JSON.parse(ids) as string[]) : []; } catch { list = []; }
    return { before: before ? new Date(before) : null, ids: new Set(list) };
}

export function isUnread(item: ActivityItem, read: ReadState): boolean {
    if (read.ids.has(item.id)) return false;
    return !read.before || item.at > read.before;
}

/** One item opened. Returns the new state. */
export async function markRead(item: ActivityItem, read: ReadState): Promise<ReadState> {
    const ids = new Set(read.ids).add(item.id);
    // Keep the list small: only ids still newer than the cut-off matter.
    await AsyncStorage.setItem(READ_IDS, JSON.stringify([...ids].slice(-200))).catch(() => {});
    return { before: read.before, ids };
}

/** Mark all read: everything up to now, and the per-item list starts again. */
export async function markAllRead(): Promise<ReadState> {
    const now = new Date();
    await Promise.all([
        AsyncStorage.setItem(READ_BEFORE, now.toISOString()).catch(() => {}),
        AsyncStorage.removeItem(READ_IDS).catch(() => {}),
    ]);
    return { before: now, ids: new Set() };
}

/** Put a Mark all read back (Undo). */
export async function restoreReadState(read: ReadState): Promise<void> {
    await Promise.all([
        read.before ? AsyncStorage.setItem(READ_BEFORE, read.before.toISOString()).catch(() => {}) : AsyncStorage.removeItem(READ_BEFORE).catch(() => {}),
        AsyncStorage.setItem(READ_IDS, JSON.stringify([...read.ids])).catch(() => {}),
    ]);
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
    for (const t of w.rows) {
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
                title: salary ? `${salary.label} of ${curLabel()} ${cedis(Number(t.amount))} logged` : `${curLabel()} ${amount} came in from ${who}`,
                meta: [t.wallet?.name, when(d, now)].filter(Boolean).join(' · '),
                open: { kind: 'transaction', tx: t },
            });
        } else {
            const toPerson = t.category === 'transfer';
            items.push({
                id: `tx:${t.id}`, icon: 'flash', tone: 'accent', at: d,
                title: `Logged ${curLabel()} ${amount} ${toPerson ? 'to' : 'at'} ${toPerson ? who.split(' ')[0] : who}`,
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
            title: s.over > 0 ? `${name} is ${curLabel()} ${cedis(s.over)} over this week` : `${name}: ${curLabel()} ${cedis(s.spent)} of ${cedis(l.amount)}`,
            meta: s.over > 0 ? `It happens · resets ${s.resetsOn}` : `${curLabel()} ${cedis(s.left)} left until ${s.resetsOn}`,
            open: { kind: 'limits' },
        });
    }

    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);
}
