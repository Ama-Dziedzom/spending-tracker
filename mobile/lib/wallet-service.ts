import { supabase, Wallet, requireAuth } from './supabase';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for validating wallet creation input
 */
export const CreateWalletSchema = z.object({
    name: z.string()
        .min(1, 'Wallet name is required')
        .max(100, 'Wallet name must be less than 100 characters')
        .trim(),
    type: z.enum(['bank', 'momo', 'cash', 'other']),
    icon: z.string().default('💰'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').default('#6B7280'),
    initial_balance: z.number()
        .min(0, 'Balance cannot be negative')
        .max(1000000000, 'Balance exceeds maximum allowed'),
    source_identifier: z.string().optional(),
    is_income_source: z.boolean().optional(),
});

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;

/**
 * Schema for validating wallet update input
 */
export const UpdateWalletSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    source_identifier: z.string().optional(),
    is_active: z.boolean().optional(),
});

export type UpdateWalletInput = z.infer<typeof UpdateWalletSchema>;

// ============================================================================
// Wallet Operations
// ============================================================================

/**
 * Create a new wallet for the authenticated user
 */
export async function createWallet(input: CreateWalletInput): Promise<Wallet | null> {
    try {
        // Validate input
        const validated = CreateWalletSchema.parse(input);

        // Get authenticated user
        const userId = await requireAuth();

        const { data, error } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                name: validated.name,
                type: validated.type,
                icon: validated.icon,
                color: validated.color,
                initial_balance: validated.initial_balance,
                current_balance: validated.initial_balance,
                source_identifier: validated.source_identifier,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating wallet:', error.message);
            return null;
        }

        return data;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error creating wallet:', error.issues);
        } else {
            console.error('Error creating wallet:', error);
        }
        return null;
    }
}

/**
 * Create multiple wallets at once for the authenticated user
 */
export async function createWallets(inputs: CreateWalletInput[]): Promise<Wallet[]> {
    try {
        // Get authenticated user
        const userId = await requireAuth();

        // Validate all inputs
        const validated = inputs.map(input => CreateWalletSchema.parse(input));

        const wallets = validated.map(input => ({
            user_id: userId,
            name: input.name,
            type: input.type,
            icon: input.icon,
            color: input.color,
            initial_balance: input.initial_balance,
            current_balance: input.initial_balance,
            source_identifier: input.source_identifier,
            is_active: true,
        }));

        const { data, error } = await supabase
            .from('wallets')
            .insert(wallets)
            .select();

        if (error) {
            console.error('Error creating wallets:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error creating wallets:', error.issues);
        } else {
            console.error('Error creating wallets:', error);
        }
        return [];
    }
}

/**
 * Get all active wallets for the authenticated user
 * RLS policy ensures only user's own wallets are returned
 */
export async function getWallets(): Promise<Wallet[]> {
    try {
        // Debug: Check current auth state
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[Wallets] Fetching wallets for user:', user?.id);

        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Wallets] Error fetching wallets:', error.message, error);
            return [];
        }

        console.log('[Wallets] Found wallets:', data?.length || 0, data?.map(w => ({ id: w.id, name: w.name, user_id: w.user_id })));
        return data || [];
    } catch (error) {
        console.error('[Wallets] Error fetching wallets:', error);
        return [];
    }
}

/**
 * Get a single wallet by ID
 * RLS policy ensures user can only access their own wallets
 */
export async function getWalletById(id: string): Promise<Wallet | null> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching wallet:', error.message);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return null;
    }
}

/**
 * Update wallet balance
 */
export async function updateWalletBalance(id: string, newBalance: number): Promise<boolean> {
    try {
        if (newBalance < 0) {
            console.error('Balance cannot be negative');
            return false;
        }

        const { error } = await supabase
            .from('wallets')
            .update({
                current_balance: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating wallet balance:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating wallet balance:', error);
        return false;
    }
}

/**
 * Update wallet details
 */
export async function updateWallet(id: string, updates: UpdateWalletInput): Promise<Wallet | null> {
    try {
        // Validate input
        const validated = UpdateWalletSchema.parse(updates);

        const { data, error } = await supabase
            .from('wallets')
            .update({
                ...validated,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating wallet:', error.message);
            return null;
        }

        return data;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error updating wallet:', error.issues);
        } else {
            console.error('Error updating wallet:', error);
        }
        return null;
    }
}

/**
 * Soft delete wallet (set is_active to false)
 */
export async function deleteWallet(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('wallets')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error deleting wallet:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting wallet:', error);
        return false;
    }
}

/**
 * Check if user has any wallets configured
 */
export async function hasWalletsConfigured(): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('wallets')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (error) {
            console.error('Error checking wallets:', error.message);
            return false;
        }

        return (count ?? 0) > 0;
    } catch (error) {
        console.error('Error checking wallets:', error);
        return false;
    }
}

/**
 * Get total balance across all wallets for the authenticated user
 */
export async function getTotalBalance(): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('current_balance')
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching total balance:', error.message);
            return 0;
        }

        return data?.reduce((sum, wallet) => sum + (Number(wallet.current_balance) || 0), 0) || 0;
    } catch (error) {
        console.error('Error fetching total balance:', error);
        return 0;
    }
}
