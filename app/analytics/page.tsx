'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import { Transaction, CATEGORIES, CURRENCY_SYMBOL } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    ArrowLeft,
    MoreHorizontal,
    PieChart,
    Search,
    ShoppingBag,
    Car,
    Film,
    Home,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

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
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
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
        const debitTransactions = transactions.filter(t => t.type === 'debit');
        const totalSpending = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

        const categorySpending = debitTransactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        const sortedCategories = Object.entries(categorySpending)
            .sort((a, b) => b[1] - a[1]);

        return { totalSpending, categorySpending, sortedCategories };
    }, [transactions]);

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-32">
            {/* Header */}
            <header className="px-6 py-8 flex items-center justify-between animate-fade-in-up">
                <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-zinc-800">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">Spend analysis</h1>
                <button className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-zinc-800">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </header>

            <main className="px-6 space-y-8 animate-fade-in-up">
                {/* Total Spending */}
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <p className="text-[17px] font-medium text-zinc-400">Total spending</p>
                        <h2 className="text-[44px] font-bold tracking-tight leading-none">
                            <span className="text-[32px] align-top mr-1">{CURRENCY_SYMBOL}</span>
                            {stats.totalSpending.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <button className="w-12 h-12 rounded-full border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                        <PieChart className="w-6 h-6 text-zinc-900 dark:text-white" />
                    </button>
                </div>

                {/* Segmented Bar Chart */}
                <div className="h-4 flex gap-1 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: '40%' }} />
                    <div className="h-full bg-sky-500" style={{ width: '25%' }} />
                    <div className="h-full bg-emerald-500" style={{ width: '20%' }} />
                    <div className="h-full bg-orange-500" style={{ width: '15%' }} />
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { name: 'Groceries', icon: ShoppingBag, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
                        { name: 'Transport', icon: Car, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
                        { name: 'Entertainment', icon: Film, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
                        { name: 'Rent & Utilities', icon: Home, color: 'text-orange-500', bgColor: 'bg-orange-500/10' }
                    ].map((cat, idx) => (
                        <div key={idx} className="p-4 rounded-3xl border border-zinc-50 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className={`${cat.bgColor} ${cat.color} p-1.5 rounded-lg`}>
                                    <cat.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-zinc-500">{cat.name}</span>
                            </div>
                            <p className="text-lg font-bold">
                                <span className="text-sm mr-0.5">{CURRENCY_SYMBOL}</span>
                                {(stats.categorySpending[cat.name] || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Smart Category Banner */}
                <div className="p-6 rounded-[32px] bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 flex flex-shrink-0 items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Smart category</h4>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            We&quot;ve categorized your transaction, you may change here if you want.
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search for any transaction"
                        className="w-full h-16 pl-14 pr-6 rounded-full bg-zinc-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium"
                    />
                </div>

                {/* Latest Transaction */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Latest transaction</h3>
                    <TransactionList
                        transactions={transactions.slice(0, 10)}
                        onTransactionClick={() => { }}
                        loading={loading}
                        compact
                    />
                </div>
            </main>
        </div>
    );
}

function generateMockTransactions(): Transaction[] {
    const categories = ['Groceries', 'Transport', 'Entertainment', 'Rent & Utilities', 'Shopping', 'Health'];
    const sources = ['MTN MoMo', 'Bank', 'Cash'];
    const transactions: Transaction[] = [];
    let balance = 3465.80;

    const baseDescriptions = {
        'Groceries': ['Supermart Groceries', 'Fresh Bakery', 'Corner Shop'],
        'Transport': ['Uber Ride', 'Bolt', 'Fuel at Shell'],
        'Entertainment': ['Netflix', 'Spotify', 'Cinema'],
        'Rent & Utilities': ['ECG Prepaid', 'Water Bill', 'Internet'],
        'Shopping': ['Melcom', 'Pharmacy', 'Online Store'],
        'Health': ['Drugstore', 'Clinic', 'Gym'],
    };

    const now = new Date();

    for (let i = 0; i < 20; i++) {
        const type = 'debit';
        const category = categories[Math.floor(Math.random() * 4)]; // Focus on the 4 main ones
        const amount = Math.floor(Math.random() * 200) + 10;

        const date = new Date(now);
        date.setHours(now.getHours() - i * 4);

        const descriptions = baseDescriptions[category as keyof typeof baseDescriptions] || ['Transaction'];

        transactions.push({
            id: `mock-ana-${i}`,
            transaction_date: date.toISOString(),
            amount,
            type,
            source: sources[Math.floor(Math.random() * sources.length)],
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            balance: balance,
            category: category,
            raw_sms: '',
            created_at: date.toISOString()
        });

        balance -= amount;
    }

    return transactions;
}
