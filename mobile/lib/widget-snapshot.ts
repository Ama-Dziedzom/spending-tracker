import { NativeModules, Platform } from 'react-native';
import type { Wallet } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { flowOf, summarise, shortName } from './spending-service';
import { categoryStyle } from './category-style';
import { lastAlertAt, getProfile } from './settings-service';

/**
 * What the home-screen and lock-screen widgets show (Figma 1037:4555,
 * handoff §9). The app writes one small JSON snapshot into the App Group
 * after it loads Spending; the widget extension (plugins/widget) only ever
 * reads that, so widgets never need a session or the network.
 */
const { AppGroupBridge } = NativeModules;
const KEY = 'widget_snapshot';

/** App category → SF Symbol used in the widget tiles. */
const SYMBOL: Record<string, string> = {
    food: 'fork.knife', transport: 'car', shopping: 'bag', bills: 'doc.text', airtime: 'iphone',
    subscription: 'repeat', cash: 'banknote', loans: 'arrow.left.arrow.right', fees: 'percent', transfer: 'person.2',
};

const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

function age(d: Date | null, now: Date): string {
    if (!d) return '';
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 60) return `${Math.max(1, mins)} min ago`;
    if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function write(value: object | null) {
    if (Platform.OS !== 'ios' || !AppGroupBridge) return;
    try {
        if (value) AppGroupBridge.setItem(KEY, JSON.stringify(value));
        else AppGroupBridge.removeItem(KEY);
        AppGroupBridge.reloadWidgets?.();
    } catch {
        // Widgets are a nice-to-have; never let them break the app.
    }
}

export async function updateWidgetSnapshot(input: {
    txs: TransactionWithWallet[];
    wallets: Wallet[];
    toCheck: number;
    now?: Date;
}): Promise<void> {
    if (Platform.OS !== 'ios' || !AppGroupBridge) return;
    const now = input.now ?? new Date();
    const s = summarise(input.txs, now);
    const [profile, last] = await Promise.all([getProfile().catch(() => null), lastAlertAt().catch(() => null)]);

    // Newest entries this week, money in or out (moved left out), like the Spending list.
    const latest = input.txs
        .filter((t) => flowOf(t) !== 'moved')
        .slice(0, 3)
        .map((t) => {
            const d = new Date(t.transaction_date || t.created_at);
            const incoming = flowOf(t) === 'in';
            const style = categoryStyle(t.category || 'other');
            return {
                name: shortName(t.description) || style.label,
                meta: [t.wallet?.name, time(d)].filter(Boolean).join(' · '),
                amount: Number(t.amount) || 0,
                incoming,
                symbol: incoming ? 'arrow.down.left' : SYMBOL[t.category ?? ''] ?? 'circle.grid.2x2',
                tone: incoming ? 'success' : style.tone,
                time: time(d),
            };
        });

    // Latest entry per wallet, for the wallet ages.
    const lastByWallet = new Map<string, Date>();
    for (const t of input.txs) {
        if (t.wallet_id && !lastByWallet.has(t.wallet_id)) lastByWallet.set(t.wallet_id, new Date(t.transaction_date || t.created_at));
    }
    const wallets = input.wallets.map((w) => {
        const uncounted = w.type === 'cash' && !lastByWallet.has(w.id) && !Number(w.current_balance);
        return { name: w.name, type: w.type, balance: Number(w.current_balance) || 0, age: age(lastByWallet.get(w.id) ?? null, now), uncounted };
    });

    write({
        v: 1,
        signedIn: true,
        updatedAt: now.toISOString(),
        hideLockScreen: profile?.hideWidgetAmounts.lock_screen ?? true,
        hideHomeScreen: profile?.hideWidgetAmounts.home_screen ?? false,
        // iPhone can't see the automation; an alert in the last two weeks means it works (same rule as Autopilot settings).
        autopilotOn: !last || now.getTime() - last.getTime() < 14 * 86_400_000,
        todaySpent: s.today.spent,
        todayPayments: s.today.payments,
        weekSpent: s.week.spent,
        weekChange: s.week.lastWeekSameSpan > 0 ? s.week.spent - s.week.lastWeekSameSpan : null,
        dateLabel: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''),
        days: s.week.days.map((d) => ({ letter: d.letter, value: d.spent ?? 0, isToday: d.isToday, future: d.spent === null })),
        latest,
        wallets,
        walletsTotal: wallets.filter((w) => !w.uncounted).reduce((sum, w) => sum + w.balance, 0),
        toCheck: input.toCheck,
    });
}

/** Signed out: widgets show "Log in", and no numbers from the last account stay on screen. */
export function clearWidgetSnapshot() {
    write({
        v: 1, signedIn: false, updatedAt: new Date().toISOString(), hideLockScreen: true, hideHomeScreen: true,
        autopilotOn: true, todaySpent: 0, todayPayments: 0, weekSpent: 0, weekChange: null, dateLabel: '',
        days: [], latest: [], wallets: [], walletsTotal: 0, toCheck: 0,
    });
}
