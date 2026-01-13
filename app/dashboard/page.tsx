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
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    UserPlus,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from '@/components/ui/chart';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

const chartData = [
    { day: 'Sep 1', spent: 80 },
    { day: 'Sep 2', spent: 45 },
    { day: 'Sep 3', spent: 45 },
    { day: 'Sep 4', spent: 120 },
    { day: 'Sep 5', spent: 60 },
    { day: 'Sep 6', spent: 90 },
    { day: 'Sep 7', spent: 82 },
    { day: 'Sep 8', spent: 45 },
    { day: 'Sep 9', spent: 55 },
    { day: 'Sep 10', spent: 40 },
    { day: 'Sep 11', spent: 80 },
    { day: 'Sep 12', spent: 140 },
    { day: 'Sep 13', spent: 70 },
    { day: 'Sep 14', spent: 90 },
    { day: 'Sep 15', spent: 45 },
    { day: 'Sep 16', spent: 45 },
    { day: 'Sep 17', spent: 110 },
];

const chartConfig = {
    spent: {
        label: "Spent",
        color: "#818cf8",
    },
} satisfies ChartConfig;

// Mock monthly income for budget progress
const MONTHLY_INCOME = 2450;

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
        <div className="min-h-screen bg-[#FDFDFF] dark:bg-black pb-60 pt-52 grid grid-cols-1 justify-items-center overflow-x-hidden">
            <div className="animate-fade-in-up flex flex-col w-[90%] max-w-2xl gap-20">

                {/* Section 1: Budget Overview */}
                <section>
                    <div className="space-y-12 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[48px] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] border border-white dark:border-zinc-800/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2.5">Budget</p>
                                <p className="text-[24px] font-black text-black dark:text-white leading-tight">
                                    {CURRENCY_SYMBOL}{MONTHLY_INCOME.toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="flex-1 text-right">
                                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2.5">Spent</p>
                                <p className="text-[24px] font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                                    {CURRENCY_SYMBOL}{stats.totalSpent.toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden p-1">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                                    style={{ width: `${Math.min((stats.totalSpent / MONTHLY_INCOME) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[13px] font-bold pt-1">
                                <span className="text-zinc-400 dark:text-zinc-500">
                                    {((stats.totalSpent / MONTHLY_INCOME) * 100).toFixed(1)}% of limit
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
                                    {CURRENCY_SYMBOL}{(MONTHLY_INCOME - stats.totalSpent).toLocaleString('en-GH', { minimumFractionDigits: 0 })} Left
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Spending Trends & Chart */}
                <section className="space-y-12">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[18px] font-bold text-black dark:text-white">{currentMonth},</span>
                                <span className="text-[18px] text-zinc-400 font-medium">{currentYear}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <ChevronLeft className="w-6 h-6 text-zinc-300 dark:text-zinc-600 cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                                <ChevronRight className="w-6 h-6 text-zinc-300 dark:text-zinc-600 cursor-pointer hover:text-black dark:hover:text-white transition-colors" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <h3 className="text-[38px] font-black tracking-tight text-black dark:text-white leading-none">
                                {CURRENCY_SYMBOL}{stats.totalSpent.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </h3>
                            <span className="text-[20px] font-bold text-zinc-400 dark:text-zinc-500">Spent</span>
                        </div>
                    </div>

                    <div className="h-72 w-full relative">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <LineChart
                                data={chartData}
                                margin={{ left: 12, right: 12, top: 20, bottom: 40 }}
                            >
                                <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="0" opacity={0.4} />
                                <YAxis hide={true} domain={['dataMin - 10', 'dataMax + 20']} />

                                <Line
                                    type="monotone"
                                    dataKey="spent"
                                    stroke="var(--color-spent)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, fill: 'var(--color-spent)', strokeWidth: 0 }}
                                />

                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="bg-[#121212] border border-white/5 text-white rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                                            labelFormatter={(value) => `${value}, ${currentYear}`}
                                            formatter={(value, name) => (
                                                <>
                                                    <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                                                        {name}
                                                    </span>
                                                    <span className="font-bold text-[17px] tracking-tight ml-auto">
                                                        {CURRENCY_SYMBOL}{value}
                                                    </span>
                                                </>
                                            )}
                                        />
                                    }
                                />
                            </LineChart>
                        </ChartContainer>

                        <div className="flex items-center justify-between text-[12px] font-bold text-zinc-300 dark:text-zinc-600 mt-0 px-1">
                            <span>Sep 1</span>
                            <span className="text-zinc-400 dark:text-zinc-500">Sep 7</span>
                            <span>Sep 15</span>
                        </div>
                    </div>
                </section>

                {/* Section 3: Activities */}
                <section>
                    <div className="space-y-12 pb-40">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[30px] font-black tracking-tighter text-black dark:text-white">Activities</h3>
                            <button className="text-[14px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-5 py-2.5 rounded-2xl transition-all active:scale-95">View all</button>
                        </div>
                        <TransactionList
                            transactions={transactions.slice(0, 10)}
                            onTransactionClick={handleTransactionClick}
                            loading={loading}
                            compact
                        />
                    </div>
                </section>
            </div>


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
