'use client';

import TransactionList from '@/components/transactions/TransactionList';
import { Transaction } from '@/types/transactions';
import { History, ArrowRight } from 'lucide-react';

interface ActivitiesSectionProps {
    transactions: Transaction[];
    onTransactionClick: (transaction: Transaction) => void;
    loading: boolean;
}

export default function ActivitiesSection({
    transactions,
    onTransactionClick,
    loading
}: ActivitiesSectionProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                            Recent Activity
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Latest Transactions</p>
                    </div>
                </div>
                <button className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95">
                    View All
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="glass border border-white/40 dark:border-white/5 rounded-[40px] overflow-hidden premium-shadow">
                <TransactionList
                    transactions={transactions.slice(0, 8)}
                    onTransactionClick={onTransactionClick}
                    loading={loading}
                    compact
                />
            </div>
        </section>
    );
}
