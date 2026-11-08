/**
 * Phone numbers for sign up / log in.
 *
 * Everyone is stored as E.164 (+233244123456), however they typed it:
 * "024 412 3456", "24 412 3456", "+233 24 412 3456" and "233244123456" are all
 * the same person. Mixing formats would create duplicate accounts.
 */

export type GhanaNetwork = 'MTN' | 'Telecel' | 'AT';

const GHANA_PREFIXES: Record<string, GhanaNetwork> = {
    '24': 'MTN', '25': 'MTN', '53': 'MTN', '54': 'MTN', '55': 'MTN', '59': 'MTN',
    '20': 'Telecel', '50': 'Telecel',
    '26': 'AT', '27': 'AT', '56': 'AT', '57': 'AT',
};

/** Returns +<country><number>, or null if it can't be a real number. */
export function toE164(raw: string, countryCode = '+233'): string | null {
    const cc = countryCode.replace(/\D/g, '');
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (raw.trim().startsWith('+') || digits.startsWith('00')) {
        digits = digits.replace(/^00/, '');
        return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    }
    if (digits.startsWith(cc) && digits.length > cc.length + 6) digits = digits.slice(cc.length);
    digits = digits.replace(/^0+/, '');

    if (cc === '233') {
        // Ghana mobile: 9 digits after the country code, on a known network
        if (digits.length !== 9 || !GHANA_PREFIXES[digits.slice(0, 2)]) return null;
    } else if (digits.length < 6 || digits.length > 12) {
        return null;
    }
    return `+${cc}${digits}`;
}

export function ghanaNetwork(e164: string | null | undefined): GhanaNetwork | null {
    if (!e164 || !e164.startsWith('+233')) return null;
    return GHANA_PREFIXES[e164.slice(4, 6)] ?? null;
}

/** +233244123456 → "+233 24 412 3456" */
export function formatPhone(e164: string | null | undefined): string {
    if (!e164) return '';
    const p = e164.startsWith('+') ? e164 : `+${e164}`;
    const m = p.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
    return m ? `+233 ${m[1]} ${m[2]} ${m[3]}` : p;
}

/** Friendlier wording for the errors Supabase returns on phone sign-in. */
export function phoneAuthMessage(error: string | undefined): string {
    const e = (error ?? '').toLowerCase();
    if (e.includes('signups not allowed') || e.includes('user not found')) {
        return 'No LogIt account uses this number yet. Sign up with it, or log in with email.';
    }
    if (e.includes('already') && e.includes('registered')) return 'Another LogIt account already uses this number.';
    if (e.includes('rate') || e.includes('seconds')) return 'Please wait a minute before asking for another code.';
    if (e.includes('expired') || e.includes('invalid')) return 'That code didn’t work or has expired. Ask for a new one.';
    if (e.includes('provider') || e.includes('sms')) return 'We couldn’t send a text right now. Please try again shortly.';
    return error || 'Something went wrong. Please try again.';
}
