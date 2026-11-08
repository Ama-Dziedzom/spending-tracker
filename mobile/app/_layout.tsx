import 'react-native-gesture-handler';
import { AppState, Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ThemeProvider as LogItThemeProvider, useTheme } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/toast';
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { syncSessionToAppGroup } from '@/lib/shareSync';
import { flushPendingSms, requestLogNotifications } from '@/lib/pending-sms';

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
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Keep the Share Extension in sync with the current session.
  // Fires on login, token refresh, and sign-out.
  useEffect(() => {
    // Sync initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSessionToAppGroup(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSessionToAppGroup(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Send messages saved while offline, at launch and whenever LogIt comes back
  // to the foreground. Also ask (once) to show LogIt's own notifications.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      flushPendingSms();
      requestLogNotifications();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushPendingSms();
    });
    return () => sub.remove();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LogItThemeProvider>
          <ToastProvider>
            <AppStack />
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="wallet-details" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="review" options={{ headerShown: false }} />
            <Stack.Screen name="expected-income" options={{ headerShown: false }} />
            <Stack.Screen name="add-phone" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
  );
}
