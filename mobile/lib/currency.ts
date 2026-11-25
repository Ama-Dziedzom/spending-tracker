import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Countries and currencies (Figma "09 · Countries & currency").
 *
 * One currency per person, set with the country at sign up and changed in
 * Settings → Currency. Amounts are never converted. Reading alerts (autopilot),
 * e-levy and MoMo fee rules are Ghana-only for now; everywhere else people
 * paste or add by hand.
 */

export type CountryCode = 'GH' | 'NG' | 'KE' | 'CI' | 'SN' | 'CM' | 'UG' | 'RW' | 'ZM';

export interface Country {
    code: CountryCode;
    name: string;
    flag: string;
    /** Dialling code without the plus: "233". */
    dial: string;
    /** Digits after the dialling code for a mobile number. */
    digits: number;
    /** Placeholder and example in errors: "24 412 3456". */
    example: string;
    /** ISO 4217, stored on the account: "GHS", "XOF". */
    currency: string;
    /** What people write, shown in the app: "GHS", "FCFA". */
    label: string;
    /** "Cedi", "CFA franc" (sheet meta). */
    currencyName: string;
    /** Plural for sentences and screen readers: "cedis", "naira". */
    plural: string;
    /** 2 where coins are in use, 0 where they aren't (FCFA, UGX, RWF). */
    decimals: 0 | 2;
    /**
     * Roughly how many of this currency make one cedi. Only used to size
     * thresholds ("you kept a meaningful amount") and example amounts in
     * hints. Never used to convert anyone's money.
     */
    scale: number;
    momo: { id: string; name: string }[];
    banks: string;
    /** LogIt reads this country's SMS alerts (autopilot, e-levy, MoMo fees). */
    readsAlerts: boolean;
}

const COUNTRIES: Country[] = [
    {
        code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '233', digits: 9, example: '24 412 3456',
        currency: 'GHS', label: 'GHS', currencyName: 'Cedi', plural: 'cedis', decimals: 2, scale: 1,
        momo: [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'telecel', name: 'Telecel Cash' }, { id: 'at', name: 'AT Money' }],
        banks: 'GCB, Ecobank, Stanbic, Absa…', readsAlerts: true,
    },
    {
        code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '234', digits: 10, example: '803 123 4567',
        currency: 'NGN', label: 'NGN', currencyName: 'Naira', plural: 'naira', decimals: 2, scale: 100,
        momo: [{ id: 'opay', name: 'OPay' }, { id: 'moniepoint', name: 'Moniepoint' }, { id: 'palmpay', name: 'PalmPay' }, { id: 'mtn', name: 'MTN MoMo' }],
        banks: 'Access, GTBank, Zenith, First Bank…', readsAlerts: false,
    },
    {
        code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '254', digits: 9, example: '712 345 678',
        currency: 'KES', label: 'KES', currencyName: 'Shilling', plural: 'shillings', decimals: 2, scale: 10,
        momo: [{ id: 'mpesa', name: 'M-Pesa' }, { id: 'airtel', name: 'Airtel Money' }],
        banks: 'Equity, KCB, Co-op, NCBA…', readsAlerts: false,
    },
    {
        code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', dial: '225', digits: 10, example: '07 12 34 56 78',
        currency: 'XOF', label: 'FCFA', currencyName: 'CFA franc', plural: 'CFA francs', decimals: 0, scale: 50,
        momo: [{ id: 'orange', name: 'Orange Money' }, { id: 'mtn', name: 'MTN MoMo' }, { id: 'wave', name: 'Wave' }, { id: 'moov', name: 'Moov Money' }],
        banks: 'SGCI, Ecobank, NSIA, BICICI…', readsAlerts: false,
    },
    {
        code: 'SN', name: 'Senegal', flag: '🇸🇳', dial: '221', digits: 9, example: '77 123 45 67',
        currency: 'XOF', label: 'FCFA', currencyName: 'CFA franc', plural: 'CFA francs', decimals: 0, scale: 50,
        momo: [{ id: 'orange', name: 'Orange Money' }, { id: 'wave', name: 'Wave' }, { id: 'free', name: 'Free Money' }],
        banks: 'CBAO, SGBS, Ecobank, BOA…', readsAlerts: false,
    },
    {
        code: 'CM', name: 'Cameroon', flag: '🇨🇲', dial: '237', digits: 9, example: '6 71 23 45 67',
        currency: 'XAF', label: 'FCFA', currencyName: 'CFA franc', plural: 'CFA francs', decimals: 0, scale: 50,
        momo: [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'orange', name: 'Orange Money' }],
        banks: 'Afriland, SGC, Ecobank, UBA…', readsAlerts: false,
    },
    {
        code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '256', digits: 9, example: '772 123 456',
        currency: 'UGX', label: 'UGX', currencyName: 'Shilling', plural: 'shillings', decimals: 0, scale: 300,
        momo: [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'airtel', name: 'Airtel Money' }],
        banks: 'Stanbic, Centenary, dfcu, Absa…', readsAlerts: false,
    },
    {
        code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '250', digits: 9, example: '788 123 456',
        currency: 'RWF', label: 'RWF', currencyName: 'Franc', plural: 'francs', decimals: 0, scale: 100,
        momo: [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'airtel', name: 'Airtel Money' }],
        banks: 'Bank of Kigali, I&M, Equity, BPR…', readsAlerts: false,
    },
    {
        code: 'ZM', name: 'Zambia', flag: '🇿🇲', dial: '260', digits: 9, example: '97 123 4567',
        currency: 'ZMW', label: 'ZMW', currencyName: 'Kwacha', plural: 'kwacha', decimals: 2, scale: 2,
        momo: [{ id: 'mtn', name: 'MTN MoMo' }, { id: 'airtel', name: 'Airtel Money' }, { id: 'zamtel', name: 'Zamtel Kwacha' }],
        banks: 'Zanaco, Stanbic, FNB, Absa…', readsAlerts: false,
    },
];

