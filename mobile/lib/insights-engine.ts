import type { TransactionWithWallet } from './transaction-service';
import { categoryStyle, type CategoryStyle } from './category-style';
import { startOfWeek, startOfMonth } from './spending-service';
import { dueDateThisMonth } from './income-service';
import {
    type MoneyWindow, addDays, at, between, catOf, cedis, daysInMonth, inOf, merchantName, monthLong, spentOf, startOfDay, sum,
} from './money-window';
import { merchantKey } from './category-rules';

/**
 * Insights (Figma 1022:4574): one sentence on the month, then up to three
 * findings written as notes (tag, the change, the reason). handoff §7:
 * compare this week to the last 4–6 weeks by category, plus subscriptions
 * renewing and the top person sent to. "Not enough data" until 7 days.
 */

export const DAYS_NEEDED = 7;

export type Finding =
    | {
        kind: 'category';
        /** "This week" or "October". */
        period: string;
        category: string;
        style: CategoryStyle;
        /** "Up 20%", "Down 15%" */
        headline: string;
        body: string;
        /** Last 4 weeks, oldest first; the last is this week. */
        bars: number[];
    }
    | { kind: 'subscriptions'; total: number; apps: { name: string; amount: number }[]; renewBy: Date | null; period?: string }
    | { kind: 'people'; name: string; total: number; sends: number; period: string; current: boolean };

export interface InsightsResult {
    /** Days since the first entry (capped). Below DAYS_NEEDED → not enough data. */
    daysOfData: number;
    /** "You're on track to keep GHS 900 this month." */
    headline: string;
    findings: Finding[];
}

export interface WeekTotal { start: Date; total: number; count: number }

/** Weekly totals for one category, oldest first; the last is the current week. */
export function weeklyTotals(txs: TransactionWithWallet[], category: string, weeks: number, now = new Date()): WeekTotal[] {
    const thisWeek = startOfWeek(now);
    const out: WeekTotal[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
        const start = addDays(thisWeek, -7 * i);
        const list = spentOf(between(txs, start, addDays(start, 7))).filter((t) => catOf(t) === category);
        out.push({ start, total: sum(list), count: list.length });
    }
    return out;
}

/**
 * Insights for a month. The current month uses this week's findings; a past
 * month (pass its first day) is looked at as a whole month, compared with the
 * months before it.
 */
export function computeInsights(w: MoneyWindow, now = new Date(), month?: Date): InsightsResult {
    if (month && (month.getFullYear() !== now.getFullYear() || month.getMonth() !== now.getMonth())) {
        return pastMonthInsights(w, now, new Date(month.getFullYear(), month.getMonth(), 1));
    }
    const daysOfData = w.firstEntryAt ? Math.min(99, Math.floor((startOfDay(now).getTime() - startOfDay(w.firstEntryAt).getTime()) / 86_400_000) + 1) : 0;
    const findings: Finding[] = [];

    const cat = categoryFinding(w.txs, now);
    if (cat) findings.push(cat);
    const subs = subscriptionsFinding(w.txs, now);
    if (subs) findings.push(subs);
    const people = peopleFinding(w.txs, now);
    if (people) findings.push(people);

    return { daysOfData, headline: monthHeadline(w, now), findings };
}

/**
 * On track to keep: what came in this month (plus expected income still to
 * come) minus spending so far projected to the end of the month.
 */
function monthHeadline(w: MoneyWindow, now: Date): string {
    const monthStart = startOfMonth(now);
    const elapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / 86_400_000) + 1);
    const spent = sum(spentOf(between(w.txs, monthStart, addDays(startOfDay(now), 1))));
    const cameIn = sum(inOf(between(w.txs, monthStart, addDays(startOfDay(now), 1))));
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stillExpected = w.expected
        .filter((e) => e.last_confirmed_month !== monthKey && dueDateThisMonth(e.day_of_month, now) > now)
        .reduce((s, e) => s + Number(e.amount), 0);
    const income = cameIn + stillExpected;
    if (income <= 0) return spent > 0 ? `GHS ${cedis(spent)} spent so far in ${monthLong(now)}.` : `${monthLong(now)} has only just started.`;
    const projected = (spent / elapsed) * daysInMonth(now);
    const keep = income - projected;
    if (keep >= 50) return `You’re on track to keep GHS ${cedis(keep)} this month.`;
    if (keep >= 0) return 'You’re on track to spend about what came in this month.';
    return `At this pace, spending will pass what came in by about GHS ${cedis(-keep)}.`;
}

