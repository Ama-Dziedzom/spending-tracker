'use client';

import { Transaction } from '@/types/transactions';
import { cn } from '@/lib/utils';
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
import { formatShortDate } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, any> = {
    'Groceries': ShoppingBag,
    'Transport': Car,
    'Entertainment': Film,
    'Rent & Utilities': Home,
    'Shopping': ShoppingBag,
    'Health': HeartPulse,
    'Income': ArrowDownLeft,
    'Other': Receipt,
};

interface TransactionItemProps {
    transaction: Transaction;
    onClick?: () => void;
    compact?: boolean;
}

export default function TransactionItem({ transaction, onClick, compact = false }: TransactionItemProps) {
    const isCredit = transaction.type === 'credit';
    const IconComponent = CATEGORY_ICONS[transaction.category] || CATEGORY_ICONS['Other'];

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 py-3 px-2 active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors cursor-pointer rounded-[20px]"
        >
            {/* Rounded Icon with specific styling */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-zinc-50 dark:border-zinc-900 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 shadow-sm overflow-hidden">
                {/* Mocking the avatar style from image for some transactions */}
                {transaction.description === 'Fresh Bakery' || transaction.description === 'Supermart Groceries' ? (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-orange-600" />
                    </div>
                ) : (
                    <IconComponent className="w-6 h-6 text-zinc-900 dark:text-white" />
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] text-zinc-900 dark:text-white truncate">
                    {transaction.description || 'Transaction'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[13px] text-zinc-400 font-medium">
                        {formatShortDate(transaction.transaction_date)}
                    </p>
                    {transaction.source && (
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-zinc-300" />
                            <p className="text-[13px] text-zinc-400 font-medium">
                                {transaction.source.includes('MTN') ? 'MoMo' : 'Card ••••1234'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
                <p
                    className={cn(
                        'font-bold text-[16px]',
                        'text-zinc-900 dark:text-white'
                    )}
                >
                    GH₵{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
}
