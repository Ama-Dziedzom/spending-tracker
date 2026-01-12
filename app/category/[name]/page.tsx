'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction, CATEGORIES, CURRENCY_SYMBOL } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    ArrowLeft,
    MoreHorizontal,
    ShoppingBag,
    Car,
    Film,
    Home,
    AlertCircle,
    Search
} from 'lucide-react';
import Link from 'next/link';
import TransactionList from '@/components/transactions/TransactionList';
import { useParams } from 'next/navigation';

export default function CategoryPage() {
    const params = useParams();
    const categoryName = decodeURIComponent(params.name as string);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const CategoryIcon = useMemo(() => {
        const icons: Record<string, any> = {
            'Groceries': ShoppingBag,
            'Transport': Car,
            'Entertainment': Film,
            'Rent & Utilities': Home,
        };
        return icons[categoryName] || ShoppingBag;
    }, [categoryName]);

    useEffect(() => {
        fetchTransactions();
    }, [categoryName]);

    const fetchTransactions = async () => {
        setLoading(true);

        if (!isSupabaseConfigured()) {
            setTransactions(generateMockTransactions(categoryName));
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('category', categoryName)
                .order('transaction_date', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions(generateMockTransactions(categoryName));
        } finally {
            setLoading(false);
        }
    };

    const totalSpending = useMemo(() => {
        return transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }, [transactions]);

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-32">
            {/* Header */}
            <header className="px-6 py-8 flex items-center justify-between animate-fade-in-up">
                <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-zinc-800">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">{categoryName}</h1>
                <button className="w-10 h-10 flex items-center justify-center rounded-full border border-zinc-100 dark:border-zinc-800">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </header>

            <main className="px-6 space-y-8 animate-fade-in-up">
                {/* Visual Icon and Total */}
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-24 h-24 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        {categoryName === 'Groceries' ? (
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-purple-600" />
                            </div>
                        ) : (
                            <CategoryIcon className="w-10 h-10 text-zinc-900 dark:text-white" />
                        )}
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[17px] font-medium text-zinc-400">Total spending</p>
                        <h2 className="text-[44px] font-bold tracking-tight">
                            <span className="text-[32px] align-top mr-1">{CURRENCY_SYMBOL}</span>
                            {totalSpending.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder={`Search in ${categoryName}`}
                        className="w-full h-16 pl-14 pr-6 rounded-full bg-zinc-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium"
                    />
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Latest transaction</h3>
                    <TransactionList
                        transactions={transactions}
                        onTransactionClick={() => { }}
                        loading={loading}
                        compact
                    />
                </div>
            </main>
        </div>
    );
}

function generateMockTransactions(category: string): Transaction[] {
    const sources = ['MTN MoMo', 'Bank', 'Cash'];
    const transactions: Transaction[] = [];
    let balance = 3465.80;

    const baseDescriptions: Record<string, string[]> = {
        'Groceries': ['Supermart Groceries', 'Fresh Bakery', 'Corner Shop', 'Market Purchase'],
        'Transport': ['Uber Ride', 'Bolt', 'Fuel at Shell', 'Trotro'],
        'Entertainment': ['Netflix', 'Spotify', 'Cinema', 'Gaming'],
        'Rent & Utilities': ['ECG Prepaid', 'Water Bill', 'Internet', 'Trash Collection'],
    };

    const now = new Date();

    for (let i = 0; i < 15; i++) {
        const type = 'debit';
        const amount = Math.floor(Math.random() * 200) + 10;

        const date = new Date(now);
        date.setHours(now.getHours() - i * 12);

        const descriptions = baseDescriptions[category] || ['Transaction'];

        transactions.push({
            id: `mock-cat-${category}-${i}`,
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
