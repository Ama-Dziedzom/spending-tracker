import type { TransactionWithWallet } from './transaction-service';
import { CATEGORIES } from './categories';
import { categoryStyle } from './category-style';
import { startOfMonth, startOfWeek } from './spending-service';
import { merchantKey } from './category-rules';
import {
    type MoneyWindow, addDays, between, catOf, cedis, inOf, merchantName, monthLong, monthShort, spentOf, startOfDay, sum,
} from './money-window';

/**
 * Ask LogIt (handoff §8). Every answer is one of four shapes, and only
 * these: Total, Verdict, Ranking, Can't answer. Answers are worked out on
 * the phone from your own entries, so the numbers in the sentence are the
 * numbers in the working. Questions outside these shapes get Can't answer.
 */

export interface Source {
    /** "From 14 transactions", "Based on your last 3 months". */
    label: string;
    icon?: 'paste' | 'calendar';
    /** The entries behind the answer; the source chip opens them. */
    txs: TransactionWithWallet[];
}

export type Answer =
    | {
        shape: 'total';
        amount: number;
        /** "on airtime & data", "spent", "across 3 wallets" */
        unit: string;
        sentence: string;
        chart?: { title: string; delta?: string; color: 'accent' | string; rows: { label: string; value: number; current?: boolean }[] };
        source: Source;
        followUps: string[];
        context: AskContext;
    }
    | {
        shape: 'verdict';
        /** "Yes", "Tight", "Not yet" (afford); "Yes" / "No" (compare). */
        tag: string;
        tagTone: 'success' | 'warn' | 'neutral';
        tagIcon?: 'tick' | 'info' | 'alert';
        sentence: string;
        rows: { label: string; value: string; strong?: boolean }[];
        source: Source;
        followUps: string[];
        context: AskContext;
    }
    | {
        shape: 'ranking';
        sentence: string;
        rows: { label: string; value: number; display: string; meta?: string; initials?: string; category?: string }[];
        color?: string;
        source: Source;
        followUps: string[];
        context: AskContext;
    }
    | {
        shape: 'cant';
        sentence: string;
        fix?: { label: string; action: 'paste' | 'wallets' };
        chips: string[];
        context: AskContext;
    };

/** What the last answer was about, so "Why is it up?" and "What if I wait until payday?" know. */
export interface AskContext { category?: string; period?: Period; afford?: { price: number; thing: string }; person?: string }

/** 'm:9' is a named month (October), the most recent one that has started. */
type Period = 'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | `m:${number}`;