/** The category whose spending this week moved most against its recent weeks. */
function categoryFinding(txs: TransactionWithWallet[], now: Date): Finding | null {
    const thisWeekStart = startOfWeek(now);
    const thisWeek = spentOf(between(txs, thisWeekStart, addDays(thisWeekStart, 7)));
    const cats = [...new Set(thisWeek.map(catOf))].filter((c) => c !== 'transfer' && c !== 'other');

    let best: { cat: string; change: number; weeks: WeekTotal[] } | null = null;
    for (const c of cats) {
        const weeks = weeklyTotals(txs, c, 6, now);
        const past = weeks.slice(0, -1).filter((x) => x.total > 0);
        const current = weeks[weeks.length - 1].total;
        if (past.length < 2 || current < 20) continue;
        const avg = past.reduce((s, x) => s + x.total, 0) / past.length;
        const change = (current - avg) / avg;
        if (Math.abs(change) < 0.1) continue;
        if (!best || Math.abs(change) > Math.abs(best.change)) best = { cat: c, change, weeks };
    }
    if (!best) return null;

    const weeks = best.weeks;
    const current = weeks[weeks.length - 1];
    const last = weeks[weeks.length - 2];
    const pct = Math.round(Math.abs(best.change) * 100);
    const parts = [`GHS ${cedis(current.total)}, ${current.total >= last.total ? 'up' : 'down'} from ${cedis(last.total)} last week.`];
    const fresh = newMerchants(txs, best.cat, now);
    parts.push(`${current.count} ${current.count === 1 ? 'payment' : 'payments'}${fresh[0] ? `, ${fresh[0]} is new` : ''}.`);
    return {
        kind: 'category',
        period: 'This week',
        category: best.cat,
        style: categoryStyle(best.cat),
        headline: `${best.change > 0 ? 'Up' : 'Down'} ${pct}%`,
        body: parts.join(' '),
        bars: weeks.slice(-4).map((x) => x.total),
    };
}

/** Places paid this week in a category that weren't paid in the 5 weeks before. */
export function newMerchants(txs: TransactionWithWallet[], category: string, now: Date): string[] {
    const thisWeekStart = startOfWeek(now);
    const before = new Set(spentOf(between(txs, addDays(thisWeekStart, -35), thisWeekStart)).filter((t) => catOf(t) === category).map((t) => merchantKey(t.description)));
    const seen = new Set<string>();
    return spentOf(between(txs, thisWeekStart, addDays(thisWeekStart, 7)))
        .filter((t) => catOf(t) === category && !before.has(merchantKey(t.description)))
        .map((t) => merchantName(t.description))
        .filter((n) => (seen.has(n) ? false : (seen.add(n), true)));
}

/** Subscriptions paid in the last 35 days, one line per app, and when the next renews. */
function subscriptionsFinding(txs: TransactionWithWallet[], now: Date): Finding | null {
    const recent = spentOf(between(txs, addDays(startOfDay(now), -35), addDays(startOfDay(now), 1))).filter((t) => catOf(t) === 'subscription');
    if (recent.length === 0) return null;
    const byApp = new Map<string, { name: string; amount: number; last: Date }>();
    for (const t of recent) {
        const key = merchantKey(t.description);
        const cur = byApp.get(key);
        if (!cur || at(t) > cur.last) byApp.set(key, { name: merchantName(t.description), amount: Number(t.amount), last: at(t) });
    }
    const apps = [...byApp.values()].sort((a, b) => b.amount - a.amount);
    const renewals = apps.map((a) => addDays(a.last, 30)).filter((d) => d >= startOfDay(now)).sort((a, b) => a.getTime() - b.getTime());
    return {
        kind: 'subscriptions',
        total: apps.reduce((s, a) => s + a.amount, 0),
        apps: apps.map(({ name, amount }) => ({ name, amount })),
        renewBy: renewals.length ? renewals[renewals.length - 1] : null,
    };
}

