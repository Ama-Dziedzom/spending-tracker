import type { TransactionWithWallet } from './transaction-service';
import { categoryStyle, type CategoryStyle } from './category-style';
import { startOfWeek, startOfMonth } from './spending-service';
import { dueDateThisMonth } from './income-service';
import {
    type MoneyWindow, addDays, at, between, catOf, cedis, daysInMonth, inOf, merchantName, monthLong, spentOf, startOfDay, sum,
} from './money-window';
import { merchantKey } from './category-rules';
import { curLabel, scaled } from '@/lib/currency';

/**
 * Insights (Figma 1022:4574): one sentence on the month, then up to three
 * findings written as notes (tag, the change, the reason). handoff §7:
 * compare this week to the last 4–6 weeks by category, plus subscriptions
 * renewing and the top person sent to. "Not enough data" until 7 days.
 */

export const DAYS_NEEDED = 7;

export type Finding =
    | {
        /** Week by week (Figma 1180:5807): the chosen week against the five before it. */
        kind: 'weeks';
        period: string;
        headline: string;
        body: string;
        /** Oldest first; the last is the chosen week. */
        weeks: WeekTotal[];
        average: number;
        /** Label under the last bar: "This week" or "17 Nov". */
        lastLabel: string;
    }
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
    | { kind: 'people'; name: string; total: number; sends: number; period: string; current: boolean }
    | {
        kind: 'inout';
        period: string;
        cameIn: number;
        spent: number;
        /** "Kept GHS 420", "GHS 300 more out than in" */
        headline: string;
        body: string;
        /** Up to 6 months, oldest first; the last is the month being looked at. */
        months: MonthFlow[];
    }
    | {
        kind: 'savings';
        /** The month the rate is for (the last full month when looking at this one). */
        period: string;
        /** Share of income kept, -1..1. */
        rate: number;
        headline: string;
        body: string;
        /** Oldest first; null where nothing came in. */
        rates: { label: string; rate: number | null }[];
    }
    | {
        kind: 'drains';
        period: string;
        /** What the shares are of: money in, or (when less came in than went out) spending. */
        base: 'in' | 'spent';
        income: number;
        headline: string;
        /** Biggest first; share is of the base. */
        rows: { category: string; style: CategoryStyle; amount: number; share: number }[];
    };

export interface MonthFlow { start: Date; label: string; cameIn: number; spent: number }

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
 * Card order on Insights: the three from Figma 1022:4574 first (category,
 * subscriptions, people), then the income cards from "Insights · more
 * findings" (Figma 1176:5681): in vs out, biggest drains, savings rate.
 */
const DESIGN_ORDER: Finding['kind'][] = ['weeks', 'category', 'subscriptions', 'people', 'inout', 'drains', 'savings'];
function inDesignOrder(findings: Finding[]): Finding[] {
    return [...findings].sort((a, b) => DESIGN_ORDER.indexOf(a.kind) - DESIGN_ORDER.indexOf(b.kind));
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
    const monthStart = startOfMonth(now);

    const inout = inOutFinding(w, monthStart, now);
    if (inout) findings.push(inout);
    const cat = categoryFinding(w.txs, now);
    if (cat) findings.push(cat);
    const drains = drainsFinding(w, monthStart, now);
    if (drains) findings.push(drains);
    // A month in progress has no rate yet, so look at the last full one.
    const savings = savingsFinding(w, new Date(now.getFullYear(), now.getMonth() - 1, 1), now);
    if (savings) findings.push(savings);
    const subs = subscriptionsFinding(w.txs, now);
    if (subs) findings.push(subs);
    const people = peopleFinding(w.txs, now);
    if (people) findings.push(people);

    return { daysOfData, headline: monthHeadline(w, now), findings: inDesignOrder(findings) };
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
    if (income <= 0) return spent > 0 ? `${curLabel()} ${cedis(spent)} spent so far in ${monthLong(now)}.` : `${monthLong(now)} has only just started.`;
    const projected = (spent / elapsed) * daysInMonth(now);
    const keep = income - projected;
    if (keep >= scaled(50)) return `You’re on track to keep ${curLabel()} ${cedis(keep)} this month.`;
    if (keep >= 0) return 'You’re on track to spend about what came in this month.';
    return `At this pace, spending will pass what came in by about ${curLabel()} ${cedis(-keep)}.`;
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
    const parts = [`${curLabel()} ${cedis(current.total)}, ${current.total >= last.total ? 'up' : 'down'} from ${cedis(last.total)} last week.`];
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
        parts.push(`${fresh[0]} is new this week and was the biggest at ${curLabel()} ${cedis(Number(biggest.amount))}.`);
    } else {
        if (fresh[0]) parts.push(`${fresh[0]} is new this week.`);
        if (biggest) parts.push(`The biggest was ${merchantName(biggest.description)} at ${curLabel()} ${cedis(Number(biggest.amount))}.`);
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
    else if (cameIn <= 0) headline = `${curLabel()} ${cedis(spent)} spent in ${name}.`;
    else if (cameIn - spent >= scaled(50)) headline = `You kept ${curLabel()} ${cedis(cameIn - spent)} in ${name}.`;
    else if (cameIn - spent >= 0) headline = `${name}’s spending was about what came in.`;
    else headline = `${name}’s spending passed what came in by ${curLabel()} ${cedis(spent - cameIn)}.`;

    const findings: Finding[] = [];
    const inout = inOutFinding(w, start, now);
    if (inout) findings.push(inout);

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
            body: `${curLabel()} ${cedis(cur)} in ${name}, ${cur >= prev ? 'up' : 'down'} from ${cedis(prev)} in ${prevName}. ${count} ${count === 1 ? 'payment' : 'payments'}.`,
            bars: best.totals,
        });
    }

    const drains = drainsFinding(w, start, now);
    if (drains) findings.push(drains);
    const savings = savingsFinding(w, start, now);
    if (savings) findings.push(savings);

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

    return { daysOfData, headline, findings: inDesignOrder(findings) };
}

