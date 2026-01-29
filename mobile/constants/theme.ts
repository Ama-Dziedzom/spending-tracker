export const COLORS = {
  primary: '#1642E5',
  primaryLight: '#DAE2FF',
  success: '#10B981',
  error: '#F43F5E',
  warning: '#F59E0B',
  text: {
    primary: '#0F172A', // slate-900
    secondary: '#64748B', // slate-500
    muted: '#94A3B8', // slate-400
  },
  background: {
    main: '#FFFFFF',
    secondary: '#F8FAFF',
  },
  border: {
    light: '#F1F1F1',
    medium: '#EDEDED',
  }
};

export const WALLET_TYPES = {
  MOMO: 'momo',
  BANK: 'bank',
  CASH: 'cash',
  OTHER: 'other',
} as const;

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;
