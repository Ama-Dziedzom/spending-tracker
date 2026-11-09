import { Stack } from 'expo-router';

/**
 * Each tab has its own stack, so pushed screens (Transactions, a wallet, an
 * insight) keep the tab bar, and the iOS edge swipe goes back one screen
 * inside the tab instead of leaving the tabs.
 */
export default function TabStack() {
    return <Stack screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }} />;
}
