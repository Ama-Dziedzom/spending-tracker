'use client';

import { PieChart } from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface SpendingSummaryProps {
    totalSpending: number;
}

export default function SpendingSummary({ totalSpending }: SpendingSummaryProps) {
    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <p className="text-[17px] font-medium text-zinc-400">Total spending</p>
                    <h2 className="text-[44px] font-bold tracking-tight leading-none">
                        <span className="text-[32px] align-top mr-1">{CURRENCY_SYMBOL}</span>
                        {totalSpending.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </h2>
                </div>
                <button className="w-12 h-12 rounded-full border border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                    <PieChart className="w-6 h-6 text-zinc-900 dark:text-white" />
                </button>
            </div>

            {/* Segmented Bar Chart */}
            <div className="h-4 flex gap-1 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: '40%' }} />
                <div className="h-full bg-sky-500" style={{ width: '25%' }} />
                <div className="h-full bg-emerald-500" style={{ width: '20%' }} />
                <div className="h-full bg-orange-500" style={{ width: '15%' }} />
            </div>
        </div>
    );
}
