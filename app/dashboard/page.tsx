'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import CategoryChart from '@/components/charts/CategoryChart';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency, getDateRange } from '@/lib/utils';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

type DateRangeType = 'today' | 'week' | 'month' | '7days' | '30days';

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRangeType>('month');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, [dateRange]);

    const fetchTransactions = async () => {
        setLoading(true);

        if (!isSupabaseConfigured()) {
            // Use mock data if Supabase is not configured
            setTransactions(generateMockTransactions());
            setLoading(false);
            return;
        }

        try {
            const { start, end } = getDateRange(dateRange);

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('transaction_date', start.toISOString())
                .lte('transaction_date', end.toISOString())
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions(generateMockTransactions());
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalIncome = transactions
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalExpenses = transactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const currentBalance = transactions.length > 0
            ? transactions[0].balance
            : 0;

        return { totalIncome, totalExpenses, currentBalance };
    }, [transactions]);

    const recentTransactions = transactions.slice(0, 10);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleTransactionUpdate = (updated: Transaction) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
    };

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header title="Dashboard" subtitle="Welcome back! Here's your financial overview" />

            <main className="px-4 md:px-6 py-6 space-y-6">
                {/* Date Range Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { key: 'today', label: 'Today' },
                        { key: '7days', label: '7 Days' },
                        { key: 'week', label: 'This Week' },
                        { key: 'month', label: 'This Month' },
                        { key: '30days', label: '30 Days' },
                    ].map((range) => (
                        <button
                            key={range.key}
                            onClick={() => setDateRange(range.key as DateRangeType)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${dateRange === range.key
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                    <button
                        onClick={fetchTransactions}
                        className="flex-shrink-0 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Balance Card */}
                    <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-5 h-5 opacity-80" />
                                <span className="text-sm font-medium opacity-80">Current Balance</span>
                            </div>
                            <p className="text-3xl font-bold">
                                {loading ? '---' : formatCurrency(stats.currentBalance)}
                            </p>
                            <p className="text-sm opacity-60 mt-2">Latest balance from transactions</p>
                        </div>
                    </div>

                    {/* Income Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                +{transactions.filter((t) => t.type === 'credit').length} transactions
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? '---' : formatCurrency(stats.totalIncome)}
                        </p>
                    </div>

                    {/* Expenses Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                                <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30">
                                -{transactions.filter((t) => t.type === 'debit').length} transactions
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loading ? '---' : formatCurrency(stats.totalExpenses)}
                        </p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category Breakdown */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Spending by Category
                            </h3>
                            <Link
                                href="/analytics"
                                className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                            >
                                View More <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : (
                            <CategoryChart transactions={transactions} type="debit" />
                        )}
                    </div>

                    {/* Top Categories */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            Top Spending Categories
                        </h3>
                        <div className="space-y-4">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                                ))
                            ) : (
                                (() => {
                                    const categoryTotals: Record<string, number> = {};
                                    transactions
                                        .filter((t) => t.type === 'debit')
                                        .forEach((t) => {
                                            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
                                        });

                                    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

                                    return Object.entries(categoryTotals)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([category, amount]) => {
                                            const cat = CATEGORIES[category] || CATEGORIES['Other'];
                                            const percentage = total > 0 ? (amount / total) * 100 : 0;

                                            return (
                                                <div key={category} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: cat.color }}
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                {category}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatCurrency(amount)}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: cat.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                })()
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Recent Transactions
                        </h3>
                        <Link
                            href="/transactions"
                            className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <TransactionList
                        transactions={recentTransactions}
                        onTransactionClick={handleTransactionClick}
                        loading={loading}
                        compact
                    />
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

// Mock data generator for when Supabase is not configured
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

    for (let i = 0; i < 50; i++) {
        const isCredit = Math.random() > 0.7;
        const category = isCredit ? 'Income' : categories[Math.floor(Math.random() * (categories.length - 1))];
        const amount = isCredit
            ? Math.floor(Math.random() * 5000) + 500
            : Math.floor(Math.random() * 500) + 10;

        balance = isCredit ? balance + amount : balance - amount;

        const descList = descriptions[category as keyof typeof descriptions] || ['Transaction'];

        transactions.push({
            id: `mock-${i}`,
            transaction_date: new Date(Date.now() - i * 1000 * 60 * 60 * Math.random() * 24).toISOString(),
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