/** The person sent the most this month. */
function peopleFinding(txs: TransactionWithWallet[], now: Date): Finding | null {
    const sends = spentOf(between(txs, startOfMonth(now), addDays(startOfDay(now), 1))).filter((t) => catOf(t) === 'transfer');
    if (sends.length === 0) return null;
    const byPerson = new Map<string, { name: string; total: number; sends: number }>();
    for (const t of sends) {
        const key = merchantKey(t.description);
        const cur = byPerson.get(key) ?? { name: merchantName(t.description), total: 0, sends: 0 };
        cur.total += Number(t.amount);
        cur.sends += 1;
        byPerson.set(key, cur);
    }
    const ranked = [...byPerson.values()].sort((a, b) => b.total - a.total);
    // Only a finding when someone clearly stands out.
    if (ranked.length > 1 && ranked[0].total < ranked[1].total * 1.2) return null;
    return { kind: 'people', ...ranked[0], period: monthLong(now), current: true };
}

// ---------------------------------------------------------------------------
// Insight detail (Figma 1022:4640)
// ---------------------------------------------------------------------------

export interface CategoryDetail {
    style: CategoryStyle;
    thisWeek: number;
    /** This week minus last week. */
    change: number;
    weeks: WeekTotal[];
    /** Average of the 5 weeks before this one that had spending. */
    average: number;
    whatChanged: string;
}

export function categoryDetail(txs: TransactionWithWallet[], category: string, now = new Date()): CategoryDetail {
    const weeks = weeklyTotals(txs, category, 6, now);
    const current = weeks[weeks.length - 1];
    const last = weeks[weeks.length - 2];
    const past = weeks.slice(0, -1).filter((w) => w.total > 0);
    const average = past.length ? past.reduce((s, w) => s + w.total, 0) / past.length : 0;

    const thisWeekStart = startOfWeek(now);
    const entries = spentOf(between(txs, thisWeekStart, addDays(thisWeekStart, 7))).filter((t) => catOf(t) === category);
    const biggest = [...entries].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    const fresh = newMerchants(txs, category, now);
    const parts: string[] = [];
    if (current.count === 0) parts.push('Nothing in this category yet this week.');
    else parts.push(`You paid ${current.count} ${current.count === 1 ? 'time' : 'times'}, ${current.count === last.count ? 'the same as' : current.count > last.count ? 'up from' : 'down from'} ${last.count === current.count ? 'last week' : last.count}.`);
    if (fresh[0] && biggest && merchantName(biggest.description) === fresh[0]) {
        parts.push(`${fresh[0]} is new this week and was the biggest at GHS ${cedis(Number(biggest.amount))}.`);
    } else {
        if (fresh[0]) parts.push(`${fresh[0]} is new this week.`);
        if (biggest) parts.push(`The biggest was ${merchantName(biggest.description)} at GHS ${cedis(Number(biggest.amount))}.`);
    }
    return { style: categoryStyle(category), thisWeek: current.total, change: current.total - last.total, weeks, average, whatChanged: parts.join(' ') };
}

// ---------------------------------------------------------------------------
// A past month, as a whole
// ---------------------------------------------------------------------------

function monthTotals(txs: TransactionWithWallet[], category: string, end: Date, months: number): number[] {
    const out: number[] = [];
    for (let i = months - 1; i >= 0; i--) {
        const s = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
        out.push(sum(spentOf(between(txs, s, e)).filter((t) => catOf(t) === category)));
    }
    return out;
}

