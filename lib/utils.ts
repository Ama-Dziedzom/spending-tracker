import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility functions for the spending tracker
import { format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatShortDate(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export function formatFriendlyDate(dateString: string) {
  return formatShortDate(dateString);
}

export function formatCurrency(amount: number) {
  return amount.toLocaleString('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  });
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
