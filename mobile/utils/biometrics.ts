import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BIO_AUTH_KEY = 'biometric_auth_credentials';

export const biometrics = {
    async isAvailable() {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return hasHardware && isEnrolled;
    },

    async getSupportedTypes() {
        return await LocalAuthentication.supportedAuthenticationTypesAsync();
    },

    async authenticate() {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to log in',
                disableDeviceFallback: false,
            });

            if (!result.success) {
                const errorResult = result as { success: false; error: string };
                if (['not_enrolled', 'not_available', 'lockout'].includes(errorResult.error)) {
                    Alert.alert('Biometrics Unavailable', 'Please check your device settings to enable Face ID or Fingerprint.');
                }
            }

            return result.success;
        } catch (error) {
            console.error('[Biometrics] Error:', error);
            return false;
        }
    },

    async saveCredentials(email: string, password: string) {
        try {
            await SecureStore.setItemAsync(BIO_AUTH_KEY, JSON.stringify({ email, password }));
        } catch (error) {
            console.error('Error saving credentials', error);
        }
    },

    async getCredentials() {
        try {
            const creds = await SecureStore.getItemAsync(BIO_AUTH_KEY);
            return creds ? JSON.parse(creds) : null;
        } catch (error) {
            console.error('Error getting credentials', error);
            return null;
        }
    },

    async clearCredentials() {
        try {
            await SecureStore.deleteItemAsync(BIO_AUTH_KEY);
        } catch (error) {
            console.error('Error clearing credentials', error);
        }
    }
};
