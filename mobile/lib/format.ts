// v1 copy rules for numbers and dates (docs/design-handoff.md §10).

const two = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

/** List amounts: no currency, no minus sign. "85.00", "1,240.50". */
export function listAmount(n: number): string {
    return Math.abs(n).toLocaleString('en-US', two);
}

/** Received money in lists: green with a plus sign. "+200.00". */
export function receivedAmount(n: number): string {
    return `+${listAmount(n)}`;
}

/** Hero numbers: whole cedis with grouping; the "GHS" label is rendered separately. "1,840". */
export function heroAmount(n: number): string {
    return Math.round(Math.abs(n)).toLocaleString('en-US');
}

/** Inline money in sentences: "GHS 200", "GHS 3,000". */
export function ghs(n: number): string {
    return `GHS ${heroAmount(n)}`;
}

/** "Wednesday, 26 Nov" */
export function longDate(d: Date): string {
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${weekday}, ${shortDate(d)}`;
}

/** "26 Nov" */
export function shortDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** 24-hour time. "13:02", "9:14" (no leading zero on the hour, as in Figma). */
export function time24(d: Date): string {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Today", "Yesterday", or "Wednesday, 26 Nov". */
export function dayHeading(d: Date, now = new Date()): string {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (sameDay(d, now)) return 'Today';
    if (sameDay(d, y)) return 'Yesterday';
    return longDate(d);
}

export function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Initials for a person row: "Akosua Mensah" → "AM". */
export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter((p) => /[A-Za-z]/.test(p[0] ?? ''));
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** "just now", "2 min ago", "3h ago", then "24 Nov". For data ages ("Updated 2 min ago"). */
export function ago(d: Date, now = new Date()): string {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return shortDate(d);
}