function pastMonthInsights(w: MoneyWindow, now: Date, start: Date): InsightsResult {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const name = monthLong(start);
    const inMonth = between(w.txs, start, end);
    const spent = sum(spentOf(inMonth));
    const cameIn = sum(inOf(inMonth));
    const daysOfData = w.firstEntryAt ? Math.min(99, Math.floor((startOfDay(now).getTime() - startOfDay(w.firstEntryAt).getTime()) / 86_400_000) + 1) : 0;

    let headline: string;
    if (spent === 0 && cameIn === 0) headline = `Nothing was logged in ${name}.`;
    else if (cameIn <= 0) headline = `GHS ${cedis(spent)} spent in ${name}.`;
    else if (cameIn - spent >= 50) headline = `You kept GHS ${cedis(cameIn - spent)} in ${name}.`;
    else if (cameIn - spent >= 0) headline = `${name}’s spending was about what came in.`;
    else headline = `${name}’s spending passed what came in by GHS ${cedis(spent - cameIn)}.`;

    const findings: Finding[] = [];

    // The category that moved most against the 3 months before.
    let best: { cat: string; change: number; totals: number[] } | null = null;
    for (const c of [...new Set(spentOf(inMonth).map(catOf))].filter((x) => x !== 'transfer' && x !== 'other')) {
        const totals = monthTotals(w.txs, c, start, 4);
        const past = totals.slice(0, -1).filter((v) => v > 0);
        const current = totals[totals.length - 1];
        if (past.length < 2 || current < 30) continue;
        const avg = past.reduce((s2, v) => s2 + v, 0) / past.length;
        const change = (current - avg) / avg;
        if (Math.abs(change) < 0.1) continue;
        if (!best || Math.abs(change) > Math.abs(best.change)) best = { cat: c, change, totals };
    }
    if (best) {
        const cur = best.totals[best.totals.length - 1];
        const prev = best.totals[best.totals.length - 2];
        const prevName = monthLong(new Date(start.getFullYear(), start.getMonth() - 1, 1));
        const count = spentOf(inMonth).filter((t) => catOf(t) === best!.cat).length;
        findings.push({
            kind: 'category',
            period: name,
            category: best.cat,
            style: categoryStyle(best.cat),
            headline: `${best.change > 0 ? 'Up' : 'Down'} ${Math.round(Math.abs(best.change) * 100)}%`,
            body: `GHS ${cedis(cur)} in ${name}, ${cur >= prev ? 'up' : 'down'} from ${cedis(prev)} in ${prevName}. ${count} ${count === 1 ? 'payment' : 'payments'}.`,
            bars: best.totals,
        });
    }

    const subs = spentOf(inMonth).filter((t) => catOf(t) === 'subscription');
    if (subs.length) {
        const byApp = new Map<string, { name: string; amount: number }>();
        for (const t of subs) {
            const k = merchantKey(t.description);
            const cur = byApp.get(k) ?? { name: merchantName(t.description), amount: 0 };
            cur.amount += Number(t.amount);
            byApp.set(k, cur);
        }
        const apps = [...byApp.values()].sort((a, b) => b.amount - a.amount);
        findings.push({ kind: 'subscriptions', total: apps.reduce((s2, a) => s2 + a.amount, 0), apps, renewBy: null, period: name });
    }

    const sends = spentOf(inMonth).filter((t) => catOf(t) === 'transfer');
    if (sends.length) {
        const by = new Map<string, { name: string; total: number; sends: number }>();
        for (const t of sends) {
            const k = merchantKey(t.description);
            const cur = by.get(k) ?? { name: merchantName(t.description), total: 0, sends: 0 };
            cur.total += Number(t.amount);
            cur.sends += 1;
            by.set(k, cur);
        }
        const ranked = [...by.values()].sort((a, b) => b.total - a.total);
        if (ranked.length === 1 || ranked[0].total >= ranked[1].total * 1.2) findings.push({ kind: 'people', ...ranked[0], period: name, current: false });
    }

    return { daysOfData, headline, findings };
}

/** Months the picker offers: this one and the 5 before, with what was spent in each. */
export function pickableMonths(w: MoneyWindow, now = new Date()): { start: Date; spent: number }[] {
    return Array.from({ length: 6 }, (_, i) => {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return { start, spent: sum(spentOf(between(w.txs, start, end))) };
    });
}
