'use client';

import { Transaction, CATEGORIES } from '@/types/transactions';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface TransactionItemProps {
    transaction: Transaction;
    onClick?: () => void;
    compact?: boolean;
}

export default function TransactionItem({ transaction, onClick, compact = false }: TransactionItemProps) {
    const isCredit = transaction.type === 'credit';
    const category = CATEGORIES[transaction.category] || CATEGORIES['Other'];

    return (
        <div
            onClick={onClick}
            className={cn(
                'flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700',
                'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50',
                'transition-all duration-200 cursor-pointer group',
                compact && 'p-3'
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
                    isCredit
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                        : 'bg-gradient-to-br from-rose-400 to-red-500'
                )}
            >
                {isCredit ? (
                    <ArrowDownLeft className="w-6 h-6 text-white" />
                ) : (
                    <ArrowUpRight className="w-6 h-6 text-white" />
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {transaction.description || 'Transaction'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(transaction.transaction_date)}
                    </span>
                    <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        category.bgColor,
                        category.textColor
                    )}>
                        {transaction.category}
                    </span>
                </div>
            </div>

            {/* Amount & Balance */}
            <div className="text-right flex-shrink-0">
                <p
                    className={cn(
                        'font-bold text-lg',
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                >
                    {isCredit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                {!compact && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Balance: {formatCurrency(transaction.balance)}
                    </p>
                )}
            </div>
        </div>
    );
}
