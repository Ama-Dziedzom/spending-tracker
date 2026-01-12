'use client';

import { useState } from 'react';
import { Transaction, CATEGORIES } from '@/types/transactions';
import TransactionItem from './TransactionItem';
import { ChevronDown, Filter, SortAsc, SortDesc } from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    onTransactionClick?: (transaction: Transaction) => void;
    showFilters?: boolean;
    loading?: boolean;
    compact?: boolean;
}

export default function TransactionList({
    transactions,
    onTransactionClick,
    showFilters = false,
    loading = false,
    compact = false,
}: TransactionListProps) {
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Filter className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No transactions found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your filters or date range
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {showFilters && (
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                    </p>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {sortOrder === 'desc' ? (
                            <SortDesc className="w-4 h-4" />
                        ) : (
                            <SortAsc className="w-4 h-4" />
                        )}
                        <span>Date</span>
                    </button>
                </div>
            )}

            {transactions.map((transaction) => (
                <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onClick={() => onTransactionClick?.(transaction)}
                    compact={compact}
                />
            ))}
        </div>
    );
}
