'use client';

import { ShoppingBag, Car, Film, Home, ChevronRight } from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface CategoryDistributionProps {
    categorySpending: Record<string, number>;
}

export default function CategoryDistribution({ categorySpending }: CategoryDistributionProps) {
    const categories = [
        { name: 'Groceries', icon: ShoppingBag, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-500/10', borderColor: 'border-purple-200/50 dark:border-purple-500/20' },
        { name: 'Transport', icon: Car, color: 'text-sky-500', bgColor: 'bg-sky-100 dark:bg-sky-500/10', borderColor: 'border-sky-200/50 dark:border-sky-500/20' },
        { name: 'Entertainment', icon: Film, color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-500/10', borderColor: 'border-emerald-200/50 dark:border-emerald-500/20' },
        { name: 'Rent & Utilities', icon: Home, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-500/10', borderColor: 'border-orange-200/50 dark:border-orange-500/20' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">Top Categories</h3>
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Monthly Average</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
                {categories.map((cat, idx) => (
                    <div
                        key={idx}
                        className={`group p-6 rounded-[32px] glass border ${cat.borderColor} hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300 active:scale-[0.98] premium-shadow`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`${cat.bgColor} ${cat.color} p-3 rounded-[20px] transition-transform group-hover:scale-110 shadow-sm`}>
                                <cat.icon className="w-5 h-5" />
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">
                                {cat.name}
                            </span>
                            <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                <span className="text-sm font-bold mr-0.5 text-zinc-400">{CURRENCY_SYMBOL}</span>
                                {(categorySpending[cat.name] || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
