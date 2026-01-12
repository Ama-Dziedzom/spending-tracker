'use client';

import { useState, useEffect } from 'react';
import { Transaction, CATEGORIES, CURRENCY_SYMBOL } from '@/types/transactions';
import { formatCurrency, formatFriendlyDate } from '@/lib/utils';
import { X, Save, MessageSquare, Tag, Calendar, CreditCard, Wallet, Building2, Check, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface TransactionModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (transaction: Transaction) => void;
}

export default function TransactionModal({
    transaction,
    isOpen,
    onClose,
    onUpdate,
}: TransactionModalProps) {
    const [selectedCategory, setSelectedCategory] = useState(transaction?.category || 'Other');
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (transaction) {
            setSelectedCategory(transaction.category);
            setSaveSuccess(false);
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const isCredit = transaction.type === 'credit';
    const hasChanges = selectedCategory !== transaction.category;

    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        setSaving(true);

        if (isSupabaseConfigured()) {
            try {
                const { error } = await supabase
                    .from('transactions')
                    .update({ category: selectedCategory })
                    .eq('id', transaction.id);

                if (error) throw error;
            } catch (error) {
                console.error('Error updating transaction:', error);
                setSaving(false);
                return;
            }
        }

        setSaveSuccess(true);
        onUpdate?.({ ...transaction, category: selectedCategory });

        setTimeout(() => {
            setSaving(false);
            onClose();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl animate-fade-in-up">
                <div className="p-8 pb-12 space-y-10">
                    {/* Visual bar for mobile drag feeling */}
                    <div className="w-12 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

                    {/* Header Info */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm transition-transform hover:scale-105 duration-300">
                            <CreditCard className="w-10 h-10 text-zinc-900 dark:text-white" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[17px] font-medium text-zinc-400">Transaction details</p>
                            <h2 className="text-[40px] font-bold tracking-tight">
                                <span className="text-[28px] align-top mr-1 font-semibold">{CURRENCY_SYMBOL}</span>
                                {Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>

                    {/* Details Table */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-8 border-t border-zinc-50 dark:border-zinc-900 pt-8">
                            <div className="space-y-1">
                                <p className="text-[14px] font-medium text-zinc-400">Date</p>
                                <p className="text-[16px] font-bold">{formatFriendlyDate(transaction.transaction_date)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[14px] font-medium text-zinc-400">Merchant/Source</p>
                                <p className="text-[16px] font-bold truncate">{transaction.description || 'Unknown'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[14px] font-medium text-zinc-400">Category</p>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(key)}
                                        className={`flex items-center gap-3 p-4 rounded-[20px] border transition-all active:scale-95 ${selectedCategory === key
                                            ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-black'
                                            : 'border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${selectedCategory === key ? 'bg-white dark:bg-black' : ''}`} style={selectedCategory !== key ? { backgroundColor: cat.color } : {}} />
                                        <span className="text-[14px] font-bold truncate">{cat.name}</span>
                                        {selectedCategory === key && <Check className="w-4 h-4 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full h-16 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${hasChanges
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg'
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}
                    >
                        {saving ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : saveSuccess ? (
                            <Check className="w-6 h-6" />
                        ) : hasChanges ? (
                            <>
                                <Save className="w-5 h-5" />
                                Save Changes
                            </>
                        ) : (
                            'Done'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
