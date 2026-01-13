'use client';

import { CURRENCY_SYMBOL } from '@/types/transactions';

interface BudgetOverviewProps {
    monthlyIncome: number;
    totalSpent: number;
}

export default function BudgetOverview({ monthlyIncome, totalSpent }: BudgetOverviewProps) {
    return (
        <section>
            <div className="space-y-6 bg-[#FAFAFA] dark:bg-zinc-900/40 rounded-3xl p-10 border border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <p className="text-[14px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Budget</p>
                        <p className="text-[20px] font-bold text-zinc-900 dark:text-white leading-none tracking-tight">
                            {CURRENCY_SYMBOL} {monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="space-y-2 text-right">
                        <p className="text-[14px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Spent</p>
                        <p className="text-[20px] font-bold text-zinc-400 dark:text-zinc-500 leading-none tracking-tight">
                            {CURRENCY_SYMBOL} {totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                <div className="pt-2">
                    <div className="h-[22px] bg-[#E2E2E2] dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#71717A] dark:bg-zinc-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((totalSpent / monthlyIncome) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
