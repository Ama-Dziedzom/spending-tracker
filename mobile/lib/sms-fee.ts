/**
 * Fees + tax/E-levy an alert says the provider took on top of the amount.
 * Same rules as the API's extractFee (api/src/lib/sms-helpers.ts) — keep them in step.
 * "charged GHS 50" on its own is the amount, not a fee, so it isn't matched.
 */
const CUR = String.raw`(?:GHS|GH₵|GHC|GH¢|¢|₵)`;
const FEE_LABEL = String.raw`(?:fee charged|fee was|(?:transaction|access|cash-?out|transfer|service|processing|sms|bank) (?:fees?|charges?)|fees?|charges?|commission|cot)`;
const TAX_LABEL = String.raw`(?:tax(?: was| charged)?|e-?levy(?: charged| was)?|levy)`;

function sumLabelled(sms: string, label: string): number {
    const re = new RegExp(String.raw`\b${label}\b(?:\s+(?:of|is|was|amount))?\s*[:=]?\s*${CUR}?\s?([\d,]+(?:\.\d+)?)(?!\d)`, 'gi');
    let total = 0;
    for (const m of sms.matchAll(re)) {
        const digits = m[1].replace(/,/g, '');
        if (digits.split('.')[0].length > 6) continue; // a phone/account number, not money
        total += parseFloat(digits) || 0;
    }
    return total;
}

export function extractFee(sms: string): number {
    const total = sumLabelled(sms, FEE_LABEL) + sumLabelled(sms, TAX_LABEL);
    return Math.round(total * 100) / 100;
}