/** Ghana first (most people), then A to Z: the order of the country sheet. */
export const ALL_COUNTRIES: readonly Country[] = COUNTRIES;

export const GHANA = COUNTRIES[0];

export function countryByCode(code: string | null | undefined): Country | null {
    return COUNTRIES.find((c) => c.code === code) ?? null;
}

/** "+234803…" → Nigeria. */
export function countryFromPhone(e164: string | null | undefined): Country | null {
    if (!e164) return null;
    const digits = e164.replace(/\D/g, '');
    return COUNTRIES.find((c) => digits.startsWith(c.dial)) ?? null;
}

// ---------------------------------------------------------------------------
// The person's country, read synchronously while drawing.
// ---------------------------------------------------------------------------

const STORE_KEY = 'logit_country';
let current: Country = GHANA;
const listeners = new Set<(c: Country) => void>();

/** The person's country (Ghana until told otherwise). */
export const cur = (): Country => current;
/** The label before amounts: "GHS", "NGN", "FCFA". */
export const curLabel = (): string => current.label;

/** A round example amount in this currency, from a cedi amount: ex(500) → "50,000" in NGN. */
export function ex(cedisAmount: number): string {
    const v = cedisAmount * current.scale;
    const step = v >= 10_000 ? 1000 : v >= 1000 ? 100 : v >= 100 ? 10 : 1;
    return (Math.round(v / step) * step).toLocaleString('en-US');
}

/** A threshold given in cedis, in this currency. */
export const scaled = (cedisAmount: number): number => cedisAmount * current.scale;

export function onCountryChange(fn: (c: Country) => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function use(c: Country) {
    if (c.code === current.code) return;
    current = c;
    for (const fn of listeners) fn(c);
}

/** At launch, before money is drawn: the country saved on this phone. */
export async function loadCountry(): Promise<Country> {
    const saved = countryByCode(await AsyncStorage.getItem(STORE_KEY).catch(() => null));
    if (saved) use(saved);
    return current;
}

/**
 * After sign-in: the account's country wins (it follows the person to a new
 * phone). Accounts from before countries existed use their phone's country,
 * which for everyone so far is Ghana.
 */
export function syncCountryFromUser(user: { user_metadata?: Record<string, unknown>; phone?: string | null } | null | undefined) {
    if (!user) return;
    const c = countryByCode(user.user_metadata?.country as string | undefined)
        ?? countryFromPhone(user.phone ? `+${user.phone.replace(/^\+/, '')}` : null)
        ?? GHANA;
    setLocalCountry(c);
}

/** Use a country on this phone right away (the account is saved separately). */
export function setLocalCountry(c: Country) {
    use(c);
    AsyncStorage.setItem(STORE_KEY, c.code).catch(() => {});
}

// ---------------------------------------------------------------------------
// Reading amounts in text people paste or say.
// ---------------------------------------------------------------------------

/** Currency marks that can sit before or after an amount in an alert, any country. */
export const CURRENCY_TOKENS = String.raw`(?:GHS|GH₵|GHC|GH¢|¢|₵|NGN|₦|KES|KSh|Ksh|UGX|USh|RWF|FRW|ZMW|XOF|XAF|F\s?CFA|CFA)`;
/** The same, as words people type or say in a question (lower case). */
export const CURRENCY_WORDS = String.raw`(?:ghs|gh₵|ghc|¢|cedis?|ngn|₦|naira|kes|ksh|shillings?|ugx|rwf|frw|zmw|kwacha|fcfa|cfa|xof|xaf|francs?)`;
