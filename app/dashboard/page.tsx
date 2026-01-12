'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Header from '@/components/layout/Header';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionModal from '@/components/transactions/TransactionModal';
import CategoryChart from '@/components/charts/CategoryChart';
import InsightsCard from '@/components/insights/InsightsCard';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency, getDateRange, formatDateRange, getRelativeTime } from '@/lib/utils';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    RefreshCw,
    Activity,
    Clock,
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
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
            setLastUpdated(new Date());
            setLoading(false);
            return;
        }

        try {
            // Fetch all transactions for insights comparison
            const { data: allData, error: allError } = await supabase
                .from('transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .limit(500);

            if (allError) throw allError;

            setAllTransactions(allData || []);
            filterTransactionsByDateRange(allData || []);
            setLastUpdated(new Date());
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

        const avgTransactionAmount = transactions.length > 0
            ? transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0) /
            Math.max(1, transactions.filter(t => t.type === 'debit').length)
            : 0;

        return { totalIncome, totalExpenses, currentBalance, avgTransactionAmount };
    }, [transactions, allTransactions]);

    const recentTransactions = transactions.slice(0, 8);
    const { start, end } = getDateRange(dateRange);

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

            <main className="px-6 space-y-8">
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
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <p className="text-sm font-medium text-gray-400">Planned Expenses</p>
                            <p className="text-[40px] font-bold text-gray-900 dark:text-white leading-tight">
                                ${loading ? '---' : stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Category Progress Bars */}
                        <div className="space-y-6">
                            <div className="flex gap-2 h-4">
                                <div className="h-full rounded-full bg-[#50E3C2]" style={{ width: '58%' }} />
                                <div className="h-full rounded-full bg-[#FF9EBC]" style={{ width: '20%' }} />
                                <div className="h-full rounded-full bg-[#FFD66B]" style={{ width: '15%' }} />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#50E3C2]" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invest</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">58%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF9EBC]" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Healthcare</span>
                                        <span className="text-xs text-gray-400 ml-auto"></span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">32%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFD66B]" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Self Reward</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">24%</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activities - Sheet Style */}
                        <div className="bg-white dark:bg-gray-900 rounded-t-[32px] -mx-6 px-6 pt-8 pb-12 flex-1 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] min-h-[400px]">
                            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto -mt-4 mb-6" />
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activities</h3>
                                <Link href="/transactions" className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
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
