import tokens from './tokens.json';
import type { TextStyle, ViewStyle } from 'react-native';

// ============================================================================
// LogIt v1 design tokens — docs/design-handoff.md §3–4
// Colours live in tokens.json (exported from Figma). Read them in components
// through useTheme() from '@/lib/theme', or Tailwind classes such as
// `bg-bg-surface` / `text-text-secondary`. Never hard-code hex in components.
// ============================================================================

export type ColorScheme = 'light' | 'dark';
type TokenName = keyof typeof tokens.light;

type Nest<T extends string> = {
  [G in T extends `${infer A}/${string}` ? A : never]: {
    [N in T extends `${G}/${infer B}` ? B : never]: string;
  };
};
/** theme.colors.text.secondary, theme.colors.cat['food-tint'], … */
export type Palette = Nest<TokenName>;

function nest(flat: Record<string, string>): Palette {
  const out: Record<string, Record<string, string>> = {};
  for (const [token, hex] of Object.entries(flat)) {
    const [group, name] = token.split('/');
    (out[group] ??= {})[name] = hex;
  }
  return out as Palette;
}

export const PALETTE: Record<ColorScheme, Palette> = {
  light: nest(tokens.light),
  dark: nest(tokens.dark),
};

/**
 * The only colours the design leaves untokenised (handoff §3, §12.4).
 * The MTN network dot is added when the Wallets screen is built (value from Figma).
 */
export const RAW = {
  onBand: '#FFFFFF', // text on the blue band, at 100 / 85 / 75 %
  onBandSecondary: 'rgba(255,255,255,0.85)',
  onBandTertiary: 'rgba(255,255,255,0.75)',
  /** Round buttons and pills sitting on the band. */
  onBandFill: 'rgba(255,255,255,0.16)',
  /** Welcome: the incoming-alert bubble on the band (Figma 1000:77), and its label and text. */
  onBandBubble: 'rgba(255,255,255,0.14)',
  /** Change chip on the band ("+GHS 17", Figma 1022:4657). */
  onBandChip: 'rgba(255,255,255,0.18)',
  onBandBubbleLabel: 'rgba(255,255,255,0.7)',
  onBandBubbleText: 'rgba(255,255,255,0.92)',
  /** Icon circle inside a toast (white at 14 % on bg/inverse). */
  onInverseFill: 'rgba(255,255,255,0.14)',
  bandEllipses: ['#8FA8FF', '#6B5BFF', '#0B2493'] as const, // at 40–45 % opacity
  toastUndo: '#9DB4FF',
  /** Initials avatar artwork (Figma "LogIt / Avatar" 989:63). Same in both modes. */
  /** Mobile network dots next to a phone number (handoff §12.4, not tokenised). */
  networkDot: { MTN: '#FFCC00', Telecel: '#E30613', AT: '#1642E5' } as const,
  avatarInitialsBg: '#FFCC00',
  avatarInitialsInk: '#081750',
} as const;

/** Category keys, matching the cat/* tokens. */
export type CategoryColor =
  | 'people' | 'food' | 'shopping' | 'airtime' | 'bills' | 'transport'
  | 'cash' | 'fees' | 'loans' | 'subscription';

export const FONT = {
  medium: 'Manrope-Medium',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extrabold: 'Manrope-ExtraBold',
} as const;

/** Type roles from the Figma "Type" frame (999:216). Colour is applied separately. */
export const TYPE = {
  hero: { fontFamily: FONT.extrabold, fontSize: 36, letterSpacing: -36 * 0.03 },
  screenTitle: { fontFamily: FONT.bold, fontSize: 24, letterSpacing: -24 * 0.02 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 17 },
  row: { fontFamily: FONT.semibold, fontSize: 14 },
  body: { fontFamily: FONT.medium, fontSize: 14 },
  answer: { fontFamily: FONT.medium, fontSize: 15, lineHeight: 15 * 1.45 },
  meta: { fontFamily: FONT.medium, fontSize: 12 },
  sectionLabel: { fontFamily: FONT.bold, fontSize: 11, letterSpacing: 11 * 0.06, textTransform: 'uppercase' },
  tabLabel: { fontFamily: FONT.semibold, fontSize: 11 },
} satisfies Record<string, TextStyle>;

export const SPACE = {
  gutter: 16,
  cardPadding: 16,
  cardGap: 12,
} as const;

export const RADIUS = {
  card: 24,
  pill: 999,
  sheet: 32,
  /** Category tiles: ≈32 % of their size. */
  tile: (size: number) => Math.round(size * 0.32),
} as const;

export const ICON_SIZE = { sm: 16, md: 18, lg: 20, xl: 24 } as const;
export const ICON_STROKE = 1.5;

/** 44×44 minimum touch target; round header buttons are 38px, so pad by 3. */
export const HIT_SLOP = { top: 3, bottom: 3, left: 3, right: 3 } as const;

/** Card shadow: light mode only. Dark mode relies on the surface colour step. */
export function cardShadow(scheme: ColorScheme): ViewStyle {
  return shadows(scheme).card;
}

/**
 * Shadow presets from Figma. Light mode only; dark mode drops them (handoff §4).
 * Shadow colour is text/primary (ink) in light mode; the FAB glows in brand/accent.
 * RN has no spread, so radius ≈ blur / 2.
 */
export function shadows(scheme: ColorScheme) {
  const none: ViewStyle = {};
  if (scheme === 'dark') {
    return { card: none, small: none, toast: none, tabBar: none, fab: none, bubble: none };
  }
  const ink = PALETTE.light.text.primary;
  const s = (y: number, blur: number, opacity: number, color = ink): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation: Math.max(1, Math.round(y / 2)),
  });
  return {
    card: s(10, 30, 0.08), // 0 10 30 −6
    small: s(1, 3, 0.1), // segmented thumb, shortcut chips
    toast: s(12, 28, 0.22),
    tabBar: s(8, 24, 0.1),
    fab: s(8, 20, 0.35, PALETTE.light.brand.accent),
    bubble: s(6, 18, 0.1),
  };
}

// ============================================================================
// Legacy colours (pre-v1). Remove once every screen is on useTheme().
// ============================================================================

/** @deprecated Use useTheme().colors from '@/lib/theme'. */
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
