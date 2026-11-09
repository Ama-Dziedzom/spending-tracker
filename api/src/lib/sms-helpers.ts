/**
 * Helpers for routing parsed SMS to the right wallet and reading the
 * date a message was sent.
 */

export interface ProviderInfo {
  /** wallets.type */
  type: 'momo' | 'bank';
  /** wallets.source_identifier (MoMo wallets already use mtn / telecel / at) */
  identifier: string;
  /** Name used when LogIt creates the wallet automatically */
  name: string;
  color: string;
  /** Lower-case fragments used to match existing wallets by name */
  nameHints: string[];
}

/** Keyed by the `source` value the parser returns (see sms_patterns migration). */
export const PROVIDERS: Record<string, ProviderInfo> = {
  MTN_MoMo: { type: 'momo', identifier: 'mtn', name: 'MTN MoMo', color: '#FFCC00', nameHints: ['mtn'] },
  Vodafone_Cash: { type: 'momo', identifier: 'telecel', name: 'Telecel Cash', color: '#E30613', nameHints: ['telecel', 'vodafone'] },
  AirtelTigo_Money: { type: 'momo', identifier: 'at', name: 'AT Money', color: '#1642E5', nameHints: ['airteltigo', 'at money'] },
  StanChart: { type: 'bank', identifier: 'stanchart', name: 'Standard Chartered', color: '#6B7280', nameHints: ['stanchart', 'standard chartered', 'stan chart', 'scb'] },
  GCBBank: { type: 'bank', identifier: 'gcb', name: 'GCB Bank', color: '#6B7280', nameHints: ['gcb'] },
  UBAGHANA: { type: 'bank', identifier: 'uba', name: 'UBA', color: '#6B7280', nameHints: ['uba'] },
};

/**
 * For money moved between the user's own accounts: which provider is on the
 * other side, from the wording ("…Mine from SCB Standard Chartered Bank",
 * "…to MTN MoMo"). Returns a PROVIDERS key, never the message's own source.
 */
export function counterpartProvider(sms: string, ownSource: string): string | null {
  const text = sms.toLowerCase();
  let best: { key: string; at: number } | null = null;
  for (const [key, p] of Object.entries(PROVIDERS)) {
    if (key === ownSource) continue;
    for (const hint of p.nameHints) {
      const re = new RegExp(`\\b(?:from|to|via)\\s+(?:[a-z0-9]+\\s+){0,2}?${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const m = re.exec(text);
      if (m && (!best || m.index < best.at)) best = { key, at: m.index };
    }
  }
  return best?.key ?? null;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function fullYear(y: string): number {
  const n = parseInt(y, 10);
  return y.length === 2 ? 2000 + n : n;
}

/**
 * Best-effort extraction of when the transaction happened, from the SMS text.
 * Ghana is UTC+0, so dates are read as UTC. Returns null when no plausible
 * date is found (the caller then falls back to "now").
 */
export function extractSmsDate(sms: string, now: Date = new Date()): Date | null {
  let d: Date | null = null;

  // 2026-04-05 17:29:57  (MTN MoMo style)
  const iso = sms.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) {
    d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], iso[6] ? +iso[6] : 0));
  }

  // 2026-08-27 with no time (card alerts): midday, so the day is right in any view
  if (!d) {
    const isoDay = sms.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoDay) d = new Date(Date.UTC(+isoDay[1], +isoDay[2] - 1, +isoDay[3], 12, 0));
  }

  // 05-APR-26 / 05 Apr 2026 [at 17:29]  (bank style)
  if (!d) {
    const mon = sms.match(/\b(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/,]+(\d{2,4})(?:[^\d]{1,5}(\d{1,2}):(\d{2}))?/);
    if (mon && MONTHS[mon[2].toLowerCase()] !== undefined) {
      d = new Date(Date.UTC(fullYear(mon[3]), MONTHS[mon[2].toLowerCase()], +mon[1], mon[4] ? +mon[4] : 12, mon[5] ? +mon[5] : 0));
    }
  }

  // 05/04/2026 [17:29]  (day first, as written in Ghana)
  if (!d) {
    const dmy = sms.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[^\d]{1,5}(\d{1,2}):(\d{2}))?/);
    if (dmy) {
      d = new Date(Date.UTC(fullYear(dmy[3]), +dmy[2] - 1, +dmy[1], dmy[4] ? +dmy[4] : 12, dmy[5] ? +dmy[5] : 0));
    }
  }

  if (!d || isNaN(d.getTime())) return null;

  // Reject anything implausible (future, or more than ~13 months old)
  const oneDay = 24 * 60 * 60 * 1000;
  if (d.getTime() > now.getTime() + oneDay) return null;
  if (d.getTime() < now.getTime() - 400 * oneDay) return null;
  return d;
}

/**
 * Charges the provider took on top of the amount: "Fee charged: GHS3.00",
 * "Fee was GHS 0.50", "TRANSACTION FEE: 1.00", plus "Tax was GHS 0.15" / E-levy.
 * Returns the total, or 0 when there is none.
 */
export function extractFee(sms: string): number {
  const num = (s: string | undefined) => (s ? parseFloat(s.replace(/,/g, '')) || 0 : 0);
  const fee = sms.match(/\b(?:fee charged|fee was|transaction fee|access fee|cash-?out fee)(?:\s+(?:of|is|was))?\s*:?\s*(?:GHS|GH₵|GHC)?\s?([\d,]+(?:\.\d+)?)/i);
  const tax = sms.match(/\b(?:tax(?: was| charged)?|e-?levy(?: charged)?)\s*:?\s*(?:GHS|GH₵|GHC)\s?([\d,]+(?:\.\d+)?)/i);
  const total = num(fee?.[1]) + num(tax?.[1]);
  return Math.round(total * 100) / 100;
}

/** The provider's own transaction number, e.g. "Financial Transaction Id: 92977942993". */
export function extractProviderTxnId(sms: string): string | null {
  const m = sms.match(/\b(?:financial\s+)?trans(?:action)?\.?\s*id\s*:?\s*(\d{8,15})\b/i);
  return m ? m[1] : null;
}
