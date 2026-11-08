/**
 * Reading alerts from banks and wallets LogIt has no pattern for yet.
 *
 * Two jobs:
 *  1. readUnknownSms(): a best-effort guess at what an unfamiliar alert says
 *     (amount, money in or out, balance, who/where, reference, provider).
 *     The guess is never logged automatically; it pre-fills the Check card so
 *     the user confirms it in a couple of taps.
 *  2. maskSms() / shapeOf(): turn an alert into a template with every
 *     personal detail replaced, e.g.
 *       "Payment of GHS {amt} to {name}. Current Balance: GHS {amt}. Ref {id}"
 *     Identical templates from different users group together, so a new
 *     pattern can be written once and switched on for everyone.
 */

import { createHash } from 'node:crypto';

export interface FallbackGuess {
  amount: number | null;
  /** debit = money out, credit = money in */
  direction: 'debit' | 'credit' | null;
  balance: number | null;
  counterparty: string | null;
  reference: string | null;
  provider: string | null;
  /** 0–1: how much of an alert's usual shape was found */
  confidence: number;
}

const AMOUNT = String.raw`(?:GHS|GH₵|GHC|GH¢|¢|₵)\s?([\d,]+(?:\.\d{1,2})?)`;
const AMOUNT_AFTER = String.raw`([\d,]+(?:\.\d{1,2})?)\s?(?:GHS|GH₵|GHC|cedis?)\b`;

const toNumber = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Known senders by the words their alerts use. Order matters: specific first. */
const PROVIDER_HINTS: Array<[RegExp, string]> = [
  [/\bmomoboost\b|\bmobile money\b.*\bmtn\b|\bmtn\b/i, 'MTN_MoMo'],
  [/\btelecel\b|\bvodafone cash\b/i, 'Vodafone_Cash'],
  [/\bat money\b|\bairteltigo\b/i, 'AirtelTigo_Money'],
  [/\bstanchart\b|\bstandard chartered\b|\bvisa prepaid\b/i, 'StanChart'],
  [/\bgcb\b/i, 'GCBBank'],
  [/\buba\b/i, 'UBAGHANA'],
  [/\becobank\b/i, 'Ecobank'],
  [/\bfidelity\b/i, 'Fidelity'],
  [/\babsa\b/i, 'Absa'],
  [/\bstanbic\b/i, 'Stanbic'],
  [/\bcalbank\b|\bcal bank\b/i, 'CalBank'],
  [/\bzenith\b/i, 'Zenith'],
  [/\baccess bank\b/i, 'AccessBank'],
  [/\bfirst ?bank\b/i, 'FirstBank'],
  [/\bprudential\b/i, 'Prudential'],
  [/\badb\b|\bagricultural development bank\b/i, 'ADB'],
  [/\brepublic bank\b/i, 'RepublicBank'],
  [/\bsociete generale\b|\bsg ghana\b/i, 'SocGen'],
  [/\bg-?money\b/i, 'GMoney'],
  [/\bzeepay\b/i, 'Zeepay'],
];

const CREDIT = /\b(received|credited|credit(?:ed)? to|deposit(?:ed)?|cash[- ]?in|refund(?:ed)?|reversal|reversed|transferred to you|has been paid to your)\b/i;
const DEBIT = /\b(sent|paid|payment (?:of|made|for)|debited|debit(?:ed)? (?:of|from)|cash[- ]?out|withdraw(?:n|al)?|purchase|bought|transfer(?:red)? to|charged|repaid|repayment)\b/i;

