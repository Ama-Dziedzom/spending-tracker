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
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    UserPlus,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

const chartData = [
    { day: 'Sep 1', amount: 80 },
    { day: 'Sep 2', amount: 45 },
    { day: 'Sep 3', amount: 45 },
    { day: 'Sep 4', amount: 120 },
    { day: 'Sep 5', amount: 60 },
    { day: 'Sep 6', amount: 90 },
    { day: 'Sep 7', amount: 45 },
    { day: 'Sep 8', amount: 45 },
    { day: 'Sep 9', amount: 55 },
    { day: 'Sep 10', amount: 40 },
    { day: 'Sep 11', amount: 80 },
    { day: 'Sep 12', amount: 140 },
    { day: 'Sep 13', amount: 70 },
    { day: 'Sep 14', amount: 90 },
    { day: 'Sep 15', amount: 45 },
    { day: 'Sep 16', amount: 45 },
    { day: 'Sep 17', amount: 110 },
];

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

    const currentMonth = format(new Date(), 'MMMM');
    const currentYear = format(new Date(), 'yyyy');

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

        const totalSpent = transactions.reduce((acc, t) => {
            if (t.type === 'debit') return acc + t.amount;
            return acc;
        }, 0);

        return { currentBalance, totalSpent };
    }, [transactions, allTransactions]);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-64 pt-[env(safe-area-inset-top,64px)]">
            <main className="animate-fade-in-up flex flex-col">

                {/* Spending Summary & Chart */}
                <section className="px-6 pb-6 pt-4 space-y-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{currentMonth},</span>
                            <span className="text-xl text-zinc-400 font-medium">{currentYear}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <ChevronLeft className="w-6 h-6 text-zinc-400 active:text-black transition-colors" />
                            <ChevronRight className="w-6 h-6 text-zinc-400 active:text-black transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-5xl font-black tracking-tighter">
                            <span className="text-2xl mr-1 text-zinc-300 font-bold">{CURRENCY_SYMBOL}</span>
                            {stats.totalSpent.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            <span className="text-[13px] text-zinc-400 ml-3 font-bold uppercase tracking-[0.2em]">Spent</span>
                        </h3>
                    </div>

                    <div className="h-64 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: -20, right: 10, top: 20 }}>
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#818cf8"
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 8, fill: '#818cf8', strokeWidth: 0 }}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-black/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl text-center shadow-2xl border border-white/10">
                                                    <p className="font-bold text-base">{CURRENCY_SYMBOL}{payload[0].value}</p>
                                                    <p className="text-xs text-zinc-400 mt-0.5">{payload[0].payload.day}, {currentYear}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-between px-2 text-[11px] font-bold text-zinc-300 uppercase tracking-[0.2em] mt-6">
                            <span>Sep 1</span>
                            <span className="text-black dark:text-white font-black bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Sep 7</span>
                            <span>Sep 15</span>
                        </div>
                    </div>
                </section>

                <div className="py-10">
                    <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 w-full" />
                </div>

                {/* Search & Transactions */}
                <section className="px-6 space-y-12">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 transition-colors group-focus-within:text-indigo-500" />
                        <input
                            type="text"
                            placeholder="Search your spending..."
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-transparent focus:border-indigo-500/20 rounded-[32px] py-6 pl-16 pr-8 text-[17px] font-semibold focus:outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-sm"
                        />
                    </div>

                    <div className="space-y-8 pb-32">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-3xl font-black tracking-tight">Activities</h3>
                            <button className="text-sm font-bold text-indigo-500">View all</button>
                        </div>
                        <TransactionList
                            transactions={transactions.slice(0, 10)}
                            onTransactionClick={handleTransactionClick}
                            loading={loading}
                            compact
                        />
                    </div>
                </section>
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