const MONTH_WORDS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** First day of the most recent month with this index (this year, or last year if it hasn't come yet). */
function namedMonthStart(index: number, now: Date): Date {
    const year = index > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(year, index, 1);
}

export const STARTERS = [
    'How much did I spend on food this month?',
    'Who did I send the most money to?',
    'Am I spending more on airtime than last month?',
    'Can I afford a GHS 500 phone this month?',
];

// ---------------------------------------------------------------------------

const CATEGORY_WORDS: { id: string; words: string[] }[] = [
    { id: 'airtime', words: ['airtime', 'data', 'bundle', 'credit top', 'top up', 'topup'] },
    { id: 'food', words: ['food', 'eat', 'eating', 'restaurant', 'lunch', 'dinner', 'breakfast', 'chop', 'waakye', 'kfc', 'groceries'] },
    { id: 'transport', words: ['transport', 'trotro', 'uber', 'bolt', 'taxi', 'fuel', 'yango', 'travel to'] },
    { id: 'shopping', words: ['shopping', 'shop', 'market', 'clothes', 'shoprite', 'melcom'] },
    { id: 'bills', words: ['bill', 'bills', 'electricity', 'ecg', 'water', 'light'] },
    { id: 'subscription', words: ['subscription', 'subscriptions', 'netflix', 'spotify', 'apple', 'showmax', 'dstv'] },
    { id: 'fees', words: ['fee', 'fees', 'charges', 'e-levy', 'elevy'] },
    { id: 'loans', words: ['loan', 'loans', 'borrow', 'qwikloan', 'xpresloan'] },
    { id: 'transfer', words: ['people', 'friends', 'family', 'sent to', 'transfers'] },
    { id: 'cash', words: ['cash'] },
];

const OTHER_BANKS = ['ecobank', 'absa', 'gcb', 'fidelity', 'calbank', 'stanbic', 'zenith', 'access', 'uba', 'republic', 'adb', 'cbg', 'prudential', 'societe', 'gtbank', 'first atlantic', 'telecel', 'at money', 'airteltigo', 'mtn', 'momo'];

function findCategory(q: string): string | undefined {
    for (const c of CATEGORY_WORDS) if (c.words.some((w) => new RegExp(`\\b${w}`).test(q))) return c.id;
    const byName = CATEGORIES.find((c) => q.includes(c.name.toLowerCase()) || q.includes(c.id));
    return byName?.id;
}

function findPeriod(q: string): Period | undefined {
    const named = q.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
    if (named) return `m:${MONTH_WORDS.indexOf(named[1].slice(0, 3))}`;
    if (/\btoday\b/.test(q)) return 'today';
    if (/\byesterday\b/.test(q)) return 'yesterday';
    if (/last week/.test(q)) return 'lastWeek';
    if (/this week|\bweek\b/.test(q)) return 'week';
    if (/last month/.test(q)) return 'lastMonth';
    if (/this month|\bmonth\b/.test(q)) return 'month';
    return undefined;
}

function periodRange(p: Period, now: Date): { from: Date; to: Date; label: string; short: string } {
    const today = startOfDay(now);
    if (p.startsWith('m:')) {
        const s = namedMonthStart(Number(p.slice(2)), now);
        const isNow = s.getMonth() === now.getMonth() && s.getFullYear() === now.getFullYear();
        if (isNow) return { from: s, to: addDays(today, 1), label: `in ${monthLong(s)}`, short: 'this month' };
        return { from: s, to: new Date(s.getFullYear(), s.getMonth() + 1, 1), label: `in ${monthLong(s)}`, short: monthLong(s) };
    }
    switch (p) {
        case 'today': return { from: today, to: addDays(today, 1), label: 'today', short: 'today' };
        case 'yesterday': return { from: addDays(today, -1), to: today, label: 'yesterday', short: 'yesterday' };
        case 'week': return { from: startOfWeek(now), to: addDays(today, 1), label: 'this week', short: 'this week' };
        case 'lastWeek': return { from: addDays(startOfWeek(now), -7), to: startOfWeek(now), label: 'last week', short: 'last week' };
        case 'lastMonth': {
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return { from: s, to: startOfMonth(now), label: `in ${monthLong(s)}`, short: monthLong(s) };
        }
        default: return { from: startOfMonth(now), to: addDays(today, 1), label: `in ${monthLong(now)}`, short: 'this month' };
    }
}

const catLabel = (id: string) => (id === 'transfer' ? 'people' : categoryStyle(id).label.toLowerCase());
const fromN = (n: number) => `From ${n} ${n === 1 ? 'transaction' : 'transactions'}`;

// ---------------------------------------------------------------------------

export function answer(question: string, w: MoneyWindow, ctx: AskContext = {}, now = new Date()): Answer {
    const q = question.toLowerCase().replace(/[’']/g, "'").trim();
    const category = findCategory(q) ?? (/\b(it|that)\b/.test(q) ? ctx.category : undefined);
    const period = findPeriod(q) ?? (/\b(it|that)\b/.test(q) ? ctx.period : undefined);

    if (/what can you see|what do you know|what can you answer|help/.test(q)) return capabilities(w);

    const money = q.match(/(?:ghs|gh₵|ghc|¢|cedis?)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:ghs|cedis?)/);
    const amountAsked = money ? Number((money[1] ?? money[2]).replace(/,/g, '')) : null;
    if (/wait (until|till|for) (payday|pay day|salary|my salary)/.test(q)) {
        if (!ctx.afford) return cant('Ask about something first, like “Can I afford a GHS 500 phone?”, then I can check payday.', ['Can I afford a GHS 500 phone this month?']);
        return afford(ctx.afford.price, ctx.afford.thing, w, now, true);
    }
    if (/cut back|save more|spend less|where can i save/.test(q)) return topCategories(w, 'month', now, true);
    const sendsTo = q.match(/(?:show|see|list) (?:my )?(?:sends|payments|transfers|money) to ([a-z][a-z .'-]+?)\??$/);
    if (sendsTo) return sendsToPerson(sendsTo[1].trim(), w, period ?? 'month', now);
    if (/afford|can i (buy|get|pay for)/.test(q)) {
        if (!amountAsked) return cant('Tell me the price and I’ll check, like “Can I afford a GHS 500 phone?”.', ['Can I afford a GHS 500 phone this month?']);
        const thing = q.match(/(?:a|an|the)?\s*(?:ghs|gh₵|¢)?\s*[\d,]+(?:\.\d+)?\s*(?:ghs|cedis?)?\s+([a-z][a-z ]{1,24}?)(?:\s+this month|\?|$)/)?.[1]?.trim();
        return afford(amountAsked, thing || 'it', w, now);
    }
    if (/balance|how much (money )?(do i have|have i got|is (in|on|left))|money left/.test(q)) return balance(q, w);
    if (/who .*(most|send|sent|pay|paid|gave)/.test(q) || /(most|top) (person|people)/.test(q)) return topPeople(w, period ?? 'month', now);
    if (/^why\b|why is it|why did/.test(q)) return why(category ?? ctx.category, period ?? ctx.period ?? 'month', w, now);
    if (/compare|vs\.?|versus|than last|more .* than|less .* than|spending more|spending less/.test(q)) {
        const second = findSecondCategory(q, category);
        if (category && second) return compareCategories(category, second, w, period ?? 'month', now);
        if (category) return compareToLast(category, w, period ?? 'month', now);
        return compareToLast(undefined, w, period ?? 'month', now);
    }
    if (/(what|where).*(most|biggest)|top (categories|spend)/.test(q) && !category) return topCategories(w, period ?? 'month', now);
    if (/receive|received|came in|income|earn|got paid|salary/.test(q)) return received(w, period ?? 'month', now);
    if (/how much|spent|spend|spending|total|cost/.test(q) || category) return total(category, w, period ?? 'month', now);

    return cant('I can answer questions about what you spent, received and moved, using the alerts LogIt has logged.', ['What can you see?', 'How much did I spend this month?']);
}

function findSecondCategory(q: string, first?: string): string | undefined {
    for (const c of CATEGORY_WORDS) {
        if (c.id === first) continue;
        if (c.words.some((word) => new RegExp(`\\b${word}`).test(q))) return c.id;
    }
    return undefined;
}

function cant(sentence: string, chips: string[], fix?: { label: string; action: 'paste' | 'wallets' }): Answer {
    return { shape: 'cant', sentence, chips, fix, context: {} };
}

function capabilities(w: MoneyWindow): Answer {
    const n = w.txs.length;
    return cant(
        `I can see ${n} ${n === 1 ? 'entry' : 'entries'} from the last few months and ${w.wallets.length} ${w.wallets.length === 1 ? 'wallet' : 'wallets'}. Ask what you spent on something, who you sent the most to, how a month compares, or whether you can afford something.`,
        ['How much did I spend this month?', 'My total balance'],
    );
}

function total(category: string | undefined, w: MoneyWindow, period: Period, now: Date): Answer {
    const r = periodRange(period, now);
    const list = spentOf(between(w.txs, r.from, r.to)).filter((t) => !category || catOf(t) === category);
    const amount = Math.round(sum(list));
    const unit = category ? `on ${catLabel(category) === 'airtime & data' ? 'airtime & data' : catLabel(category)}` : 'spent';
    const parts: string[] = [];

    let chart: Extract<Answer, { shape: 'total' }>['chart'];
    const namedNow = period.startsWith('m:') && r.short === 'this month';
    if (namedNow) period = 'month';
    if (period === 'month' || period === 'lastMonth' || period.startsWith('m:')) {
        // Month vs the month before, and three months for the chart.
        const base = period === 'month' ? now : period === 'lastMonth' ? new Date(now.getFullYear(), now.getMonth() - 1, 15) : new Date(r.from.getFullYear(), r.from.getMonth(), 15);
        const months = [2, 1, 0].map((back) => {
            const s = new Date(base.getFullYear(), base.getMonth() - back, 1);
            const e = back === 0 && period === 'month' ? addDays(startOfDay(now), 1) : new Date(s.getFullYear(), s.getMonth() + 1, 1);
            return { label: monthShort(s), name: monthLong(s), value: Math.round(sum(spentOf(between(w.txs, s, e)).filter((t) => !category || catOf(t) === category))) };
        });
        const prev = months[1];
        if (prev.value > 0) {
            if (amount > prev.value) parts.push(`That’s GHS ${cedis(amount - prev.value)} more than ${prev.name}`);
            else parts.push(`${prev.name} was GHS ${cedis(prev.value)} in total`);
        }
        if (period === 'month') {
            const weeks = Math.max(1, (startOfDay(now).getTime() - startOfMonth(now).getTime()) / (7 * 86_400_000) + 1 / 7);
            if (amount > 0) parts[parts.length - 1] = `${parts[parts.length - 1] ?? 'So far'}, about GHS ${cedis(amount / weeks)} a week`;
        }
        // The chip compares like with like: this month so far vs the same days last month.
        let delta: number | null = null;
        if (period === 'month') {
            const span = addDays(startOfDay(now), 1).getTime() - startOfMonth(now).getTime();
            const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const sameDays = sum(spentOf(between(w.txs, prevStart, new Date(prevStart.getTime() + span))).filter((t) => !category || catOf(t) === category));
            delta = sameDays > 0 ? Math.round(((amount - sameDays) / sameDays) * 100) : null;
        } else if (prev.value > 0) {
            delta = Math.round(((months[2].value - prev.value) / prev.value) * 100);
        }
        chart = {
            title: 'Last 3 months',
            delta: delta !== null && delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}%` : undefined,
            color: category ?? 'accent',
            rows: months.map((m, i) => ({ label: m.label, value: m.value, current: i === 2 })),
        };
    }
    const top = topMerchant(list);
    if (top && amount > 0 && top.total / amount >= 0.4) parts.push(`Most of it went on ${top.name}`);
    if (amount === 0) parts.splice(0, parts.length, `Nothing ${category ? `on ${catLabel(category)} ` : ''}${r.label} yet. Quiet is good.`);

    return {
        shape: 'total',
        amount,
        unit,
        sentence: parts.length ? `${parts.join('. ')}.`.replace('..', '.') : `GHS ${cedis(amount)} ${r.label}.`,
        chart: chart && chart.rows.some((x) => x.value > 0) ? chart : undefined,
        source: { label: fromN(list.length), txs: list },
        followUps: category
            ? [
                amount > (chart?.rows[1]?.value ?? Infinity) ? 'Why is it up?' : `Who did I pay most for ${catLabel(category)}?`,
                category !== 'transfer' ? `Set ${/^[aeiou]/i.test(catLabel(category)) ? 'an' : 'a'} ${catLabel(category)} limit` : '',
                category !== 'food' ? `Compare ${catLabel(category)} with food` : '',
            ].filter(Boolean)
            : ['What did I spend the most on?', 'Who did I send the most money to?'],
        context: { category, period },
    };
}

function topMerchant(list: TransactionWithWallet[]) {
    const by = new Map<string, { name: string; total: number }>();
    for (const t of list) {
        const k = merchantKey(t.description);
        const cur = by.get(k) ?? { name: merchantName(t.description), total: 0 };
        cur.total += Number(t.amount);
        by.set(k, cur);
    }
    return [...by.values()].sort((a, b) => b.total - a.total)[0];
}

function received(w: MoneyWindow, period: Period, now: Date): Answer {
    const r = periodRange(period, now);
    const list = inOf(between(w.txs, r.from, r.to));
    const amount = Math.round(sum(list));
    const top = topMerchant(list);
    return {
        shape: 'total',
        amount,
        unit: 'came in',
        sentence: amount === 0 ? `Nothing has come in ${r.label} yet.` : `Across ${list.length} ${list.length === 1 ? 'payment' : 'payments'} ${r.label}${top ? `. The biggest was from ${top.name}` : ''}.`,
        source: { label: fromN(list.length), txs: list },
        followUps: ['How much did I spend this month?'],
        context: { period },
    };
}

function balance(q: string, w: MoneyWindow): Answer {
    const named = w.wallets.find((x) => q.includes(x.name.toLowerCase()) || (x.source_identifier && q.includes(x.source_identifier)));
    if (named) {
        return {
            shape: 'total',
            amount: Math.round(Number(named.current_balance) || 0),
            unit: `in ${named.name}`,
            sentence: 'That’s the balance from its latest alert.',
            source: { label: 'From your latest alert', txs: [] },
            followUps: ['My total balance'],
            context: {},
        };
    }
    const bank = OTHER_BANKS.find((b) => q.includes(b));
    if (bank) {
        const name = bank.replace(/\b\w/g, (c) => c.toUpperCase());
        return cant(
            `I can only see money LogIt has logged, and no ${name} alerts have come in yet. Share one and I’ll start tracking it.`,
            ['What can you see?', 'My total balance'],
            { label: 'Paste an alert', action: 'paste' },
        );
    }
    const counted = w.wallets.filter((x) => !(x.type === 'cash' && !Number(x.current_balance)));
    const amount = Math.round(counted.reduce((s, x) => s + (Number(x.current_balance) || 0), 0));
    return {
        shape: 'total',
        amount,
        unit: `across ${counted.length} ${counted.length === 1 ? 'wallet' : 'wallets'}`,
        sentence: counted.length ? counted.map((x) => `${x.name} ${cedis(Number(x.current_balance) || 0)}`).join(', ') + '.' : 'You have no wallets yet.',
        source: { label: 'From your wallets’ latest alerts', txs: [] },
        followUps: ['Can I afford a GHS 500 phone this month?'],
        context: {},
    };
}

/**
 * Can I afford it (Figma 1045:5274): a verdict first, in plain words, then
 * the working so you can trust it. Runs until your next salary when LogIt
 * knows it, otherwise to the end of the month. Usual spending is the daily
 * average of your last 3 months. Whole cedis throughout, so the sentence and
 * the working add up exactly.
 */
function afford(price: number, thing: string, w: MoneyWindow, now: Date, afterPayday = false): Answer {
    const counted = w.wallets.filter((x) => !(x.type === 'cash' && !Number(x.current_balance)));
    const have = Math.round(counted.reduce((s, x) => s + (Number(x.current_balance) || 0), 0));
    const today = startOfDay(now);

    // Next salary: the soonest expected income still to come in the next 35 days.
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const upcoming = w.expected
        .map((e) => {
            let due = dueDate(e.day_of_month, now);
            if (e.last_confirmed_month === monthKey || due < today) due = dueDate(e.day_of_month, new Date(now.getFullYear(), now.getMonth() + 1, 1));
            return { e, due };
        })
        .filter((x) => (x.due.getTime() - today.getTime()) / 86_400_000 <= 35)
        .sort((a, b) => a.due.getTime() - b.due.getTime())[0];
    const horizon = upcoming?.due ?? new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const days = Math.max(0, Math.round((startOfDay(horizon).getTime() - today.getTime()) / 86_400_000));
    const ordinalDay = `the ${ordinalOf(horizon.getDate())}`;
    const untilText = upcoming ? `your ${upcoming.e.label.toLowerCase()} on ${ordinalDay}` : 'the end of the month';

    const since = addDays(today, -90);
    const last3 = spentOf(between(w.txs, since, today));
    const firstDay = last3.length ? Math.min(...last3.map((t) => startOfDay(new Date(t.transaction_date)).getTime())) : today.getTime();
    const spanDays = Math.max(1, Math.round((today.getTime() - firstDay) / 86_400_000));
    const usual = Math.round((sum(last3) / spanDays) * days);
    const cost = Math.round(price);
    const label = thing === 'it' ? 'It' : `The ${thing}`;

    if (afterPayday && upcoming) {
        const salary = Math.round(Number(upcoming.e.amount));
        const left = have - usual + salary - cost;
        return {
            shape: 'verdict',
            tag: left >= 0 ? 'Better after payday' : 'Still short',
            tagTone: left >= 0 ? 'success' : 'neutral',
            tagIcon: left >= 0 ? 'tick' : 'alert',
            sentence: left >= 0
                ? `If you wait until ${ordinalDay}, you’d have about GHS ${cedis(left)} after buying ${thing === 'it' ? 'it' : `the ${thing}`}.`
                : `Even after payday you’d be about GHS ${cedis(-left)} short.`,
            rows: [
                { label: 'You have now', value: `GHS ${cedis(have)}` },
                { label: `Usual spending until ${ordinalDay}`, value: `− ${cedis(usual)}` },
                { label: `${upcoming.e.label} on ${ordinalDay}`, value: `+ ${cedis(salary)}` },
                { label, value: `− ${cedis(cost)}` },
                { label: 'Left after payday', value: `≈ ${left < 0 ? '−' : ''}GHS ${cedis(left)}`, strong: true },
            ],
            source: { label: 'Based on your last 3 months', icon: 'calendar', txs: last3 },
            followUps: ['Where could I cut back?'],
            context: { afford: { price, thing } },
        };
    }

    const left = have - usual - cost;
    const tight = left >= 0 && left < Math.max(100, have * 0.15);
    const tag = left < 0 ? 'Not yet' : tight ? 'Yes, but it’s tight' : 'Yes';
    return {
        shape: 'verdict',
        tag,
        tagTone: left < 0 ? 'neutral' : tight ? 'warn' : 'success',
        tagIcon: left < 0 ? 'alert' : tight ? 'info' : 'tick',
        sentence: left >= 0
            ? `You’d have about GHS ${cedis(left)} left until ${untilText}.`
            : `You’d be about GHS ${cedis(-left)} short before ${untilText}.`,
        rows: [
            { label: 'You have now', value: `GHS ${cedis(have)}` },
            { label: `Usual spending until ${upcoming ? ordinalDay : 'month end'}`, value: `− ${cedis(usual)}` },
            { label, value: `− ${cedis(cost)}` },
            { label: upcoming ? `Left before ${upcoming.e.label.toLowerCase()}` : 'Left at month end', value: `≈ ${left < 0 ? '−' : ''}GHS ${cedis(left)}`, strong: true },
        ],
        source: { label: 'Based on your last 3 months', icon: 'calendar', txs: last3 },
        followUps: [upcoming ? 'What if I wait until payday?' : '', 'Where could I cut back?'].filter(Boolean),
        context: { afford: { price, thing } },
    };
}

function dueDate(day: number, ref: Date): Date {
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return new Date(ref.getFullYear(), ref.getMonth(), Math.min(day, last));
}

function ordinalOf(n: number): string {
    const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
    return `${n}${s}`;
}

const initialsOf = (name: string) => {
    const p = name.trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
};

/** "Show my sends to Akosua": the total, with every send one tap away. */
function sendsToPerson(name: string, w: MoneyWindow, period: Period, now: Date): Answer {
    const r = periodRange(period, now);
    const key = name.toLowerCase();
    const sends = spentOf(between(w.txs, r.from, r.to)).filter((t) => catOf(t) === 'transfer' && t.description.toLowerCase().includes(key));
    if (sends.length === 0) return cant(`I couldn’t find sends to ${name.replace(/\b\w/g, (c) => c.toUpperCase())} ${r.label}.`, ['Who did I send the most money to?']);
    const who = merchantName(sends[0].description);
    return {
        shape: 'total',
        amount: Math.round(sum(sends)),
        unit: `to ${who}`,
        sentence: `${sends.length} ${sends.length === 1 ? 'send' : 'sends'} ${r.label}. Tap the source below to see each one.`,
        source: { label: fromN(sends.length), txs: sends },
        followUps: ['Who did I send the most money to?'],
        context: { category: 'transfer', period, person: who },
    };
}

/** Who did I send the most to (Figma 1045:5425): the top one in a sentence, then the full ranking. */
function topPeople(w: MoneyWindow, period: Period, now: Date): Answer {
    const r = periodRange(period, now);
    const sends = spentOf(between(w.txs, r.from, r.to)).filter((t) => catOf(t) === 'transfer');
    if (sends.length === 0) return cant(`You haven’t sent money to anyone ${r.label} that LogIt has seen.`, ['How much did I spend this month?']);
    const by = new Map<string, { name: string; total: number; n: number }>();
    for (const t of sends) {
        const k = merchantKey(t.description);
        const cur = by.get(k) ?? { name: merchantName(t.description), total: 0, n: 0 };
        cur.total += Number(t.amount);
        cur.n += 1;
        by.set(k, cur);
    }
    const ranked = [...by.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    const top = ranked[0];
    const when = period === 'month' ? 'this month' : r.label;
    const prevMonth = monthLong(new Date(r.from.getFullYear(), r.from.getMonth() - 1, 1));
    return {
        shape: 'ranking',
        sentence: `${top.name.split(' ')[0]}, GHS ${cedis(top.total)} in ${top.n} ${top.n === 1 ? 'send' : 'sends'} ${when}.`,
        rows: ranked.map((p) => ({ label: p.name, value: p.total, display: cedis(p.total), meta: `${p.n} ${p.n === 1 ? 'send' : 'sends'}`, initials: initialsOf(p.name) })),
        color: 'people',
        source: { label: `From ${sends.length} ${sends.length === 1 ? 'transfer' : 'transfers'} ${r.label}`, txs: sends },
        followUps: [`Show my sends to ${top.name.split(' ')[0]}`, `Compare with ${prevMonth}`],
        context: { category: 'transfer', period },
    };
}

function topCategories(w: MoneyWindow, period: Period, now: Date, cutBack = false): Answer {
    const r = periodRange(period, now);
    const list = spentOf(between(w.txs, r.from, r.to));
    if (list.length === 0) return cant(`Nothing spent ${r.label} yet.`, ['How much did I spend last month?']);
    const by = new Map<string, { v: number; n: number }>();
    for (const t of list) {
        const cur = by.get(catOf(t)) ?? { v: 0, n: 0 };
        cur.v += Number(t.amount);
        cur.n += 1;
        by.set(catOf(t), cur);
    }
    // Cutting back: leave out things that are hard to trim this month.
    const ranked = [...by.entries()].filter(([id]) => !cutBack || !['bills', 'fees', 'loans', 'transfer'].includes(id)).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
    if (ranked.length === 0) return cant('Most of this month went on bills and fees, which are hard to trim.', ['What did I spend the most on?']);
    const [topId, top] = ranked[0];
    const name = (id: string) => (id === 'transfer' ? 'People' : categoryStyle(id).label);
    return {
        shape: 'ranking',
        sentence: cutBack
            ? `${name(topId)} is where a small change goes furthest: GHS ${cedis(top.v)} ${r.label}.`
            : `${name(topId)}, GHS ${cedis(top.v)} ${r.label}.`,
        rows: ranked.map(([id, x]) => ({ label: name(id), value: x.v, display: cedis(x.v), meta: `${x.n} ${x.n === 1 ? 'payment' : 'payments'}`, category: id })),
        source: { label: fromN(list.length), txs: list },
        followUps: [`How much did I spend on ${catLabel(topId)} this month?`, `Set ${/^[aeiou]/i.test(catLabel(topId)) ? 'an' : 'a'} ${catLabel(topId)} limit`],
        context: { category: topId, period },
    };
}

function compareToLast(category: string | undefined, w: MoneyWindow, period: Period, now: Date): Answer {
    // Same number of days, so the comparison is fair.
    const weekly = period === 'week' || period === 'lastWeek';
    const curFrom = weekly ? startOfWeek(now) : startOfMonth(now);
    const span = addDays(startOfDay(now), 1).getTime() - curFrom.getTime();
    const prevFrom = weekly ? addDays(curFrom, -7) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevTo = new Date(prevFrom.getTime() + span);
    const pick = (l: TransactionWithWallet[]) => spentOf(l).filter((t) => !category || catOf(t) === category);
    const cur = pick(between(w.txs, curFrom, addDays(startOfDay(now), 1)));
    const prev = pick(between(w.txs, prevFrom, prevTo));
    const a = Math.round(sum(cur));
    const b = Math.round(sum(prev));
    const more = a > b;
    const what = category ? `on ${catLabel(category)}` : '';
    const unitWord = weekly ? 'last week' : `last month`;
    return {
        shape: 'verdict',
        tag: a === b ? 'Same' : more ? 'Yes' : 'No',
        tagTone: more ? 'warn' : 'success',
        sentence: a === b
            ? `About the same as ${unitWord} so far: GHS ${cedis(a)}.`
            : `${more ? 'Yes' : 'No'}, GHS ${cedis(Math.abs(a - b))} ${more ? 'more' : 'less'} ${what} than by this point ${unitWord}.`.replace('  ', ' '),
        rows: [
            { label: weekly ? 'This week so far' : `${monthLong(now)} so far`, value: cedis(a), strong: true },
            { label: weekly ? 'Same days last week' : `Same days in ${monthLong(prevFrom)}`, value: cedis(b) },
        ],
        source: { label: fromN(cur.length + prev.length), txs: [...cur, ...prev] },
        followUps: category ? ['Why is it up?', `How much did I spend on ${catLabel(category)} this month?`] : ['What did I spend the most on?'],
        context: { category, period },
    };
}

function compareCategories(a: string, b: string, w: MoneyWindow, period: Period, now: Date): Answer {
    const r = periodRange(period, now);
    const list = spentOf(between(w.txs, r.from, r.to));
    const rows = [a, b].map((id) => {
        const v = sum(list.filter((t) => catOf(t) === id));
        return { label: id === 'transfer' ? 'People' : categoryStyle(id).label, value: v, display: cedis(v), id };
    }).sort((x, y) => y.value - x.value);
    return {
        shape: 'ranking',
        sentence: rows[0].value === rows[1].value
            ? `The same on both ${r.label}: GHS ${cedis(rows[0].value)}.`
            : `${rows[0].label} is ahead by GHS ${cedis(rows[0].value - rows[1].value)} ${r.label}.`,
        rows: rows.map(({ label, value, display }) => ({ label, value, display })),
        source: { label: fromN(list.filter((t) => catOf(t) === a || catOf(t) === b).length), txs: list.filter((t) => catOf(t) === a || catOf(t) === b) },
        followUps: [`How much did I spend on ${catLabel(rows[0].id)} this month?`],
        context: { category: rows[0].id, period },
    };
}

function why(category: string | undefined, period: Period, w: MoneyWindow, now: Date): Answer {
    if (!category) return cant('Why what? Ask about one thing, like “Why is food up?”.', ['What did I spend the most on?']);
    const r = periodRange(period, now);
    const list = spentOf(between(w.txs, r.from, r.to)).filter((t) => catOf(t) === category);
    if (list.length === 0) return cant(`Nothing on ${catLabel(category)} ${r.label} to explain.`, ['What did I spend the most on?']);
    const by = new Map<string, { name: string; total: number; n: number }>();
    for (const t of list) {
        const k = merchantKey(t.description);
        const cur = by.get(k) ?? { name: merchantName(t.description), total: 0, n: 0 };
        cur.total += Number(t.amount);
        cur.n += 1;
        by.set(k, cur);
    }
    const ranked = [...by.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    const top = ranked[0];
    return {
        shape: 'ranking',
        sentence: `Mostly ${top.name}: GHS ${cedis(top.total)} over ${top.n} ${top.n === 1 ? 'payment' : 'payments'} ${r.label}.`,
        rows: ranked.map((m) => ({ label: m.name, value: m.total, display: cedis(m.total) })),
        color: category,
        source: { label: fromN(list.length), txs: list },
        followUps: [`How much did I spend on ${catLabel(category)} last month?`],
        context: { category, period },
    };
}
