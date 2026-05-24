import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

interface AuthResult {
    success: boolean;
    error?: string;
}

// ============================================================================
// useAuth Hook
// ============================================================================

export function useAuth() {
    const [loading, setLoading] = useState(false);

    /**
     * Sign up with email — sends a 6-digit OTP to the user's inbox.
     * Uses signInWithOtp which sends a proper OTP code email
     * (uses the "Magic link or OTP" template with {{ .Token }}).
     */
    const signUpWithEmail = useCallback(async (email: string): Promise<AuthResult> => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    // This ensures a new user is created if they don't exist
                    shouldCreateUser: true,
                },
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Verify email OTP code (6 digits).
     * On success, a session is created and the user is authenticated.
     */
    const verifyOtp = useCallback(async (email: string, token: string): Promise<AuthResult> => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup',
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Set the user's real password (after OTP verification).
     * Also stores profile metadata (full_name, phone).
     */
    const setPasswordAndProfile = useCallback(async (
        password: string,
        fullName?: string,
        phone?: string,
    ): Promise<AuthResult> => {
        setLoading(true);
        try {
            // Update password
            const { error: pwError } = await supabase.auth.updateUser({
                password,
            });

            if (pwError) {
                return { success: false, error: pwError.message };
            }

            // Update profile metadata
            if (fullName || phone) {
                const { error: metaError } = await supabase.auth.updateUser({
                    data: {
                        full_name: fullName,
                        phone,
                    },
                });

                if (metaError) {
                    console.warn('Profile update failed (non-critical):', metaError.message);
                    // Don't fail the whole flow for metadata
                }
            }

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Sign in with email and password.
     */
    const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Resend OTP email for signup verification.
     */
    const resendOtp = useCallback(async (email: string): Promise<AuthResult> => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Show a standardized error alert.
     */
    const showError = useCallback((title: string, message: string) => {
        Alert.alert(title, message, [{ text: 'OK' }]);
    }, []);

    return {
        loading,
        signUpWithEmail,
        verifyOtp,
        setPasswordAndProfile,
        signIn,
        resendOtp,
        showError,
    };
}
