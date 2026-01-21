import { supabase } from './supabase';

export type WalletType = 'bank' | 'momo' | 'cash' | 'other';

export interface Wallet {
    id: string;
    name: string;
    icon: string;
    type: WalletType;
    source_identifier: string | null;
    current_balance: number;
    initial_balance: number;
    is_active: boolean;
    created_at: string;
}

export interface Transaction {
    id: string;
    amount: number;
    description: string;
    source: string;
    wallet_id: string | null;
    created_at: string;
}

export const sourceToConfig: Record<string, { name: string; icon: string; type: WalletType; color: string }> = {
    'MTN_MoMo': { name: "MTN MoMo", icon: "💳", type: 'momo', color: "bg-yellow-50" },
    'Vodafone_Cash': { name: "Telecel Cash", icon: "📱", type: 'momo', color: "bg-red-50" },
    'GCBBank': { name: "GCB Bank", icon: "🏦", type: 'bank', color: "bg-blue-50" },
    'StanChart': { name: "Stanchart", icon: "🏦", type: 'bank', color: "bg-blue-100" },
    'UBAGHANA': { name: "UBA Ghana", icon: "🏦", type: 'bank', color: "bg-red-50" },
};

export function mapSourceToName(source: string): string {
    return sourceToConfig[source]?.name || `${source} Wallet`;
}

export function mapSourceToIcon(source: string): string {
    return sourceToConfig[source]?.icon || "💰";
}

export function mapSourceToType(source: string): WalletType {
    if (source.toLowerCase().includes('bank')) return 'bank';
    if (source.toLowerCase().includes('momo') || source.toLowerCase().includes('cash')) return 'momo';
    return 'other';
}

export async function createWalletFromTransaction(source: string, balance: number = 0) {
    const wallet = {
        name: mapSourceToName(source),
        icon: mapSourceToIcon(source),
        type: mapSourceToType(source),
        source_identifier: source,
        current_balance: balance,
        initial_balance: balance,
        is_active: true
    };

    const { data: newWallet, error: walletError } = await supabase
        .from('wallets')
        .insert(wallet)
        .select()
        .single();

    if (walletError) throw walletError;

    // Link all unlinked transactions from this source
    const { error: updateError } = await supabase
        .from('transactions')
        .update({ wallet_id: newWallet.id })
        .eq('source', source)
        .is('wallet_id', null);

    if (updateError) throw updateError;

    return newWallet;
}

export async function getUnmatchedSources() {
    const { data, error } = await supabase
        .from('transactions')
        .select('source')
        .is('wallet_id', null);

    if (error) return [];

    const counts: Record<string, number> = {};
    data.forEach(t => {
        counts[t.source] = (counts[t.source] || 0) + 1;
    });

    return Object.entries(counts).map(([source, count]) => ({
        source,
        count
    })).sort((a, b) => b.count - a.count);
}
