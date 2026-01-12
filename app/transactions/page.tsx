'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Transaction, CATEGORIES, SOURCES } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    Filter,
    Search,
    X,
    ChevronDown,
    Calendar,
    RefreshCw,
    SlidersHorizontal,
} from 'lucide-react';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 20;

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);

        if (!isSupabaseConfigured()) {
            setTransactions(generateMockTransactions());
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .limit(500);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions(generateMockTransactions());
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.description?.toLowerCase().includes(query) ||
                    t.category?.toLowerCase().includes(query) ||
                    t.source?.toLowerCase().includes(query)
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter((t) => t.type === typeFilter);
        }

        // Source filter
        if (sourceFilter !== 'all') {
            filtered = filtered.filter((t) => t.source === sourceFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter((t) => t.category === categoryFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.transaction_date).getTime();
                const dateB = new Date(b.transaction_date).getTime();
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
            }
        });

        return filtered;
    }, [transactions, searchQuery, typeFilter, sourceFilter, categoryFilter, sortBy, sortOrder]);

    const paginatedTransactions = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredTransactions.slice(start, start + pageSize);
    }, [filteredTransactions, page]);

    const totalPages = Math.ceil(filteredTransactions.length / pageSize);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleTransactionUpdate = (updated: Transaction) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setSourceFilter('all');
        setCategoryFilter('all');
        setSortBy('date');
        setSortOrder('desc');
        setPage(1);
    };

    const hasActiveFilters = searchQuery || typeFilter !== 'all' || sourceFilter !== 'all' || categoryFilter !== 'all';

    // Get unique sources and categories from transactions
    const uniqueSources = [...new Set(transactions.map((t) => t.source))].filter(Boolean);
    const uniqueCategories = [...new Set(transactions.map((t) => t.category))].filter(Boolean);

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header title="Transactions" subtitle={`${filteredTransactions.length} transactions`} />

            <main className="px-4 md:px-6 py-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>

                {/* Filter Toggle & Quick Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${showFilters || hasActiveFilters
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 w-5 h-5 flex items-center justify-center bg-white text-emerald-500 rounded-full text-xs font-bold">
                                {[searchQuery, typeFilter !== 'all', sourceFilter !== 'all', categoryFilter !== 'all'].filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    {/* Type Quick Filters */}
                    {['all', 'debit', 'credit'].map((type) => (
                        <button
                            key={type}
                            onClick={() => {
                                setTypeFilter(type as 'all' | 'debit' | 'credit');
                                setPage(1);
                            }}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${typeFilter === type
                                    ? type === 'credit'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                        : type === 'debit'
                                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {type === 'all' ? 'All Types' : type === 'credit' ? 'Income' : 'Expenses'}
                        </button>
                    ))}

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Source Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Source
                                </label>
                                <select
                                    value={sourceFilter}
                                    onChange={(e) => {
                                        setSourceFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                                >
                                    <option value="all">All Sources</option>
                                    {uniqueSources.map((source) => (
                                        <option key={source} value={source}>
                                            {source.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                                >
                                    <option value="all">All Categories</option>
                                    {uniqueCategories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort Options */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Sort By
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                                    >
                                        <option value="date">Date</option>
                                        <option value="amount">Amount</option>
                                    </select>
                                    <button
                                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        {sortOrder === 'desc' ? '↓' : '↑'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 p-4">
                    <TransactionList
                        transactions={paginatedTransactions}
                        onTransactionClick={handleTransactionClick}
                        showFilters
                        loading={loading}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="px-4 text-sm text-gray-600 dark:text-gray-400">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Transaction Modal */}
            <TransactionModal
                transaction={selectedTransaction}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTransaction(null);
                }}
                onUpdate={handleTransactionUpdate}
            />
        </div>
    );
}

// Mock data generator
function generateMockTransactions(): Transaction[] {
    const categories = Object.keys(CATEGORIES);
    const sources = ['MTN_MoMo', 'Vodafone_Cash', 'Bank'];
    const descriptions = {
        'Food & Dining': ['Lunch at restaurant', 'Grocery shopping', 'Coffee shop', 'Dinner delivery'],
        'Transportation': ['Uber ride', 'Fuel purchase', 'Taxi fare', 'Bus ticket'],
        'Shopping': ['Amazon purchase', 'Clothing store', 'Electronics shop', 'Online shopping'],
        'Utilities & Bills': ['Electricity bill', 'Water bill', 'Internet subscription', 'Phone bill'],
        'Entertainment': ['Netflix subscription', 'Cinema tickets', 'Gaming purchase', 'Spotify'],
        'Health': ['Pharmacy purchase', 'Doctor visit', 'Gym membership', 'Health supplements'],
        'Income': ['Salary deposit', 'Freelance payment', 'Refund received', 'Gift received'],
        'Transfers': ['Bank transfer', 'Mobile money transfer', 'Sent to friend'],
        'Cash Withdrawal': ['ATM withdrawal', 'Cash out'],
    };

    const transactions: Transaction[] = [];
    let balance = 15000;

    for (let i = 0; i < 100; i++) {
        const isCredit = Math.random() > 0.7;
        const category = isCredit ? 'Income' : categories[Math.floor(Math.random() * (categories.length - 1))];
        const amount = isCredit
            ? Math.floor(Math.random() * 5000) + 500
            : Math.floor(Math.random() * 500) + 10;

        balance = isCredit ? balance + amount : balance - amount;

        const descList = descriptions[category as keyof typeof descriptions] || ['Transaction'];

        transactions.push({
            id: `mock-${i}`,
            transaction_date: new Date(Date.now() - i * 1000 * 60 * 60 * Math.random() * 48).toISOString(),
            amount,
            type: isCredit ? 'credit' : 'debit',
            source: sources[Math.floor(Math.random() * sources.length)],
            description: descList[Math.floor(Math.random() * descList.length)],
            balance,
            category,
            raw_sms: 'Sample SMS message for this transaction',
            created_at: new Date().toISOString(),
        });
    }

    return transactions.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
}
