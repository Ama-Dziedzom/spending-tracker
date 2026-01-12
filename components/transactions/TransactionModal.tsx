'use client';

import { useState, useEffect } from 'react';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { formatCurrency, formatFriendlyDate, formatShortDate } from '@/lib/utils';
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
    const [showRawSms, setShowRawSms] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Reset state when transaction changes
    useEffect(() => {
        if (transaction) {
            setSelectedCategory(transaction.category);
            setSaveSuccess(false);
        }
    }, [transaction]);

    if (!isOpen || !transaction) return null;

    const isCredit = transaction.type === 'credit';
    const category = CATEGORIES[selectedCategory] || CATEGORIES['Other'];
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

        // Show success feedback
        setSaveSuccess(true);
        onUpdate?.({ ...transaction, category: selectedCategory });

        // Close after brief delay to show success
        setTimeout(() => {
            setSaving(false);
            onClose();
        }, 500);
    };

    const getSourceIcon = (source: string) => {
        switch (source.toLowerCase()) {
            case 'mtn_momo':
            case 'vodafone_cash':
            case 'airteltigo_money':
                return <Wallet className="w-4 h-4" />;
            case 'bank':
                return <Building2 className="w-4 h-4" />;
            default:
                return <CreditCard className="w-4 h-4" />;
        }
    };

    const getSourceColor = (source: string) => {
        switch (source.toLowerCase()) {
            case 'mtn_momo':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
            case 'vodafone_cash':
                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
            case 'bank':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            default:
                return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                {/* Header with visual indicator */}
                <div className="p-6 flex flex-col items-center gap-4">
                    <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-2" />

                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md ${isCredit ? 'bg-[#50E3C2]' : 'bg-[#FF4B4B]'}`}>
                        {isCredit ? (
                            <Wallet className="w-10 h-10 text-white" />
                        ) : (
                            <CreditCard className="w-10 h-10 text-white" />
                        )}
                    </div>

                    <div className="text-center">
                        <p className="text-sm font-medium text-gray-400">Transaction Amount</p>
                        <p className={`text-[36px] font-bold ${isCredit ? 'text-[#50E3C2]' : 'text-[#FF4B4B]'}`}>
                            {isCredit ? '+' : '-'}GH₵{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Info List & Category Selector */}
                <div className="px-8 pb-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                            <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                                {isCredit ? 'Received' : 'Success'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
                            <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                                {formatFriendlyDate(transaction.transaction_date)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Description</p>
                        <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-relaxed">
                            {transaction.description || 'No description available'}
                        </p>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Change Category</p>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(CATEGORIES).map(([key, cat]) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedCategory(key)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedCategory === key
                                        ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
                                        : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{cat.name}</span>
                                    {selectedCategory === key && <Check className="w-3.5 h-3.5 ml-auto text-black dark:text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {showRawSms && (
                        <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider tracking-widest">Metadata</p>
                            <p className="text-[12px] font-mono text-gray-500 break-all leading-relaxed">
                                {transaction.raw_sms}
                            </p>
                        </div>
                    )}

                    <div className="pt-4 sticky bottom-0 bg-white dark:bg-gray-900">
                        {hasChanges ? (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {saveSuccess ? 'Saved!' : 'Update Category'}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:opacity-90 transition-opacity"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

}
