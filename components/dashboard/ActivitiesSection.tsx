'use client';

import TransactionList from '@/components/transactions/TransactionList';
import { Transaction } from '@/types/transactions';

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
        <section>
            <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <h3 className="text-[30px] font-bold tracking-tighter text-black dark:text-white">Activities</h3>
                    <button className="text-[14px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-5 py-2.5 rounded-2xl transition-all active:scale-95">View all</button>
                </div>
                <TransactionList
                    transactions={transactions.slice(0, 10)}
                    onTransactionClick={onTransactionClick}
                    loading={loading}
                    compact
                />
            </div>
        </section>
    );
}
