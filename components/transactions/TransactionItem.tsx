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
            className="flex items-center gap-6 py-6 px-2 active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors cursor-pointer rounded-[28px]"
        >
            {/* Rounded Icon */}
            <div className={cn(
                "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm overflow-hidden",
                config.bg
            )}>
                <IconComponent className={cn("w-6 h-6", config.color)} />
            </div>

            {/* Details and Amount merged into one flex-1 container */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className="font-bold text-[16px] text-zinc-900 dark:text-white truncate">
                        {transaction.description || 'Transaction'}
                    </p>
                    <p className="font-bold text-[16px] text-zinc-900 dark:text-white">
                        {CURRENCY_SYMBOL}{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[13px] text-zinc-400 font-medium">
                        {formatShortDate(transaction.transaction_date)}
                    </p>
                    {transaction.source && (
                        <p className="text-[13px] text-zinc-400 font-medium">
                            {transaction.source.includes('MTN') ? 'MoMo' : 'Card •••• 1234'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