/** Months the picker offers: this one and the 5 before, with what was spent in each. */
export function pickableMonths(w: MoneyWindow, now = new Date()): { start: Date; spent: number }[] {
    return Array.from({ length: 6 }, (_, i) => {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return { start, spent: sum(spentOf(between(w.txs, start, end))) };
    });
}

// ---------------------------------------------------------------------------
// Money in vs money out
// ---------------------------------------------------------------------------

/** End of a month for totals: tomorrow for the month in progress, else the 1st of the next. */
function monthEnd(start: Date, now: Date): Date {
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const tomorrow = addDays(startOfDay(now), 1);
    return next > tomorrow ? tomorrow : next;
}

/** In and out for `count` months ending with the one starting at `last`, oldest first. */
export function monthFlows(w: MoneyWindow, last: Date, now: Date, count = 6): MonthFlow[] {
    return Array.from({ length: count }, (_, i) => {
        const start = new Date(last.getFullYear(), last.getMonth() - (count - 1 - i), 1);
        const list = between(w.txs, start, monthEnd(start, now));
        return { start, label: monthLong(start).slice(0, 3), cameIn: sum(inOf(list)), spent: sum(spentOf(list)) };
    });
}

const isThisMonth = (start: Date, now: Date) => start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();

/** What came in against what went out, with the months before for comparison. */
function inOutFinding(w: MoneyWindow, start: Date, now: Date): Finding | null {
    const months = monthFlows(w, start, now);
    const cur = months[months.length - 1];
    if (cur.cameIn === 0 && cur.spent === 0) return null;
    const current = isThisMonth(start, now);
    const net = cur.cameIn - cur.spent;
    const name = monthLong(start);

    // Short number + one line, as in Figma 1176:5760 ("GHS 640 left").
    let headline: string;
    if (cur.cameIn === 0) headline = `${curLabel()} ${cedis(cur.spent)} out`;
    else if (net >= 0) headline = `${curLabel()} ${cedis(net)} left`;
    else headline = `${curLabel()} ${cedis(-net)} over`;

    const first = cur.cameIn === 0
        ? `Nothing logged in yet${current ? '' : ` in ${name}`}.`
        : `${curLabel()} ${cedis(cur.cameIn)} came in, ${cedis(cur.spent)} went out.`;
    let second = '';
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stillExpected = current
        ? w.expected.filter((e) => e.is_active && e.last_confirmed_month !== monthKey && dueDateThisMonth(e.day_of_month, now) > now).reduce((a, e) => a + Number(e.amount), 0)
        : 0;
    const prev = months.slice(0, -1).filter((m) => m.cameIn > 0 || m.spent > 0).pop();
    if (stillExpected > 0) second = `${curLabel()} ${cedis(stillExpected)} more is due this month.`;
    else if (cur.cameIn === 0) second = 'Log your income to see what you keep.';
    else if (current) {
        const elapsed = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
        const projected = (cur.spent / elapsed) * daysInMonth(now);
        if (projected > cur.cameIn * 1.02) second = `On pace to spend about ${curLabel()} ${cedis(projected)}.`;
    }
    if (!second && prev && prev.cameIn > 0) {
        const prevNet = prev.cameIn - prev.spent;
        if (Math.round(net - prevNet) !== 0) second = `${net > prevNet ? 'More' : 'Less'} left than in ${monthLong(prev.start)}.`;
    }
    const parts = [first, second].filter(Boolean);

    return { kind: 'inout', period: current ? 'This month' : name, cameIn: cur.cameIn, spent: cur.spent, headline, body: parts.join(' '), months };
}

