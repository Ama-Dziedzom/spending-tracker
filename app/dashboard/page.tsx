'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Transaction, CURRENCY_SYMBOL } from '@/types/transactions';
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
        <div className="min-h-screen bg-[#FDFDFF] dark:bg-black pb-40 grid grid-cols-1 justify-items-center overflow-x-hidden">
            <Header title="Dashboard" subtitle={`Summary for ${currentMonth}`} />

            <div className="animate-fade-in-up flex flex-col w-[90%] max-w-2xl gap-6 pt-4">

                {/* Section 1: Budget Overview */}
                <BudgetOverview
                    monthlyIncome={MONTHLY_INCOME}
                    totalSpent={stats.totalSpent}
                />

                {/* Section 2: Spending Trends & Chart */}
                <SpendingTrends
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    totalSpent={stats.totalSpent}
                    chartData={chartData}
                    chartConfig={chartConfig}
                />

                {/* Section 3: Activities */}
                <ActivitiesSection
                    transactions={transactions}
                    onTransactionClick={handleTransactionClick}
                    loading={loading}
                />
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
