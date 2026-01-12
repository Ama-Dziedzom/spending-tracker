import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a mock client for when Supabase is not configured
const createMockClient = (): SupabaseClient => {
    return {
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            update: () => ({
                eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            }),
            delete: () => ({
                eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            }),
            eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
            }),
        }),
    } as unknown as SupabaseClient;
};

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

// Create the appropriate client
export const supabase: SupabaseClient = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockClient();
