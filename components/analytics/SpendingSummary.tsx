'use client';

import { PieChart, Info } from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface SpendingSummaryProps {
    totalSpending: number;
}

export default function SpendingSummary({ totalSpending }: SpendingSummaryProps) {
    return (
        <div className="space-y-6">
            <div className="glass border border-white/40 dark:border-white/5 rounded-[40px] p-10 premium-shadow">
                <div className="flex items-start justify-between mb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <p className="text-[12px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Total Spending</p>
                            <Info className="w-3 h-3 text-zinc-300" />
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
                            <span className="text-2xl align-top mr-1 font-extrabold text-indigo-500">{CURRENCY_SYMBOL}</span>
                            {totalSpending.toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                        </h2>
                    </div>
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-center">
                        <PieChart className="w-8 h-8 text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
                        <span>Category Mix</span>
                        <span className="text-indigo-500">Breakdown</span>
                    </div>
                    <div className="h-6 flex gap-1.5 rounded-2xl overflow-hidden p-1 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/30">
                        <div className="h-full bg-purple-500 rounded-lg shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-700 hover:scale-x-105" style={{ width: '40%' }} />
                        <div className="h-full bg-sky-500 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-700 hover:scale-x-105" style={{ width: '25%' }} />
                        <div className="h-full bg-emerald-500 rounded-lg shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-700 hover:scale-x-105" style={{ width: '20%' }} />
                        <div className="h-full bg-orange-500 rounded-lg shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-all duration-700 hover:scale-x-105" style={{ width: '15%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
