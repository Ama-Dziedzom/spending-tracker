import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindScheme, vars } from 'nativewind';
import { PALETTE, cardShadow, shadows, type ColorScheme, type Palette } from '@/constants/theme';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cssVarsFor } = require('../constants/tokens-css');

/** What the user picked in Settings › Theme. Stored on the device only (handoff §7). */
export type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'logit.theme';

const CSS_VARS = {
  light: vars(cssVarsFor('light')),
  dark: vars(cssVarsFor('dark')),
};

interface ThemeContextValue {
  /** The scheme actually in use after resolving 'auto'. */
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Card shadow for the current scheme (none in dark). */
  cardShadow: ReturnType<typeof cardShadow>;
  /** All shadow presets for the current scheme (none in dark). */
  shadows: ReturnType<typeof shadows>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'auto') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorScheme =
    preference === 'auto' ? (system === 'dark' ? 'dark' : 'light') : preference;

  // Keep NativeWind's `dark:` variant in sync with the resolved scheme.
  useEffect(() => {
    nativewindScheme.set(preference === 'auto' ? 'system' : preference);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: PALETTE[scheme],
      preference,
      setPreference,
      cardShadow: cardShadow(scheme),
      shadows: shadows(scheme),
    }),
    [scheme, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* Token CSS variables for Tailwind classes like bg-bg-surface. */}
      <View style={[{ flex: 1 }, CSS_VARS[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return ctx;
}
