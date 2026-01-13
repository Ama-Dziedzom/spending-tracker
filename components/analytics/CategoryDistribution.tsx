'use client';

import { ShoppingBag, Car, Film, Home } from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/types/transactions';

interface CategoryDistributionProps {
    categorySpending: Record<string, number>;
}

export default function CategoryDistribution({ categorySpending }: CategoryDistributionProps) {
    const categories = [
        { name: 'Groceries', icon: ShoppingBag, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
        { name: 'Transport', icon: Car, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
        { name: 'Entertainment', icon: Film, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
        { name: 'Rent & Utilities', icon: Home, color: 'text-orange-500', bgColor: 'bg-orange-500/10' }
    ];

    return (
        <div className="grid grid-cols-2 gap-4">
            {categories.map((cat, idx) => (
                <div key={idx} className="p-4 rounded-3xl border border-zinc-50 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className={`${cat.bgColor} ${cat.color} p-1.5 rounded-lg`}>
                            <cat.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-zinc-500">{cat.name}</span>
                    </div>
                    <p className="text-lg font-bold">
                        <span className="text-sm mr-0.5">{CURRENCY_SYMBOL}</span>
                        {(categorySpending[cat.name] || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            ))}
        </div>
    );
}
