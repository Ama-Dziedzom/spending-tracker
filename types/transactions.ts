export interface Transaction {
    id: string;
    transaction_date: string;
    amount: number;
    type: 'debit' | 'credit';
    source: string;
    description: string;
    balance: number;
    category: string;
    raw_sms: string;
    created_at: string;
}

export interface TransactionFilters {
    type?: 'debit' | 'credit' | 'all';
    source?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: 'date' | 'amount';
    sortOrder?: 'asc' | 'desc';
}

export interface CategoryConfig {
    name: string;
    color: string;
    bgColor: string;
    textColor: string;
}

export const CATEGORIES: Record<string, CategoryConfig> = {
    'Church & Charity': {
        name: 'Church & Charity',
        color: '#8B5CF6',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
    },
    'Food & Dining': {
        name: 'Food & Dining',
        color: '#F97316',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
    },
    'Transportation': {
        name: 'Transportation',
        color: '#3B82F6',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
    },
    'Shopping': {
        name: 'Shopping',
        color: '#EC4899',
        bgColor: 'bg-pink-100 dark:bg-pink-900/30',
        textColor: 'text-pink-700 dark:text-pink-300',
    },
    'Utilities & Bills': {
        name: 'Utilities & Bills',
        color: '#EAB308',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-300',
    },
    'Entertainment': {
        name: 'Entertainment',
        color: '#22C55E',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
    },
    'Health': {
        name: 'Health',
        color: '#EF4444',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-300',
    },
    'Education': {
        name: 'Education',
        color: '#14B8A6',
        bgColor: 'bg-teal-100 dark:bg-teal-900/30',
        textColor: 'text-teal-700 dark:text-teal-300',
    },
    'Income': {
        name: 'Income',
        color: '#10B981',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-700 dark:text-emerald-300',
    },
    'Transfers': {
        name: 'Transfers',
        color: '#6B7280',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        textColor: 'text-gray-700 dark:text-gray-300',
    },
    'Cash Withdrawal': {
        name: 'Cash Withdrawal',
        color: '#6366F1',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        textColor: 'text-indigo-700 dark:text-indigo-300',
    },
    'Fees & Charges': {
        name: 'Fees & Charges',
        color: '#F43F5E',
        bgColor: 'bg-rose-100 dark:bg-rose-900/30',
        textColor: 'text-rose-700 dark:text-rose-300',
    },
    'Other': {
        name: 'Other',
        color: '#64748B',
        bgColor: 'bg-slate-100 dark:bg-slate-900/30',
        textColor: 'text-slate-700 dark:text-slate-300',
    },
};

export const SOURCES = [
    'MTN_MoMo',
    'Vodafone_Cash',
    'Bank',
    'AirtelTigo_Money',
    'Cash',
] as const;

export type Source = typeof SOURCES[number];
