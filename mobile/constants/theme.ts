export const COLORS = {
  primary: '#0F4CFF',
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

// ============================================================================
// App Configuration Constants
// ============================================================================

/**
 * Pagination and list limits
 */
export const LIMITS = {
  /** Default number of recent transactions to fetch */
  RECENT_TRANSACTIONS: 10,
  /** Number of transactions for initial dashboard view */
  DASHBOARD_TRANSACTIONS: 5,
  /** Default page size for infinite scroll */
  PAGE_SIZE: 20,
} as const;

/**
 * Analytics thresholds
 */
export const THRESHOLDS = {
  /** Amount considered high spending for alerts (GHS) */
  HIGH_SPENDING: 3000,
  /** Amount considered an anomaly in transaction patterns (GHS) */
  ANOMALY_AMOUNT: 500,
  /** Percentage change that triggers a category alert */
  CATEGORY_CHANGE_ALERT: 20,
} as const;

/**
 * Time period configurations
 */
export const PERIODS = {
  DAYS_IN_WEEK: 7,
  DAYS_IN_MONTH: 30,
  MONTHS_IN_YEAR: 12,
} as const;

/**
 * Currency and formatting
 */
export const CURRENCY = {
  CODE: 'GHS',
  SYMBOL: 'GH₵',
  LOCALE: 'en-US',
} as const;

/**
 * Analytics colors for category breakdown
 */
export const ANALYTICS_COLORS = [
  COLORS.primary,
  COLORS.error,
  COLORS.warning,
  COLORS.success,
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6B7280', // gray
] as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  /** Maximum wallet name length */
  WALLET_NAME_MAX: 100,
  /** Maximum balance value */
  MAX_BALANCE: 1000000000,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 6,
} as const;

/**
 * App version info
 */
export const APP_INFO = {
  VERSION: '1.0.0',
  BUILD: '42',
} as const;
