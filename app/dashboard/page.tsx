'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Transaction } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { type ChartConfig } from '@/components/ui/chart';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

// Dashboard Components
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import SpendingTrends from '@/components/dashboard/SpendingTrends';
import ActivitiesSection from '@/components/dashboard/ActivitiesSection';
import Header from '@/components/layout/Header';

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
        color: "#6366f1",
    },
} satisfies ChartConfig;

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
            setTransactions(mockData);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .limit(500);

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
        const totalSpent = transactions.reduce((acc, t) => {
            if (t.type === 'debit') return acc + t.amount;
            return acc;
        }, 0);

        return { totalSpent };
    }, [transactions]);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-56 pt-40">
            <Header title="My Wallet" subtitle={`Overview for ${currentMonth}`} />

            <main className="max-w-3xl mx-auto px-8 space-y-20 animate-fade-in-up">
                <BudgetOverview
                    monthlyIncome={MONTHLY_INCOME}
                    totalSpent={stats.totalSpent}
                />

                <SpendingTrends
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    totalSpent={stats.totalSpent}
                    chartData={chartData}
                    chartConfig={chartConfig}
                />

                <ActivitiesSection
                    transactions={transactions}
                    onTransactionClick={handleTransactionClick}
                    loading={loading}
                />
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
    const transactions: Transaction[] = [];
    let balance = 3465.80;
    const now = new Date();

    for (let i = 0; i < 20; i++) {
        const type = Math.random() > 0.9 ? 'credit' : 'debit';
        const category = type === 'credit' ? 'Income' : categories[Math.floor(Math.random() * categories.length)];
        const amount = Math.floor(Math.random() * 200) + 10;
        const date = new Date(now);
        date.setHours(now.getHours() - i * i);

        transactions.push({
            id: `mock-${i}`,
            transaction_date: date.toISOString(),
            amount,
            type,
            source: Math.random() > 0.5 ? 'MTN MoMo' : 'Bank Card',
            description: category + ' Expense',
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
