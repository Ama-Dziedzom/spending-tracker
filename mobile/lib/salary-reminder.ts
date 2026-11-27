import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { IncomePrompt } from './income-service';
import { getProfileFast } from './settings-service';
import { ghs } from './format';

/**
 * The 8:30 morning reminder while a salary check is waiting (Figma
 * "Salary check · morning reminder"). One repeating notification, replaced or
 * cancelled every time Spending loads, so it stops the moment the salary is
 * logged by any route. Off when Settings → Notifications → Salary day is off.
 *
 * expo-notifications is loaded lazily: an over-the-air update can reach a build
 * made before it was added, and that must not crash.
 */
const ID = 'salary-check';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Only load expo-notifications when its native code is in this build. The
 * package starts push-token work as soon as it's imported, and on a build
 * without the native module that throws outside any try/catch and crashes
 * the app (seen with a build made before `pod install`).
 */
const NATIVE = ['ExpoPushTokenManager', 'ExpoNotificationScheduler', 'ExpoNotificationPermissionsModule', 'ExpoNotificationsEmitter'];
function notifications(): NotificationsModule | null {
    try {
        if (!NATIVE.every((name) => requireOptionalNativeModule(name))) return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('expo-notifications') as NotificationsModule;
    } catch {
        return null;
    }
}

export async function syncSalaryReminder(prompt: IncomePrompt | null, walletName?: string): Promise<void> {
    const N = notifications();
    if (!N) return;
    try {
        await N.cancelScheduledNotificationAsync(ID).catch(() => {});
        if (!prompt) return;
        const profile = await getProfileFast();
        if (profile && !profile.notifications.salaryDay) return;
        // Only if notifications are already allowed; this never asks.
        const perm = await N.getPermissionsAsync();
        if (!perm.granted) return;
        if (Platform.OS === 'android') {
            await N.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: N.AndroidImportance.DEFAULT });
        }
        const label = prompt.item.label.toLowerCase();
        await N.scheduleNotificationAsync({
            identifier: ID,
            content: {
                title: `Has your ${label} come in?`,
                body: `Tap to log ${ghs(prompt.item.amount)}${walletName ? ` into ${walletName}` : ''}.`,
                data: { url: '/spending' },
            },
            trigger: {
                type: N.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 30,
                ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
            },
        });
    } catch (e) {
        console.warn('Salary reminder not scheduled:', e);
    }
}

/** Tapping a LogIt reminder opens the screen it names. Returns a cleanup. */
export function listenForReminderTaps(open: (url: string) => void): () => void {
    const N = notifications();
    if (!N) return () => {};
    try {
        const sub = N.addNotificationResponseReceivedListener((r) => {
            const url = r.notification.request.content.data?.url;
            if (typeof url === 'string') open(url);
        });
        return () => sub.remove();
    } catch {
        return () => {};
    }
}
