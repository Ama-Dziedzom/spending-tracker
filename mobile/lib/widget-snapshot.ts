import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wallet } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { flowOf, summarise } from './spending-service';
import { merchantName } from './money-window';
import { categoryStyle } from './category-style';
import { lastAlertAt, getProfile } from './settings-service';
import { curLabel } from './currency';

/**
 * What the home-screen and lock-screen widgets show (Figma 1037:4555,
 * handoff §9). The app writes one small JSON snapshot into the App Group
 * after it loads Spending (SharedPreferences on Android); the widgets
 * (plugins/widget on iOS, plugins/android/widget on Android) only ever
 * read that, so they never need a session or the network.
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

/** The last snapshot written, so a settings change can update the widgets without reloading data. */
let last: Record<string, unknown> | null = null;
const LAST_KEY = 'logit.widgetSnapshot.last';

function write(value: Record<string, unknown> | null) {
    last = value;
    AsyncStorage.setItem(LAST_KEY, JSON.stringify(value)).catch(() => {});
    if (!AppGroupBridge) return;
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
    if (!AppGroupBridge) return;
    const now = input.now ?? new Date();
    const s = summarise(input.txs, now);
    const [profile, last, androidSms] = await Promise.all([
        getProfile().catch(() => null),
        lastAlertAt().catch(() => null),
        Platform.OS === 'android' ? AsyncStorage.getItem('sms_auto_logging_enabled').catch(() => null) : null,
    ]);

    // Newest entries this week, money in or out (moved left out), like the Spending list.
    const latest = input.txs
        .filter((t) => flowOf(t) !== 'moved')
        .slice(0, 3)
        .map((t) => {
            const d = new Date(t.transaction_date || t.created_at);
            const incoming = flowOf(t) === 'in';
            const style = categoryStyle(t.category || 'other');
            return {
                name: merchantName(t.description ?? '') || style.label,
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
        // Same rules as Autopilot settings: the SMS switch on Android; on iPhone, which can't
        // see the automation, an alert in the last two weeks means it works.
        autopilotOn: Platform.OS === 'android' ? androidSms === 'true' : !last || now.getTime() - last.getTime() < 14 * 86_400_000,
        todaySpent: s.today.spent,
        todayPayments: s.today.payments,
        weekSpent: s.week.spent,
        weekChange: s.week.lastWeekSameSpan > 0 ? s.week.spent - s.week.lastWeekSameSpan : null,
        dateLabel: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''),
        days: s.week.days.map((d) => ({ letter: d.letter, value: d.spent ?? 0, isToday: d.isToday, future: d.spent === null })),
        latest,
        wallets,
        walletsTotal: wallets.filter((w) => !w.uncounted).reduce((sum, w) => sum + w.balance, 0),
        currency: curLabel(),
        toCheck: input.toCheck,
    });
}

/** Signed out: widgets show "Log in", and no numbers from the last account stay on screen. */
export function clearWidgetSnapshot() {
    write({
        v: 1, signedIn: false, updatedAt: new Date().toISOString(), hideLockScreen: true, hideHomeScreen: true,
        autopilotOn: true, todaySpent: 0, todayPayments: 0, weekSpent: 0, weekChange: null, dateLabel: '',
        days: [], latest: [], wallets: [], walletsTotal: 0, toCheck: 0, currency: curLabel(),
    });
}

/**
 * "Hide amounts on widgets" changed: rewrite the snapshot with the new flags
 * and refresh the widgets now, instead of waiting for the next Spending load.
 */
export async function applyWidgetPrivacy(h: { lock_screen: boolean; home_screen: boolean }) {
    if (!last) {
        const saved = await AsyncStorage.getItem(LAST_KEY).catch(() => null);
        try { last = saved ? JSON.parse(saved) : null; } catch { last = null; }
    }
    if (!last || last.signedIn === false) return;
    write({ ...last, hideLockScreen: h.lock_screen, hideHomeScreen: h.home_screen, updatedAt: new Date().toISOString() });
}
