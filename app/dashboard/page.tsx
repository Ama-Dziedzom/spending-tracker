'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getDateRange } from '@/lib/utils';
import {
    Wallet,
    Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type DateRangeType = 'today' | 'week' | 'month' | '7days' | '30days';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRangeType>('month');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            setIsModalOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchTransactions();
    }, [dateRange]);

    const fetchTransactions = async () => {
        setLoading(true);

        if (!isSupabaseConfigured()) {
            const mockData = generateMockTransactions();
            setAllTransactions(mockData);
            filterTransactionsByDateRange(mockData);
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
            filterTransactionsByDateRange(allData || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            const mockData = generateMockTransactions();
            setAllTransactions(mockData);
            filterTransactionsByDateRange(mockData);
        } finally {
            setLoading(false);
        }
    };

    const filterTransactionsByDateRange = (data: Transaction[]) => {
        const { start, end } = getDateRange(dateRange);
        const filtered = data.filter(t => {
            const date = new Date(t.transaction_date);
            return date >= start && date <= end;
        });
        setTransactions(filtered);
    };

    useEffect(() => {
        filterTransactionsByDateRange(allTransactions);
    }, [dateRange, allTransactions]);

    const stats = useMemo(() => {
        const totalIncome = transactions
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalExpenses = transactions
            .filter((t) => t.type === 'debit')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const currentBalance = allTransactions.length > 0
            ? allTransactions[0].balance
            : 0;

        return { totalIncome, totalExpenses, currentBalance };
    }, [transactions, allTransactions]);

    const recentTransactions = transactions.slice(0, 8);

    const handleTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleTransactionUpdate = (updated: Transaction) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setAllTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] dark:bg-gray-950 pb-20">
            <Header title="Omar Levin" />

            <main className="px-6 space-y-10">
                {/* Check for empty state */}
                {!loading && allTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="w-24 h-20 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-900 dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                            <Wallet className="w-10 h-10 text-gray-900 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create your first budget!</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto">
                                Start managing your finances today with these simple and effective steps.
                            </p>
                        </div>
                        <button className="bg-[#0F172A] dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform">
                            Create a Budget
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Planned Expenses Section */}
                        <div className="space-y-1 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <p className="text-[15px] font-medium text-gray-400">Planned Expenses</p>
                            <p className="text-[42px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight uppercase">
                                GH₵{loading ? '---' : stats.totalExpenses.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Category Progress Bars */}
                        <div className="space-y-8">
                            <div className="flex gap-2.5 h-6">
                                <div className="h-full rounded-2xl bg-[#50E3C2]" style={{ width: '58%' }} />
                                <div className="h-full rounded-2xl bg-[#FF9EBC]" style={{ width: '25%' }} />
                                <div className="h-full rounded-2xl bg-[#FFD66B]" style={{ width: '17%' }} />
                            </div>

                            <div className="space-y-4 px-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#50E3C2]" />
                                        <span className="text-[15px] font-medium text-gray-600 dark:text-gray-300">Invest</span>
                                    </div>
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-white">58%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF9EBC]" />
                                        <span className="text-[15px] font-medium text-gray-600 dark:text-gray-300">Healthcare</span>
                                    </div>
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-white">32%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFD66B]" />
                                        <span className="text-[15px] font-medium text-gray-600 dark:text-gray-300">Self Reward</span>
                                    </div>
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-white">24%</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activities - Sheet Style */}
                        <div className="bg-white dark:bg-gray-900 rounded-t-[40px] -mx-6 px-6 pt-10 pb-16 flex-1 shadow-[0_-12px_40px_rgba(0,0,0,0.03)] border-t border-gray-50/50 dark:border-gray-800/50 min-h-[500px]">
                            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto -mt-6 mb-8" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activities</h3>
                                <Link href="/transactions" className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                                    View All
                                </Link>
                            </div>

                            <TransactionList
                                transactions={recentTransactions}
                                onTransactionClick={handleTransactionClick}
                                loading={loading}
                                compact
                            />
                        </div>
                    </>
                )}
            </main>

            {/* Transaction Modal */}
            <TransactionModal
                transaction={selectedTransaction}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTransaction(null);
                }}
                onUpdate={handleTransactionUpdate}
            />
        </div>
    );
}

// Mock data generator for when Supabase is not configured
function generateMockTransactions(): Transaction[] {
    const categories = Object.keys(CATEGORIES);
    const sources = ['MTN_MoMo', 'Vodafone_Cash', 'Bank'];
    const descriptions = {
        'Food & Dining': ['Lunch at Papaye', 'Shoprite groceries', 'Coffee at Vida e Caffè', 'Uber Eats delivery'],
        'Transportation': ['Uber to Airport', 'Fuel at Shell', 'Bolt ride', 'Trotro fare'],
        'Shopping': ['Melcom purchase', 'Marina Mall shopping', 'Palace Mall', 'Online order'],
        'Utilities & Bills': ['ECG electricity', 'Ghana Water', 'Vodafone WiFi', 'MTN Data bundle'],
        'Entertainment': ['Netflix subscription', 'Silverbird Cinema', 'DSTV subscription', 'Spotify'],
        'Health': ['Pharmacy at Halm', 'Hospital visit', 'Gym membership', 'Health supplements'],
        'Income': ['Salary deposit', 'Freelance payment', 'Refund received', 'Gift from family'],
        'Transfers': ['Transfer to savings', 'Sent to Kofi', 'Family support'],
        'Cash Withdrawal': ['ATM Ecobank', 'Agent cashout'],
        'Church & Charity': ['Sunday offering', 'Donation to charity'],
        'Fees & Charges': ['Bank charge', 'MoMo fee', 'Transfer fee'],
    };

    const transactions: Transaction[] = [];
    let balance = 15000;

    for (let i = 0; i < 50; i++) {
        const isCredit = Math.random() > 0.75;
        const category = isCredit ? 'Income' : categories[Math.floor(Math.random() * (categories.length - 1))];
        const amount = isCredit
            ? Math.floor(Math.random() * 5000) + 500
            : Math.floor(Math.random() * 500) + 10;

        balance = isCredit ? balance + amount : balance - amount;

        const descList = descriptions[category as keyof typeof descriptions] || ['Transaction'];

        // Generate dates within last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const hoursAgo = Math.floor(Math.random() * 24);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);

        transactions.push({
            id: `mock-${i}`,
            transaction_date: date.toISOString(),
            amount,
            type: isCredit ? 'credit' : 'debit',
            source: sources[Math.floor(Math.random() * sources.length)],
            description: descList[Math.floor(Math.random() * descList.length)],
            balance,
            category,
            raw_sms: `${isCredit ? 'Credit' : 'Debit'} of GHS${amount.toFixed(2)} on your account. Balance: GHS${balance.toFixed(2)}`,
            created_at: new Date().toISOString(),
        });
    }

    return transactions.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
}
