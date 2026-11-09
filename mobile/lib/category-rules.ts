import { supabase } from './supabase';

/**
 * "Always use this for Shoprite" (Figma 1005:911). Rules live in
 * category_rules (supabase/migrations/20261109010000_category_rules.sql);
 * the API applies them to new alerts.
 */

/**
 * The description up to the first comma, lower-cased:
 * "Shoprite, Accra Mall" → "shoprite". Must match merchantKey() in
 * api/src/routes/process-sms.ts.
 */
export function merchantKey(description: string): string {
    return (description.split(',')[0] ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** "Shoprite" for the toggle label, keeping the original capitalisation. */
export function merchantLabel(description: string): string {
    return (description.split(',')[0] ?? '').trim().replace(/\s+/g, ' ');
}

export async function getRule(description: string): Promise<string | null> {
    const key = merchantKey(description);
    if (!key) return null;
    const { data, error } = await supabase.from('category_rules').select('category').eq('merchant', key).maybeSingle();
    if (error) {
        console.error('category_rules read failed (has the migration run?):', error.message);
        return null;
    }
    return data?.category ?? null;
}

/**
 * Save the rule and apply it to this merchant's earlier entries, so the
 * past and the future agree. Moves between your own wallets are left alone.
 * Returns false if the rule couldn't be saved.
 */
export async function saveRule(description: string, category: string, direction: 'out' | 'in'): Promise<boolean> {
    const key = merchantKey(description);
    if (!key) return false;
    const { error } = await supabase
        .from('category_rules')
        .upsert({ merchant: key, category, updated_at: new Date().toISOString() }, { onConflict: 'user_id,merchant' });
    if (error) {
        console.error('category_rules save failed (has the migration run?):', error.message);
        return false;
    }

    // "shoprite" or "shoprite, <anything>", case-insensitive. ILIKE wildcards in
    // the name match literally; the values are quoted for PostgREST's or().
    const pattern = key.replace(/[\\%_]/g, (c) => `\\${c}`);
    const quoted = (v: string) => `"${v.replace(/["\\]/g, (c) => `\\${c}`)}"`;
    const { error: updateError } = await supabase
        .from('transactions')
        .update({ category, updated_at: new Date().toISOString() })
        .or(`description.ilike.${quoted(pattern)},description.ilike.${quoted(`${pattern},%`)}`)
        .in('type', direction === 'out' ? ['expense', 'debit'] : ['income', 'credit'])
        .not('is_transfer', 'is', true);
    // The rule is saved either way; earlier entries can be fixed by hand.
    if (updateError) console.error('Applying rule to earlier entries failed:', updateError.message);
    return true;
}

export async function removeRule(description: string): Promise<boolean> {
    const key = merchantKey(description);
    if (!key) return false;
    const { error } = await supabase.from('category_rules').delete().eq('merchant', key);
    return !error;
}
