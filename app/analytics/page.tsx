'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import SpendingChart from '@/components/charts/SpendingChart';
import CategoryChart from '@/components/charts/CategoryChart';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    PieChart,
    BarChart3,
    Calendar,
    Wallet,
    Building2,
    Smartphone,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

export default function AnalyticsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

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
            // Fetch last 6 months of data
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .gte('transaction_date', sixMonthsAgo.toISOString())
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

    const analytics = useMemo(() => {
        if (transactions.length === 0) {
            return {
                totalIncome: 0,
                totalExpenses: 0,
                netSavings: 0,
                avgDaily: 0,
                avgWeekly: 0,
                avgMonthly: 0,
                topCategories: [],
                sourceBreakdown: [],
                transactionCount: { debit: 0, credit: 0 },
            };
        }

        const totalIncome = transactions
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalExpenses = transactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const netSavings = totalIncome - totalExpenses;

        // Calculate date range for averages
        const dates = transactions.map((t) => new Date(t.transaction_date).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

        const avgDaily = totalExpenses / daysDiff;
        const avgWeekly = avgDaily * 7;
        const avgMonthly = avgDaily * 30;

        // Top spending categories
        const categoryTotals: Record<string, number> = {};
        transactions
            .filter((t) => t.type === 'debit')
            .forEach((t) => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
            });

        const topCategories = Object.entries(categoryTotals)
            .map(([name, amount]) => ({
                name,
                amount,
                color: CATEGORIES[name]?.color || CATEGORIES['Other'].color,
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Source breakdown
        const sourceTotals: Record<string, { income: number; expenses: number }> = {};
        transactions.forEach((t) => {
            if (!sourceTotals[t.source]) {
                sourceTotals[t.source] = { income: 0, expenses: 0 };
            }
            if (t.type === 'credit') {
                sourceTotals[t.source].income += Math.abs(t.amount);
            } else {
                sourceTotals[t.source].expenses += Math.abs(t.amount);
            }
        });

        const sourceBreakdown = Object.entries(sourceTotals).map(([name, values]) => ({
            name: name.replace('_', ' '),
            ...values,
        }));

        const transactionCount = {
            debit: transactions.filter((t) => t.type === 'debit').length,
            credit: transactions.filter((t) => t.type === 'credit').length,
        };

        return {
            totalIncome,
            totalExpenses,
            netSavings,
            avgDaily,
            avgWeekly,
            avgMonthly,
            topCategories,
            sourceBreakdown,
            transactionCount,
        };
    }, [transactions]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header title="Analytics" subtitle="Insights into your spending habits" />

            <main className="px-4 md:px-6 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowDownRight className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-80">Total Income</span>
                        </div>
                        <p className="text-xl font-bold">
                            {loading ? '---' : formatCurrency(analytics.totalIncome)}
                        </p>
                        <p className="text-xs opacity-60 mt-1">
                            {analytics.transactionCount.credit} transactions
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-80">Total Expenses</span>
                        </div>
                        <p className="text-xl font-bold">
                            {loading ? '---' : formatCurrency(analytics.totalExpenses)}
                        </p>
                        <p className="text-xs opacity-60 mt-1">
                            {analytics.transactionCount.debit} transactions
                        </p>
                    </div>

                    <div className={`p-4 rounded-2xl ${analytics.netSavings >= 0
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            : 'bg-gradient-to-br from-orange-500 to-amber-600'
                        } text-white`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-80">Net Savings</span>
                        </div>
                        <p className="text-xl font-bold">
                            {loading ? '---' : formatCurrency(analytics.netSavings)}
                        </p>
                        <p className="text-xs opacity-60 mt-1">
                            {analytics.netSavings >= 0 ? 'Great job!' : 'You spent more than earned'}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-medium opacity-80">Avg Daily</span>
                        </div>
                        <p className="text-xl font-bold">
                            {loading ? '---' : formatCurrency(analytics.avgDaily)}
                        </p>
                        <p className="text-xs opacity-60 mt-1">spending per day</p>
                    </div>
                </div>

                {/* Average Spending Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(analytics.avgDaily)}
                                </p>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Average</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(analytics.avgWeekly)}
                                </p>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-full w-2/3 bg-purple-500 rounded-full" />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
                                <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Average</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(analytics.avgMonthly)}
                                </p>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <div className="h-full w-full bg-teal-500 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trends */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Monthly Trends
                            </h3>
                        </div>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : (
                            <SpendingChart transactions={transactions} months={6} />
                        )}
                    </div>

                    {/* Category Breakdown */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-purple-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Spending by Category
                            </h3>
                        </div>
                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : (
                            <CategoryChart transactions={transactions} type="debit" />
                        )}
                    </div>
                </div>

                {/* Source Breakdown */}
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Spending by Source
                        </h3>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Top Categories List */}
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                        Top Spending Categories
                    </h3>
                    <div className="space-y-4">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                            ))
                        ) : (
                            analytics.topCategories.map((cat, index) => {
                                const percentage = analytics.totalExpenses > 0
                                    ? (cat.amount / analytics.totalExpenses) * 100
                                    : 0;

                                return (
                                    <div
                                        key={cat.name}
                                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {cat.name}
                                                </span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(cat.amount)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: cat.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-12 text-right">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
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

    // Generate 6 months of data
    for (let month = 0; month < 6; month++) {
        const transactionsThisMonth = 30 + Math.floor(Math.random() * 20);

        for (let i = 0; i < transactionsThisMonth; i++) {
            const isCredit = Math.random() > 0.75;
            const category = isCredit ? 'Income' : categories[Math.floor(Math.random() * (categories.length - 1))];
            const amount = isCredit
                ? Math.floor(Math.random() * 5000) + 500
                : Math.floor(Math.random() * 500) + 10;

            balance = isCredit ? balance + amount : balance - amount;

            const descList = descriptions[category as keyof typeof descriptions] || ['Transaction'];
            const date = new Date();
            date.setMonth(date.getMonth() - month);
            date.setDate(Math.floor(Math.random() * 28) + 1);

            transactions.push({
                id: `mock-${month}-${i}`,
                transaction_date: date.toISOString(),
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
    }

    return transactions.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
}