export function readUnknownSms(sms: string): FallbackGuess {
  const text = sms.replace(/\s+/g, ' ').trim();
  let confidence = 0;

  // Balance first, so it isn't mistaken for the transaction amount
  const balRe = new RegExp(String.raw`(?:available|current|new|ledger|actual)?\s*bal(?:ance)?\s*(?:is|:|of|=)?\s*${AMOUNT}`, 'i');
  const balMatch = text.match(balRe) ?? text.match(new RegExp(String.raw`bal(?:ance)?\s*(?:is|:|of|=)?\s*${AMOUNT_AFTER}`, 'i'));
  const balance = toNumber(balMatch?.[1]);
  const withoutBalance = balMatch ? text.replace(balMatch[0], ' ') : text;

  // Amount: first money figure that isn't the balance or a fee
  let amount: number | null = null;
  const moneyRe = new RegExp(`${AMOUNT}|${AMOUNT_AFTER}`, 'gi');
  for (const m of withoutBalance.matchAll(moneyRe)) {
    const before = withoutBalance.slice(Math.max(0, (m.index ?? 0) - 18), m.index).toLowerCase();
    if (/\b(fee|charge|levy|tax|e-levy)\b[^.]*$/.test(before)) continue;
    amount = toNumber(m[1] ?? m[2]);
    if (amount !== null) break;
  }
  if (amount !== null) confidence += 0.4;

  // Direction: whichever wording appears first wins ("received ... sent" is rare)
  const c = text.search(CREDIT), d = text.search(DEBIT);
  const direction: FallbackGuess['direction'] = c === -1 && d === -1 ? null : d === -1 || (c !== -1 && c < d) ? 'credit' : 'debit';
  if (direction) confidence += 0.25;
  if (balance !== null) confidence += 0.15;

  // Who or where: "to X", "from X", "at X"
  // Phone numbers end a name ("to AKOSUA MENSAH 0244123456 has been…")
  const forParty = text.replace(/(?:\+?233|\b0)[235]\d{8}\b/g, ',');
  const party = forParty.match(/\b(?:to|from|at|for)\s+([A-Z][A-Za-z0-9&.'\- ]{1,40}?)(?=\s*(?:[.,;]|\bon\b|\bhas\b|\bis\b|\bref\b|\breference\b|\bcurrent\b|\bavailable\b|\byour\b|\bwith\b|\bfee\b|$))/);
  const counterparty = party ? party[1].trim() : null;
  if (counterparty) confidence += 0.1;

  const ref = text.match(/\b(?:ref(?:erence)?|trans(?:action)?\.? ?id|txn ?id|financial transaction id)\s*(?:no\.?|number|:|#)?\s*([A-Z0-9-]{5,})/i);
  const reference = ref ? ref[1] : null;
  if (reference) confidence += 0.1;

  const provider = PROVIDER_HINTS.find(([re]) => re.test(text))?.[1] ?? null;

  return { amount, direction, balance, counterparty, reference, provider, confidence: Math.min(1, +confidence.toFixed(2)) };
}

/**
 * Replace everything personal with placeholders. What's left is the
 * provider's wording, which is what a pattern needs and nothing more.
 */
export function maskSms(sms: string): string {
  let s = sms.replace(/\s+/g, ' ').trim();
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '{email}');
  s = s.replace(/https?:\/\/\S+/gi, '{link}');
  // Money (before generic numbers, so the shape keeps its currency)
  s = s.replace(new RegExp(AMOUNT, 'gi'), (m) => m.replace(/[\d,]+(?:\.\d{1,2})?/, '{amt}'));
  s = s.replace(new RegExp(AMOUNT_AFTER, 'gi'), (m) => m.replace(/[\d,]+(?:\.\d{1,2})?/, '{amt}'));
  // Dates and times
  s = s.replace(/\b\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?/g, '{date}');
  s = s.replace(/\b\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3,9})[-/.]\d{2,4}\b/g, '{date}');
  s = s.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm)?\b/gi, '{time}');
  // Phone numbers, then masked card/account numbers (e.g. 4123XXXX1234, ****1234)
  s = s.replace(/(?:\+?233|\b0)[235]\d{8}\b/g, '{phone}');
  s = s.replace(/[*Xx]{2,}\d{2,6}|\d{2,6}[*Xx]{2,}\d{0,6}/g, '{acct}');
  // Names: after the words that introduce a person
  s = s.replace(/\b(Dear|Hello|Hi|to|from|by|sender|recipient|name)(:?)\s+(?:[A-Z][A-Za-z'.-]*\.?\s?){1,4}/g, (_m, w, colon) => `${w}${colon} {name} `);
  // Anything numeric that's left: references, ids
  s = s.replace(/\b[A-Z]*\d[A-Z\d-]{3,}\b/gi, '{id}');
  s = s.replace(/\b\d+\b/g, '{n}');
  return s.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

/** Same wording → same shape, whatever the details. */
export function shapeOf(template: string): string {
  const key = template.toLowerCase().replace(/\{(?:amt|n|id|date|time|name|phone|acct|email|link)\}/g, '#').replace(/[^a-z#]+/g, ' ').trim();
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}
