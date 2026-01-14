'use client';

import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface BudgetOverviewProps {
    monthlyIncome: number;
    totalSpent: number;
}

export default function BudgetOverview({ monthlyIncome, totalSpent }: BudgetOverviewProps) {
    const remaining = monthlyIncome - totalSpent;
    const percentage = Math.min((totalSpent / monthlyIncome) * 100, 100);

    return (
        <div className="relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/20 dark:group-hover:bg-indigo-500/30 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative glass border border-white/40 dark:border-white/5 rounded-[40px] p-8 space-y-8 premium-shadow">
                <div className="flex items-center justify-between">
                    <div className="p-4 rounded-3xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                        <p className="text-[13px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em] mb-1">Remaining Balance</p>
                        <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
                            {CURRENCY_SYMBOL}{remaining.toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ArrowDownLeft className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">Income</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-900 dark:text-white">
                            {CURRENCY_SYMBOL}{monthlyIncome.toLocaleString('en-GH')}
                        </p>
                    </div>
                    <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/5 border border-rose-100/50 dark:border-rose-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold text-rose-600/80 dark:text-rose-400/80 uppercase tracking-wider">Spent</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-900 dark:text-white">
                            {CURRENCY_SYMBOL}{totalSpent.toLocaleString('en-GH')}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Monthly Budget Usage</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full p-1 border border-zinc-200/50 dark:border-zinc-700/30 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out shadow-[0,0,10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
