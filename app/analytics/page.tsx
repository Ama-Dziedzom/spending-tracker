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
        <div className="min-h-screen bg-[#F8F9FB] dark:bg-gray-950 pb-20">
            <header className="px-6 pt-10 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insights</h1>
            </header>

            <main className="px-6 space-y-6">
                {/* Tabs for Daily/Monthly/Yearly */}
                <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-full flex justify-between items-center">
                    <button className="flex-1 py-2 text-sm font-medium text-gray-500">Daily</button>
                    <button className="flex-1 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-sm">Monthly</button>
                    <button className="flex-1 py-2 text-sm font-medium text-gray-500">Yearly</button>
                </div>

                {/* Main Chart Container */}
                <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-sm border border-gray-50 dark:border-gray-800">
                    <div className="h-64 mb-6 relative">
                        {/* Tooltip Placeholder matching image style */}
                        <div className="absolute top-0 left-1/4 bg-black text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 z-10">
                            $6.745,04
                            <div className="absolute -bottom-1 left-12 w-2 h-2 bg-black rotate-45" />
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.sourceBreakdown.slice(0, 5)} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={8}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    dy={10}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={() => null} />
                                <Bar
                                    dataKey="income"
                                    fill="#50E3C2"
                                    radius={[10, 10, 0, 0]}
                                    barSize={20}
                                />
                                <Bar
                                    dataKey="expenses"
                                    fill="#E5E7EB"
                                    radius={[10, 10, 0, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex justify-center gap-8 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#50E3C2]" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Income</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Expenditure</span>
                        </div>
                    </div>
                </div>

                {/* Recently Used Section */}
                <div className="space-y-4 pb-10">
                    <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Recently Used</h3>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Dribbble Card */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-[24px] shadow-sm border border-gray-50 dark:border-gray-800 space-y-4">
                            <div className="space-y-1">
                                <p className="text-[13px] font-bold text-gray-900 dark:text-white">Dribbble Pro</p>
                                <p className="text-[11px] text-gray-400">Monthly Bill</p>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-medium">Last Transaction</span>
                                </div>
                                <p className="text-[12px] font-bold text-gray-900 dark:text-white">20 July 2024</p>
                            </div>
                        </div>

                        {/* Spotify Card */}
                        <div className="bg-white dark:bg-gray-900 p-5 rounded-[24px] shadow-sm border border-gray-50 dark:border-gray-800 space-y-4">
                            <div className="space-y-1">
                                <p className="text-[13px] font-bold text-gray-900 dark:text-white">Spotify Premium</p>
                                <p className="text-[11px] text-gray-400">Monthly Bill</p>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-medium">Last Transaction</span>
                                </div>
                                <p className="text-[12px] font-bold text-gray-900 dark:text-white">15 June 2024</p>
                            </div>
                        </div>
                    </div>

                    {/* Dribbble Item below */}
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-[24px] shadow-sm border border-gray-50 dark:border-gray-800">
                        <div className="flex items-center gap-4 p-4">
                            <div className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center bg-white dark:bg-gray-900">
                                <Building2 className="w-5 h-5 text-gray-900 dark:text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">Dribbble Pro</p>
                                <p className="text-xs text-gray-400 mt-0.5">Today</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-[15px] text-[#FF4B4B]">-$8.00</p>
                            </div>
                        </div>
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
