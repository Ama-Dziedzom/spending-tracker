'use client';

import { Transaction, CATEGORIES } from '@/types/transactions';
import { cn } from '@/lib/utils';
import {
    ShoppingBag,
    Utensils,
    Car,
    Zap,
    Film,
    Plus,
    HeartPulse,
    GraduationCap,
    ArrowDownLeft,
    HandCoins,
    Banknote,
    Receipt
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
    'Food & Dining': Utensils,
    'Transportation': Car,
    'Shopping': ShoppingBag,
    'Utilities & Bills': Zap,
    'Entertainment': Film,
    'Health': HeartPulse,
    'Education': GraduationCap,
    'Income': ArrowDownLeft,
    'Transfers': HandCoins,
    'Cash Withdrawal': Banknote,
    'Fees & Charges': Receipt,
    'Church & Charity': Plus,
    'Other': Receipt,
};

interface TransactionItemProps {
    transaction: Transaction;
    onClick?: () => void;
    compact?: boolean;
}

export default function TransactionItem({ transaction, onClick, compact = false }: TransactionItemProps) {
    const isCredit = transaction.type === 'credit';
    const IconComponent = CATEGORY_ICONS[transaction.category] || CATEGORY_ICONS['Other'];

    // Formatting date as "Today", "Yesterday", or "DD MMM YYYY"
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group rounded-xl"
        >
            {/* Circular Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm">
                <IconComponent className="w-5 h-5 text-gray-900 dark:text-white" />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
                    {transaction.description || 'Transaction'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(transaction.transaction_date)}
                </p>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
                <p
                    className={cn(
                        'font-bold text-[15px]',
                        isCredit ? 'text-[#50E3C2]' : 'text-[#FF4B4B]'
                    )}
                >
                    {isCredit ? '+' : '-'}GH₵{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
}
