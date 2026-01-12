import {
    format,
    parseISO,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subDays,
    isToday,
    isYesterday,
    isThisWeek,
    isThisYear,
    differenceInDays,
    differenceInHours,
    differenceInMinutes,
} from 'date-fns';

/**
 * Format currency in Ghana Cedis (GHS)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format amount with sign for display
 */
export function formatAmountWithSign(amount: number, type: 'credit' | 'debit'): string {
    const sign = type === 'credit' ? '+' : '-';
    return `${sign}${formatCurrency(Math.abs(amount))}`;
}

/**
 * Format date in a user-friendly way
 * Examples: "Today, 2:30 PM", "Yesterday, 9:15 AM", "Mon, Jan 12", "Dec 25, 2025"
 */
export function formatFriendlyDate(dateString: string): string {
    try {
        const date = parseISO(dateString);
        const now = new Date();

        if (isToday(date)) {
            return `Today, ${format(date, 'h:mm a')}`;
        }

        if (isYesterday(date)) {
            return `Yesterday, ${format(date, 'h:mm a')}`;
        }

        // Within this week
        if (isThisWeek(date, { weekStartsOn: 1 })) {
            return format(date, "EEE, h:mm a"); // "Mon, 2:30 PM"
        }

        // This year
        if (isThisYear(date)) {
            return format(date, "MMM d, h:mm a"); // "Jan 12, 2:30 PM"
        }

        // Different year
        return format(date, "MMM d, yyyy"); // "Dec 25, 2025"
    } catch {
        return dateString;
    }
}

/**
 * Format date for transaction list (shorter format)
 * Examples: "Today", "Yesterday", "Mon", "Jan 12"
 */
export function formatShortDate(dateString: string): string {
    try {
        const date = parseISO(dateString);

        if (isToday(date)) {
            return 'Today';
        }

        if (isYesterday(date)) {
            return 'Yesterday';
        }

        // Within this week
        if (isThisWeek(date, { weekStartsOn: 1 })) {
            return format(date, "EEE"); // "Mon"
        }

        // This year
        if (isThisYear(date)) {
            return format(date, "MMM d"); // "Jan 12"
        }

        // Different year
        return format(date, "MMM d, yyyy"); // "Dec 25, 2025"
    } catch {
        return dateString;
    }
}

/**
 * Format time only
 */
export function formatTime(dateString: string): string {
    try {
        return format(parseISO(dateString), 'h:mm a');
    } catch {
        return '';
    }
}

/**
 * Format date for charts
 */
export function formatChartDate(dateString: string): string {
    try {
        return format(parseISO(dateString), 'MMM d');
    } catch {
        return dateString;
    }
}

/**
 * Get relative time (e.g., "2 hours ago", "5 minutes ago")
 */
export function getRelativeTime(dateString: string): string {
    try {
        const date = parseISO(dateString);
        const now = new Date();

        const minutesDiff = differenceInMinutes(now, date);
        if (minutesDiff < 1) return 'Just now';
        if (minutesDiff < 60) return `${minutesDiff}m ago`;

        const hoursDiff = differenceInHours(now, date);
        if (hoursDiff < 24) return `${hoursDiff}h ago`;

        const daysDiff = differenceInDays(now, date);
        if (daysDiff < 7) return `${daysDiff}d ago`;

        return formatShortDate(dateString);
    } catch {
        return dateString;
    }
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
    if (isToday(start) && isToday(end)) {
        return 'Today';
    }

    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
        return format(start, 'MMM d, yyyy');
    }

    if (isThisYear(start) && isThisYear(end)) {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
    }

    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

export function formatDate(dateString: string, formatStr: string = 'MMM dd, yyyy'): string {
    try {
        return format(parseISO(dateString), formatStr);
    } catch {
        return dateString;
    }
}

export function formatDateTime(dateString: string): string {
    return formatFriendlyDate(dateString);
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
        case '90days':
            return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
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

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}
