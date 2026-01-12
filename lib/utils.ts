import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
    try {
        return format(parseISO(dateString), formatStr);
    } catch {
        return dateString;
    }
}

export function formatDateTime(dateString: string): string {
    try {
        return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
        return dateString;
    }
}

export function getDateRange(range: string): { start: Date; end: Date } {
    const now = new Date();

    switch (range) {
        case 'today':
            return { start: startOfDay(now), end: endOfDay(now) };
        case 'week':
            return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case '7days':
            return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
        case '30days':
            return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
        default:
            return { start: startOfMonth(now), end: endOfMonth(now) };
    }
}

export function cn(...classes: (string | undefined | boolean)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
