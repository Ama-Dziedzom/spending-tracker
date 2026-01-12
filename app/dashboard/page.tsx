'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Transaction, CATEGORIES, CURRENCY_SYMBOL } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    Plus,
    ArrowRightLeft,
    Send,
    MoreHorizontal,
    ShoppingBag,
    Car,
    Film,
    Home,
    Eye,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            setIsModalOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);

        if (!isSupabaseConfigured()) {
            const mockData = generateMockTransactions();
            setAllTransactions(mockData);
            setTransactions(mockData);
            setLoading(false);
            return;
        }

        try {
            const { data: allData, error: allError } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .limit(500);

            if (allError) throw allError;

            setAllTransactions(allData || []);
            setTransactions(allData || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            const mockData = generateMockTransactions();
            setAllTransactions(mockData);
            setTransactions(mockData);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const currentBalance = allTransactions.length > 0
            ? allTransactions[0].balance
            : 0;

        const categorySpending = transactions.reduce((acc, t) => {
            if (t.type === 'debit') {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
            }
            return acc;
        }, {} as Record<string, number>);

        return { currentBalance, categorySpending };
    }, [transactions, allTransactions]);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-32">
            <Header />

            <main className="px-6 space-y-8 animate-fade-in-up">
                {/* Balance Section */}
                <div className="space-y-1">
                    <p className="text-[17px] font-medium text-zinc-400">Main balance</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-[44px] font-bold tracking-tight">
                            <span className="text-[32px] align-top mr-1">{CURRENCY_SYMBOL}</span>
                            {stats.currentBalance.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </h2>
                        <button className="w-12 h-12 rounded-full border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex items-center justify-between">
                    {[
                        { icon: Plus, label: 'Add' },
                        { icon: ArrowRightLeft, label: 'Move' },
                        { icon: Send, label: 'Send' },
                        { icon: MoreHorizontal, label: 'Details' }
                    ].map((action, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2">
                            <button className="w-16 h-14 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <action.icon className="w-6 h-6" />
                            </button>
                            <span className="text-sm font-medium text-zinc-500">{action.label}</span>
                        </div>
                    ))}
                </div>

                {/* Quick Actions Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Quick actions</h3>
                        <button className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Edit</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { name: 'Groceries', amount: 1540.80, color: 'bg-purple-500', icon: ShoppingBag },
                            { name: 'Transport', amount: 820.40, color: 'bg-sky-500', icon: Car },
                            { name: 'Entertainment', amount: 450.00, color: 'bg-emerald-500', icon: Film },
                            { name: 'Rent & Utilities', amount: 1200.00, color: 'bg-orange-500', icon: Home },
                        ].map((cat, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${encodeURIComponent(cat.name)}`}
                                className="p-6 rounded-[32px] border border-zinc-50 dark:border-zinc-900 bg-white dark:bg-zinc-900/50 space-y-4 active:scale-95 transition-all block"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center`}>
                                        <cat.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-500">{cat.name}</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold">
                                        <span className="text-[13px] mr-0.5">{CURRENCY_SYMBOL}</span>
                                        {cat.amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                                    </p>
                                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${cat.color} transition-all duration-300`} style={{ width: `${Math.random() * 60 + 20}%` }} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Latest Transaction */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Latest transaction</h3>
                    <TransactionList
                        transactions={transactions.slice(0, 10)}
                        onTransactionClick={handleTransactionClick}
                        loading={loading}
                        compact
                    />
                </div>
            </main>

            <TransactionModal
                transaction={selectedTransaction}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTransaction(null);
                }}
            />
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
        const type = Math.random() > 0.9 ? 'credit' : 'debit';
        const category = type === 'credit' ? 'Income' : categories[Math.floor(Math.random() * categories.length)];
        const amount = Math.floor(Math.random() * 200) + 10;

        const date = new Date(now);
        date.setHours(now.getHours() - i * 2);

        const descriptions = baseDescriptions[category as keyof typeof baseDescriptions] || ['Transaction'];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];

        transactions.push({
            id: `mock-${i}`,
            transaction_date: date.toISOString(),
            amount,
            type,
            source: sources[Math.floor(Math.random() * sources.length)],
            description,
            balance: balance,
            category: category,
            raw_sms: '',
            created_at: date.toISOString()
        });

        if (type === 'debit') balance -= amount;
        else balance += amount;
    }

    return transactions;
}
