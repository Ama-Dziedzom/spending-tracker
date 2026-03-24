import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

// Keys for secure storage
const BIO_ENABLED_KEY = 'biometric_enabled';
const BIO_USER_EMAIL_KEY = 'biometric_user_email';
const BIO_USER_PASSWORD_KEY = 'biometric_user_password';

/**
 * Biometric authentication utility
 *
 * SECURITY MODEL:
 * - Credentials (email + password) are encrypted using expo-secure-store,
 *   which uses iOS Keychain / Android Keystore under the hood.
 * - The password is NEVER readable without passing the OS biometric prompt first.
 * - On session expiry or app restart, we re-authenticate via Supabase using
 *   the securely stored credentials after the user passes the biometric check.
 */
export const biometrics = {
    /**
     * Check if biometric hardware is available and enrolled
     */
    async isAvailable(): Promise<boolean> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            return hasHardware && isEnrolled;
        } catch (error) {
            console.error('[Biometrics] Error checking availability:', error);
            return false;
        }
    },

    /**
     * Get supported biometric authentication types
     */
    async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
        try {
            return await LocalAuthentication.supportedAuthenticationTypesAsync();
        } catch (error) {
            console.error('[Biometrics] Error getting supported types:', error);
            return [];
        }
    },

    /**
     * Authenticate user using biometrics (OS prompt only)
     */
    async authenticate(promptMessage: string = 'Authenticate to continue'): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            });

            if (!result.success) {
                const errorResult = result as { success: false; error: string };

                switch (errorResult.error) {
                    case 'not_enrolled':
                        Alert.alert(
                            'Biometrics Not Set Up',
                            'Please set up Face ID or Fingerprint in your device settings.'
                        );
                        break;
                    case 'not_available':
                        Alert.alert(
                            'Biometrics Unavailable',
                            'Biometric authentication is not available on this device.'
                        );
                        break;
                    case 'lockout':
                        Alert.alert(
                            'Too Many Attempts',
                            'Biometric authentication is temporarily locked. Please try again later.'
                        );
                        break;
                    // 'user_cancel' and 'user_fallback' are intentionally silent
                }
            }

            return result.success;
        } catch (error) {
            console.error('[Biometrics] Authentication error:', error);
            return false;
        }
    },

    /**
     * Enable biometric login for the current user.
     * Stores the user's email and encrypted password in SecureStore.
     * This allows re-authentication even when the Supabase session is fully expired.
     */
    async enableBiometricLogin(email: string, password: string): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(BIO_ENABLED_KEY, 'true');
            await SecureStore.setItemAsync(BIO_USER_EMAIL_KEY, email);
            await SecureStore.setItemAsync(BIO_USER_PASSWORD_KEY, password);
            console.log('[Biometrics] Biometric login enabled for:', email);
            return true;
        } catch (error) {
            console.error('[Biometrics] Error enabling biometric login:', error);
            return false;
        }
    },

    /**
     * Check if biometric login is enabled
     */
    async isBiometricLoginEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync(BIO_ENABLED_KEY);
            return enabled === 'true';
        } catch (error) {
            console.error('[Biometrics] Error checking if enabled:', error);
            return false;
        }
    },

    /**
     * Get the email of the user who enabled biometric login
     */
    async getBiometricUserEmail(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(BIO_USER_EMAIL_KEY);
        } catch (error) {
            console.error('[Biometrics] Error getting user email:', error);
            return null;
        }
    },

    /**
     * Attempt biometric login.
     *
     * Strategy (in order):
     * 1. Show biometric prompt — if user cancels, we stop.
     * 2. If there's already a valid Supabase session → just use it (fast path).
     * 3. If not → try refreshing the session.
     * 4. If refresh fails → sign in with stored credentials (works even after weeks offline).
     *
     * Biometric flag is NEVER cleared on failure — the user can always try again.
     */
    async attemptBiometricLogin(): Promise<{ success: boolean; requiresRelogin: boolean }> {
        try {
            const isEnabled = await this.isBiometricLoginEnabled();
            if (!isEnabled) {
                return { success: false, requiresRelogin: true };
            }

            // Step 1: biometric prompt first — gate everything behind the OS auth
            const authenticated = await this.authenticate('Verify your identity to log in');
            if (!authenticated) {
                // User cancelled or failed biometrics — do not force re-login
                return { success: false, requiresRelogin: false };
            }

            // Step 2: check for an existing valid session (happy path)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Biometrics] Valid session found — using it directly.');
                return { success: true, requiresRelogin: false };
            }

            // Step 3: try refreshing the session
            console.log('[Biometrics] No active session, attempting refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session) {
                console.log('[Biometrics] Session refreshed successfully.');
                return { success: true, requiresRelogin: false };
            }

            // Step 4: session is fully expired — re-authenticate with stored credentials
            console.log('[Biometrics] Session refresh failed, signing in with stored credentials...');
            const email = await SecureStore.getItemAsync(BIO_USER_EMAIL_KEY);
            const password = await SecureStore.getItemAsync(BIO_USER_PASSWORD_KEY);

            if (!email || !password) {
                console.warn('[Biometrics] No stored credentials found.');
                // Keep biometrics enabled — do not wipe it — but tell caller to re-login
                return { success: false, requiresRelogin: true };
            }

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError || !signInData.session) {
                console.error('[Biometrics] Credential sign-in failed:', signInError?.message);
                // Credentials are wrong (e.g. password changed) — disable biometrics
                await this.disableBiometricLogin();
                return { success: false, requiresRelogin: true };
            }

            console.log('[Biometrics] Re-authenticated successfully with stored credentials.');
            return { success: true, requiresRelogin: false };
        } catch (error) {
            console.error('[Biometrics] Unexpected error during biometric login:', error);
            return { success: false, requiresRelogin: false };
        }
    },

    /**
     * Disable biometric login and wipe all stored credentials
     */
    async disableBiometricLogin(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(BIO_ENABLED_KEY);
            await SecureStore.deleteItemAsync(BIO_USER_EMAIL_KEY);
            await SecureStore.deleteItemAsync(BIO_USER_PASSWORD_KEY);
            console.log('[Biometrics] Biometric login disabled and credentials cleared.');
        } catch (error) {
            console.error('[Biometrics] Error disabling biometric login:', error);
        }
    },
};
