import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

// Keys for secure storage
const BIO_ENABLED_KEY = 'biometric_enabled';
const BIO_USER_EMAIL_KEY = 'biometric_user_email';

/**
 * Biometric authentication utility
 * 
 * SECURITY: This implementation uses Supabase session tokens instead of storing passwords.
 * When biometric login is enabled, we store only the user's email (for display purposes)
 * and rely on the existing Supabase session for re-authentication.
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
     * Authenticate user using biometrics
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

                // Handle specific error cases
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
                    // 'user_cancel' and 'user_fallback' are intentionally not shown to user
                }
            }

            return result.success;
        } catch (error) {
            console.error('[Biometrics] Authentication error:', error);
            return false;
        }
    },

    /**
     * Enable biometric login for the current user
     * Only stores the email for display - relies on Supabase session for auth
     */
    async enableBiometricLogin(email: string): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(BIO_ENABLED_KEY, 'true');
            await SecureStore.setItemAsync(BIO_USER_EMAIL_KEY, email);
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
     * Attempt biometric login using existing session
     * Returns true if successful, false if re-login is required
     */
    async attemptBiometricLogin(): Promise<{ success: boolean; requiresRelogin: boolean }> {
        try {
            // First, check if biometric login is enabled
            const isEnabled = await this.isBiometricLoginEnabled();
            if (!isEnabled) {
                return { success: false, requiresRelogin: true };
            }

            // Check if we have a valid session
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                // No valid session, user needs to log in with credentials
                return { success: false, requiresRelogin: true };
            }

            // Try to refresh the session if it exists
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !refreshData.session) {
                // Session refresh failed, user needs to log in again
                await this.disableBiometricLogin();
                return { success: false, requiresRelogin: true };
            }

            // Authenticate using biometrics
            const authenticated = await this.authenticate('Verify your identity to log in');

            if (!authenticated) {
                return { success: false, requiresRelogin: false };
            }

            // Success - session is valid and user authenticated with biometrics
            return { success: true, requiresRelogin: false };
        } catch (error) {
            console.error('[Biometrics] Error during biometric login:', error);
            return { success: false, requiresRelogin: true };
        }
    },

    /**
     * Disable biometric login
     */
    async disableBiometricLogin(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(BIO_ENABLED_KEY);
            await SecureStore.deleteItemAsync(BIO_USER_EMAIL_KEY);
        } catch (error) {
            console.error('[Biometrics] Error disabling biometric login:', error);
        }
    },

    // ============================================
    // DEPRECATED: Legacy methods for migration
    // These will be removed in a future version
    // ============================================

    /** @deprecated Use enableBiometricLogin instead */
    async saveCredentials(email: string, _password: string): Promise<void> {
        console.warn('[Biometrics] saveCredentials is deprecated. Passwords are no longer stored.');
        await this.enableBiometricLogin(email);
    },

    /** @deprecated Use attemptBiometricLogin or getBiometricUserEmail instead */
    async getCredentials(): Promise<{ email: string; password: string } | null> {
        console.warn('[Biometrics] getCredentials is deprecated. Passwords are no longer stored.');
        const email = await this.getBiometricUserEmail();
        if (email) {
            // Return a structure that migration code expects, but password is empty
            return { email, password: '' };
        }
        return null;
    },

    /** @deprecated Use disableBiometricLogin instead */
    async clearCredentials(): Promise<void> {
        console.warn('[Biometrics] clearCredentials is deprecated. Use disableBiometricLogin instead.');
        await this.disableBiometricLogin();
    }
};