/** Share of income kept in a month, and how that compares with the months before. */
function savingsFinding(w: MoneyWindow, start: Date, now: Date): Finding | null {
    const months = monthFlows(w, start, now);
    const rates = months.map((m) => ({ label: m.label, rate: m.cameIn > 0 ? (m.cameIn - m.spent) / m.cameIn : null }));
    const withIncome = rates.filter((r) => r.rate !== null);
    const cur = rates[rates.length - 1].rate;
    // Needs this month and at least two before it with income to call a trend.
    if (cur === null || withIncome.length < 3) return null;
    const before = rates.slice(0, -1).filter((r) => r.rate !== null).map((r) => r.rate!);
    const avg = before.reduce((a, r) => a + r, 0) / before.length;
    const pct = (r: number) => `${Math.round(r * 100)}%`;
    const name = monthLong(start);

    const headline = cur >= 0 ? `Kept ${pct(cur)} of income` : `Spent ${pct(-cur)} more than came in`;
    const diff = cur - avg;
    let body: string;
    if (Math.abs(diff) < 0.03) body = `About the same as your average of ${pct(avg)} in the months before.`;
    else body = `${diff > 0 ? 'Up' : 'Down'} from an average of ${pct(avg)} in the ${before.length} months before.`;
    if (cur < 0.1 && cur >= 0) body += ' Keeping even 10% each month builds a cushion fast.';
    return { kind: 'savings', period: name, rate: cur, headline, body, rates };
}

