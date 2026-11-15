import type { TransactionWithWallet } from './transaction-service';
import { categoryStyle } from './category-style';
import { flowOf, startOfMonth } from './spending-service';
import { merchantKey } from './category-rules';
import { type MoneyWindow, addDays, amt, at, between, catOf, cedis, inOf, merchantName, monthLong, spentOf, startOfDay, sum } from './money-window';

/**
 * A plain-text summary of someone's money for the Ask LogIt chat. Built on
 * the phone so it uses the same rules as the rest of the app (splits, moves
 * between own wallets). Totals and names only: no raw messages, no phone
 * numbers or references.
 */
export function buildMoneySnapshot(w: MoneyWindow, now = new Date()): string {
    const lines: string[] = [];
    const g = (n: number) => `GHS ${cedis(n)}`;
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    lines.push(`Today: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Day ${now.getDate()} of ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} this month.`);
    if (w.firstEntryAt) lines.push(`Logging since: ${w.firstEntryAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`);

    // Wallets
    if (w.wallets.length) {
        lines.push('', 'WALLETS (current balance)');
        for (const wl of w.wallets) lines.push(`- ${wl.name}: ${g(Number(wl.current_balance) || 0)}`);
        lines.push(`Total across wallets: ${g(w.wallets.reduce((s, x) => s + (Number(x.current_balance) || 0), 0))}`);
    }

    // Expected income
    if (w.expected.length) {
        lines.push('', 'EXPECTED INCOME (set up by the person)');
        for (const e of w.expected.filter((x) => x.is_active)) {
            lines.push(`- ${e.label || 'Income'}: ${g(Number(e.amount))} around day ${e.day_of_month} of each month`);
        }
    }

    // Month by month
    lines.push('', 'MONTH BY MONTH (came in / spent / net; current month in progress)');
    for (let i = 5; i >= 0; i--) {
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = i === 0 ? tomorrow : new Date(s.getFullYear(), s.getMonth() + 1, 1);
        const list = between(w.txs, s, e);
        const cameIn = sum(inOf(list));
        const spent = sum(spentOf(list));
        const label = `${monthLong(s)} ${s.getFullYear()}${i === 0 ? ' (so far)' : ''}`;
        if (cameIn === 0 && spent === 0) { lines.push(`- ${label}: nothing logged`); continue; }
        const rate = cameIn > 0 ? `, kept ${Math.round(((cameIn - spent) / cameIn) * 100)}% of income` : '';
        lines.push(`- ${label}: in ${g(cameIn)} / spent ${g(spent)} / net ${cameIn - spent < 0 ? '-' : ''}${g(cameIn - spent)}${rate}`);
    }

    // Categories, last 3 months
    lines.push('', 'SPENDING BY CATEGORY (last 3 months, newest first)');
    for (let i = 0; i < 3; i++) {
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const e = i === 0 ? tomorrow : new Date(s.getFullYear(), s.getMonth() + 1, 1);
        const spent = spentOf(between(w.txs, s, e));
        if (!spent.length) continue;
        const by = groupSum(spent, (t) => categoryStyle(catOf(t)).label);
        lines.push(`${monthLong(s)}${i === 0 ? ' (so far)' : ''}: ${by.map(([k, v, n]) => `${k} ${g(v)} (${n})`).join('; ')}`);
    }

    // Where money went and came from
    const monthStart = startOfMonth(now);
    const thisMonth = between(w.txs, monthStart, tomorrow);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = between(w.txs, lastMonthStart, monthStart);
    const top = (list: TransactionWithWallet[], n: number) => groupSum(list, (t) => clean(merchantName(t.description)), (t) => merchantKey(t.description)).slice(0, n);

    const placesNow = top(spentOf(thisMonth).filter((t) => catOf(t) !== 'transfer'), 12);
    if (placesNow.length) lines.push('', `TOP PLACES PAID THIS MONTH: ${placesNow.map(([k, v, n]) => `${k} ${g(v)} (${n}x)`).join('; ')}`);
    const peopleNow = top(spentOf(thisMonth).filter((t) => catOf(t) === 'transfer'), 8);
    if (peopleNow.length) lines.push(`PEOPLE SENT MONEY THIS MONTH: ${peopleNow.map(([k, v, n]) => `${k} ${g(v)} (${n}x)`).join('; ')}`);
    const sourcesNow = top(inOf(thisMonth), 6);
    if (sourcesNow.length) lines.push(`MONEY CAME IN FROM THIS MONTH: ${sourcesNow.map(([k, v, n]) => `${k} ${g(v)} (${n}x)`).join('; ')}`);
    const placesLast = top(spentOf(lastMonth).filter((t) => catOf(t) !== 'transfer'), 10);
    if (placesLast.length) lines.push(`TOP PLACES PAID LAST MONTH: ${placesLast.map(([k, v, n]) => `${k} ${g(v)} (${n}x)`).join('; ')}`);
    const sourcesLast = top(inOf(lastMonth), 6);
    if (sourcesLast.length) lines.push(`MONEY CAME IN FROM LAST MONTH: ${sourcesLast.map(([k, v, n]) => `${k} ${g(v)} (${n}x)`).join('; ')}`);

    // Recent entries, newest first (saved rows, so a split shows once)
    const recentRows = w.rows.filter((t) => at(t) >= addDays(today, -21)).slice(0, 60);
    if (recentRows.length) {
        lines.push('', 'RECENT ENTRIES (last 3 weeks, newest first; date, flow, amount, category, who/where, wallet)');
        for (const t of recentRows) {
            const flow = flowOf(t);
            const d = at(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const wallet = t.wallet?.name ? `, ${t.wallet.name}` : '';
            lines.push(`- ${d}, ${flow === 'moved' ? 'moved between own wallets' : flow}, ${g(amt(t))}, ${categoryStyle(catOf(t)).label}, ${clean(merchantName(t.description))}${wallet}`);
        }
    }

    return lines.join('\n');
}

/** [label, total, count], biggest first. */
function groupSum(
    list: TransactionWithWallet[],
    label: (t: TransactionWithWallet) => string,
    key: (t: TransactionWithWallet) => string = label,
): [string, number, number][] {
    const m = new Map<string, [string, number, number]>();
    for (const t of list) {
        const k = key(t);
        const cur = m.get(k) ?? [label(t), 0, 0];
        cur[1] += amt(t);
        cur[2] += 1;
        m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b[1] - a[1]);
}

/** Drop phone numbers, account numbers and references from a name. */
function clean(name: string): string {
    const out = name.replace(/\+?\d[\d\s-]{5,}\d/g, '').replace(/\s{2,}/g, ' ').trim();
    return out || 'Unnamed';
}
