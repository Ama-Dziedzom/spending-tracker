'use client';

import { Transaction, CURRENCY_SYMBOL } from '@/types/transactions';
import { cn, formatShortDate } from '@/lib/utils';
import {
    ShoppingBag,
    Car,
    Film,
    Home,
    ArrowDownLeft,
    Receipt,
    Wallet,
    HeartPulse,
    User,
    CreditCard
} from 'lucide-react';

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
    'Groceries': { icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-100' },
    'Transport': { icon: Car, color: 'text-blue-600', bg: 'bg-blue-100' },
    'Entertainment': { icon: Film, color: 'text-purple-600', bg: 'bg-purple-100' },
    'Rent & Utilities': { icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    'Shopping': { icon: ShoppingBag, color: 'text-pink-600', bg: 'bg-pink-100' },
    'Health': { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100' },
    'Income': { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-100' },
    'Other': { icon: Receipt, color: 'text-zinc-600', bg: 'bg-zinc-100' },
};


interface TransactionItemProps {
    transaction: Transaction;
    onClick?: () => void;
    compact?: boolean;
}

export default function TransactionItem({ transaction, onClick, compact = false }: TransactionItemProps) {
    const isCredit = transaction.type === 'credit';
    const config = CATEGORY_CONFIG[transaction.category] || CATEGORY_CONFIG['Other'];
    const IconComponent = config.icon;

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-6 py-8 px-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer border-b border-zinc-100/50 dark:border-zinc-800/50 last:border-none"
        >
            {/* Rounded Icon */}
            <div className={cn(
                "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 overflow-hidden ring-4 ring-white dark:ring-zinc-900 ring-offset-0",
                config.bg
            )}>
                <IconComponent className={cn("w-7 h-7", config.color)} />
            </div>

            {/* Details and Amount merged into one flex-1 container */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                    <p className="font-extrabold text-[17px] text-zinc-900 dark:text-white truncate tracking-tight">
                        {transaction.description || 'Transaction'}
                    </p>
                    <p className="font-black text-[17px] text-zinc-900 dark:text-white whitespace-nowrap">
                        {isCredit ? '+' : '-'}{CURRENCY_SYMBOL}{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[13px] text-zinc-400 font-bold uppercase tracking-wider">
                        {formatShortDate(transaction.transaction_date)}
                    </p>
                    {transaction.source && (
                        <p className="text-[13px] text-zinc-500 font-medium italic opacity-60">
                            {transaction.source.includes('MTN') ? 'MoMo' : 'Bank Card'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
