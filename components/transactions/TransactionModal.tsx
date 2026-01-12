'use client';

import { useState, useEffect } from 'react';
import { Transaction, CATEGORIES } from '@/types/transactions';
import { formatCurrency, formatFriendlyDate, formatShortDate } from '@/lib/utils';
import { X, Save, MessageSquare, Tag, Calendar, CreditCard, Wallet, Building2, Check } from 'lucide-react';
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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-lg md:w-full">
                <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-900 p-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Transaction Details
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {formatFriendlyDate(transaction.transaction_date)}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Amount Card */}
                        <div
                            className={`p-6 rounded-2xl ${isCredit
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                                    : 'bg-gradient-to-br from-rose-500 to-red-600'
                                }`}
                        >
                            <p className="text-white/80 text-sm font-medium mb-1">
                                {isCredit ? 'Money Received' : 'Money Spent'}
                            </p>
                            <p className="text-3xl font-bold text-white">
                                {isCredit ? '+' : '-'}GH₵{Math.abs(transaction.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-white/60 text-sm mt-2">
                                Balance after: GH₵{transaction.balance.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatShortDate(transaction.transaction_date)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className={`p-2 rounded-lg ${getSourceColor(transaction.source)}`}>
                                    {getSourceIcon(transaction.source)}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Source</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {transaction.source.replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {transaction.description || 'No description available'}
                            </p>
                        </div>

                        {/* Category Selector - This is the only editable field */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                <Tag className="w-4 h-4" />
                                Category
                                <span className="text-xs text-gray-500">(tap to change)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(key)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedCategory === key
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate text-left">
                                            {cat.name}
                                        </span>
                                        {selectedCategory === key && (
                                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Raw SMS */}
                        {transaction.raw_sms && (
                            <div>
                                <button
                                    onClick={() => setShowRawSms(!showRawSms)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    {showRawSms ? 'Hide' : 'Show'} Original SMS
                                </button>
                                {showRawSms && (
                                    <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <p className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                            {transaction.raw_sms}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Only show save button if category changed */}
                    <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-6 border-t border-gray-100 dark:border-gray-800">
                        {hasChanges ? (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`w-full flex items-center justify-center gap-2 py-4 font-semibold rounded-xl transition-all disabled:opacity-50 ${saveSuccess
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                                    }`}
                            >
                                {saveSuccess ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {saving ? 'Saving...' : 'Save Category'}
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
