import 'react-native-gesture-handler';
import { AppState, Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { ThemeProvider as LogItThemeProvider, useTheme } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/toast';
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AppLockProvider } from '@/components/app-lock';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { syncSessionToAppGroup } from '@/lib/shareSync';
import { flushPendingSms } from '@/lib/pending-sms';
import { lastPhone, wasIntentionalSignOut } from '@/lib/session';
import { ErrorScreen } from '@/components/system/error-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      if (error) console.warn('[fonts] Manrope failed to load', error);
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Safety net: never leave people on the native splash. If fonts haven't
  // loaded after 4s, carry on with the system font.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      console.warn('[fonts] still loading after 4s, continuing without them');
      setFontTimeout(true);
      SplashScreen.hideAsync();
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  // Keep the Share Extension in sync with the current session.
  // Fires on login, token refresh, and sign-out.
  useEffect(() => {
    // Sync initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSessionToAppGroup(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      syncSessionToAppGroup(session);
      // Login lapsed on its own (not Log out): "Log in again" (Figma 1014:2313).
      if (event === 'SIGNED_OUT' && !wasIntentionalSignOut()) {
        lastPhone().then((p) => { if (p) router.replace('/session-expired'); });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Send messages saved while offline, at launch and whenever LogIt comes back
  // to the foreground. Notifications are asked for after the first alert is
  // logged (app/allow-notifications.tsx), not here.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      flushPendingSms();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushPendingSms();
    });
    return () => sub.remove();
  }, []);

  if (!loaded && !error && !fontTimeout) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LogItThemeProvider>
          <ToastProvider>
            {/* Face ID lock covers everything, sheets included. */}
            <AppLockProvider>
              {/* Sheets render here, above the tabs and the floating tab bar. */}
              <BottomSheetModalProvider>
                <AppStack />
              </BottomSheetModalProvider>
            </AppLockProvider>
          </ToastProvider>
        </LogItThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg.canvas,
      card: colors.bg.surface,
      text: colors.text.primary,
      border: colors.line.default,
      primary: colors.brand.accent,
    },
  };

  return (
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={{
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            fullScreenGestureEnabled: Platform.OS === 'ios'
          }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="otp" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="password" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="success" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="onboarding/avatar" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="onboarding/autopilot" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/test" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
            <Stack.Screen name="help" options={{ headerShown: false }} />
            <Stack.Screen name="delete-account" options={{ headerShown: false }} />
            <Stack.Screen name="sms-settings" options={{ headerShown: false }} />
            <Stack.Screen name="paste" options={{ headerShown: false }} />
            <Stack.Screen name="ask" options={{ headerShown: false }} />
            <Stack.Screen name="limits" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="review" options={{ headerShown: false }} />
            <Stack.Screen name="expected-income" options={{ headerShown: false }} />
            <Stack.Screen name="add-phone" options={{ headerShown: false }} />
            <Stack.Screen name="session-expired" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="update-required" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="allow-notifications" options={{ headerShown: false, animation: 'fade' }} />
          </Stack>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
  );
}

/**
 * Something went wrong (Figma 1014:2246): full screen only when nothing can
 * be shown. expo-router renders this in place of the layout, so it brings its
 * own providers.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <SafeAreaProvider>
      <LogItThemeProvider>
        <ErrorScreen error={error} retry={retry} />
      </LogItThemeProvider>
    </SafeAreaProvider>
  );
}