/** The categories taking the biggest share of what came in. */
function drainsFinding(w: MoneyWindow, start: Date, now: Date, end?: Date, periodLabel?: string): Finding | null {
    const list = between(w.txs, start, end ?? monthEnd(start, now));
    const income = sum(inOf(list));
    const spent = sum(spentOf(list));
    if (income <= 0 || spent <= 0) return null;
    // With less logged in than out, "% of income" runs past 100 and stops meaning
    // anything; show each category's share of spending instead.
    const base: 'in' | 'spent' = income >= spent ? 'in' : 'spent';
    const total = base === 'in' ? income : spent;
    const by = new Map<string, number>();
    for (const t of spentOf(list)) by.set(catOf(t), (by.get(catOf(t)) ?? 0) + Number(t.amount));
    const rows = [...by.entries()]
        .filter(([c]) => c !== 'other')
        .map(([category, amount]) => ({ category, style: categoryStyle(category), amount, share: amount / total }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
    if (!rows.length || rows[0].share < 0.1) return null;
    const lead = rows[0];
    const pct = Math.round(lead.share * 100);
    return {
        kind: 'drains',
        period: periodLabel ?? (isThisMonth(start, now) ? 'This month' : monthLong(start)),
        base,
        income: total,
        headline: base === 'in' ? `${lead.style.label} takes ${pct}% of what comes in` : `${lead.style.label} is ${pct}% of your spending`,
        rows,
    };
}

// ---------------------------------------------------------------------------
// Week by week (Figma 1180:5728, 1180:5874)
// ---------------------------------------------------------------------------

const WEEKDAY = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long' });
const dm = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** "17–23 Nov", or "27 Oct – 2 Nov" across months. */
export function weekRange(start: Date): string {
    const end = addDays(start, 6);
    return start.getMonth() === end.getMonth() ? `${start.getDate()}–${dm(end)}` : `${dm(start)} – ${dm(end)}`;
}

/** Total spending per week for `count` weeks ending with the one starting at `last`, oldest first. */
function spendingWeeks(txs: TransactionWithWallet[], last: Date, count: number): WeekTotal[] {
    return Array.from({ length: count }, (_, i) => {
        const start = addDays(last, -7 * (count - 1 - i));
        const list = spentOf(between(txs, start, addDays(start, 7)));
        return { start, total: sum(list), count: list.length };
    });
}

/** The last 8 weeks for the picker, newest first; weeks before the first entry are left out. */
export function pickableWeeks(w: MoneyWindow, now = new Date()): { start: Date; spent: number; current: boolean }[] {
    const thisWeek = startOfWeek(now);
    const first = w.firstEntryAt ? startOfWeek(w.firstEntryAt) : thisWeek;
    return Array.from({ length: 8 }, (_, i) => addDays(thisWeek, -7 * i))
        .filter((start) => start >= first)
        .map((start) => ({ start, spent: sum(spentOf(between(w.txs, start, addDays(start, 7)))), current: start.getTime() === thisWeek.getTime() }));
}

/** Insights for one week (pass its Monday), compared with the weeks before it. */
export function computeWeekInsights(w: MoneyWindow, weekStart: Date, now = new Date()): InsightsResult {
    const daysOfData = w.firstEntryAt ? Math.min(99, Math.floor((startOfDay(now).getTime() - startOfDay(w.firstEntryAt).getTime()) / 86_400_000) + 1) : 0;
    const current = weekStart.getTime() === startOfWeek(now).getTime();
    const weekEnd = addDays(weekStart, 7);
    // A week in progress is compared with the same days of the week before, so it's fair.
    const spanEnd = current ? addDays(startOfDay(now), 1) : weekEnd;
    const prevStart = addDays(weekStart, -7);
    const spent = sum(spentOf(between(w.txs, weekStart, spanEnd)));
    const prevSame = sum(spentOf(between(w.txs, prevStart, addDays(prevStart, (spanEnd.getTime() - weekStart.getTime()) / 86_400_000))));
    const diff = spent - prevSame;
    const label = current ? 'This week' : weekRange(weekStart);

    let headline: string;
    if (spent === 0) headline = current ? 'Nothing has gone out this week yet.' : `Nothing went out ${label}.`;
    else if (prevSame === 0) headline = current ? `${curLabel()} ${cedis(spent)} so far this week.` : `${curLabel()} ${cedis(spent)} spent ${label}.`;
    else if (Math.round(diff) === 0) headline = current ? `${curLabel()} ${cedis(spent)} so far, the same as this time last week.` : `${curLabel()} ${cedis(spent)} spent, the same as the week before.`;
    else headline = current
        ? `${curLabel()} ${cedis(spent)} so far, ${cedis(Math.abs(diff))} ${diff < 0 ? 'less' : 'more'} than this time last week.`
        : `${curLabel()} ${cedis(spent)} spent, ${cedis(Math.abs(diff))} ${diff < 0 ? 'less' : 'more'} than the week before.`;

    const findings: Finding[] = [];

    // Week by week: the chosen week against the five before it
    const weeks = spendingWeeks(w.txs, weekStart, 6);
    const past = weeks.slice(0, -1).filter((x) => x.total > 0);
    if (spent > 0 || past.length > 0) {
        const average = past.length ? past.reduce((a, x) => a + x.total, 0) / past.length : 0;
        let wHead: string;
        let wBody: string;
        const by = current ? `by ${WEEKDAY(now)}` : '';
        if (prevSame > 0) {
            const pct = Math.round((Math.abs(diff) / prevSame) * 100);
            wHead = pct === 0 ? 'About the same' : `${diff < 0 ? 'Down' : 'Up'} ${pct}%`;
            wBody = current
                ? `${curLabel()} ${cedis(spent)} ${by}, ${diff <= 0 ? 'down' : 'up'} from ${cedis(prevSame)} at this point last week.`
                : `${curLabel()} ${cedis(spent)}, ${diff <= 0 ? 'down' : 'up'} from ${cedis(prevSame)} the week before.`;
        } else {
            wHead = `${curLabel()} ${cedis(spent)}`;
            wBody = 'Nothing was logged the week before, so there’s nothing to compare yet.';
        }
        findings.push({ kind: 'weeks', period: 'Last 6 weeks', headline: wHead, body: wBody, weeks, average, lastLabel: current ? 'This week' : dm(weekStart) });
    }

    // The category that moved most that week (same rules as the month view)
    const inWeek = current ? now : addDays(weekEnd, -1);
    const cat = categoryFinding(w.txs, inWeek);
    if (cat) findings.push(current ? cat : { ...cat, period: label });

    const drains = drainsFinding(w, weekStart, now, spanEnd, label);
    if (drains) findings.push(drains);

    return { daysOfData, headline, findings: inDesignOrder(findings) };
}
