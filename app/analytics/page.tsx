'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import TransactionList from '@/components/transactions/TransactionList';
import { Transaction } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Search, Filter } from 'lucide-react';

// Analytics Components
import Header from '@/components/layout/Header';
import SpendingSummary from '@/components/analytics/SpendingSummary';
import CategoryDistribution from '@/components/analytics/CategoryDistribution';
import SmartCategoryBanner from '@/components/analytics/SmartCategoryBanner';

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}

function AnalyticsContent() {
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

        return { totalSpending, categorySpending };
    }, [transactions]);

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-56 pt-40">
            <Header title="Spend Analysis" subtitle="Detailed breakdown of expenses" />

            <main className="max-w-3xl mx-auto px-8 space-y-20 animate-fade-in-up">
                <SpendingSummary totalSpending={stats.totalSpending} />

                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search for any transaction..."
                        className="w-full h-16 pl-14 pr-16 rounded-[24px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none transition-all text-[15px] font-bold"
                    />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                <CategoryDistribution categorySpending={stats.categorySpending} />

                <SmartCategoryBanner />

                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                            Transaction History
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Latest Transactions</p>
                    </div>

                    <div className="glass border border-white/40 dark:border-white/5 rounded-[40px] overflow-hidden premium-shadow">
                        <TransactionList
                            transactions={transactions.slice(0, 15)}
                            onTransactionClick={() => { }}
                            loading={loading}
                            compact
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}

function generateMockTransactions(): Transaction[] {
    const categories = ['Groceries', 'Transport', 'Entertainment', 'Rent & Utilities', 'Shopping', 'Health'];
    const transactions: Transaction[] = [];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
        const type = 'debit';
        const category = categories[Math.floor(Math.random() * 4)];
        const amount = Math.floor(Math.random() * 200) + 10;
        const date = new Date(now);
        date.setHours(now.getHours() - i * 4);

        transactions.push({
            id: `mock-ana-${i}`,
            transaction_date: date.toISOString(),
            amount,
            type,
            source: 'Bank Card',
            description: category + ' Transaction',
            balance: 0,
            category: category,
            raw_sms: '',
            created_at: date.toISOString()
        });
    }

    return transactions;
}
