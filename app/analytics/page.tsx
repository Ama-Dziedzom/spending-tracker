'use client';

import { useState, useEffect, useMemo } from 'react';
import TransactionList from '@/components/transactions/TransactionList';
import { Transaction } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Search } from 'lucide-react';

// Analytics Components
import Header from '@/components/layout/Header';
import SpendingSummary from '@/components/analytics/SpendingSummary';
import CategoryDistribution from '@/components/analytics/CategoryDistribution';
import SmartCategoryBanner from '@/components/analytics/SmartCategoryBanner';

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

        return { totalSpending, categorySpending };
    }, [transactions]);

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-32">
            <Header title="Spend analysis" subtitle="View your spending habits" />

            <main className="px-6 space-y-8 animate-fade-in-up pt-4">
                <SpendingSummary totalSpending={stats.totalSpending} />

                <CategoryDistribution categorySpending={stats.categorySpending} />

                <SmartCategoryBanner />

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
