import { NativeModules, Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Messages the "Log Message" action (iOS) or the SMS receiver (Android)
 * couldn't send because there was no connection. Both keep them under
 * "pending_sms" (a JSON array of message texts) in shared storage; the app
 * sends them whenever it opens. The API ignores duplicates, so it's safe if
 * the native side sends the same message too.
 */
const KEY = 'pending_sms';
/** { message text: epoch ms it arrived }, written by the native side. */
const TIMES_KEY = 'pending_sms_received_at';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://spending-tracker-api-production-cea1.up.railway.app';

const reader: { getItem?: (key: string) => Promise<string | null> } | undefined =
    Platform.OS === 'ios' ? NativeModules.AppGroupReader : NativeModules.AppGroupBridge;
const writer: { setItem?: (key: string, value: string) => void; removeItem?: (key: string) => void } | undefined =
    NativeModules.AppGroupBridge;

let flushing = false;

/** Sends saved messages. Returns how many were logged. */
export async function flushPendingSms(): Promise<number> {
    if (flushing || !reader?.getItem || !writer) return 0;
    flushing = true;
    try {
        const raw = await reader.getItem(KEY);
        if (!raw) return 0;
        let pending: string[] = [];
        try {
            pending = JSON.parse(raw);
        } catch {
            writer.removeItem?.(KEY);
            return 0;
        }
        if (!Array.isArray(pending) || pending.length === 0) return 0;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 0;

        let times: Record<string, number> = {};
        try {
            times = JSON.parse((await reader.getItem(TIMES_KEY)) ?? '{}') ?? {};
        } catch {
            times = {};
        }

        const remaining = [...pending];
        let logged = 0;
        for (const sms of pending) {
            try {
                const res = await fetch(`${API_URL}/process-sms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify(times[sms] ? { rawSms: sms, receivedAt: times[sms] } : { rawSms: sms }),
                });
                if (res.ok || res.status === 400) {
                    remaining.splice(remaining.indexOf(sms), 1);
                    if (res.ok) logged += 1;
                } else {
                    break;
                }
            } catch {
                break; // still offline
            }
        }

        if (remaining.length === 0) writer.removeItem?.(KEY);
        else writer.setItem?.(KEY, JSON.stringify(remaining));
        const keptTimes = Object.fromEntries(Object.entries(times).filter(([sms]) => remaining.includes(sms)));
        if (Object.keys(keptTimes).length === 0) writer.removeItem?.(TIMES_KEY);
        else writer.setItem?.(TIMES_KEY, JSON.stringify(keptTimes));
        return logged;
    } finally {
        flushing = false;
    }
}

/** iOS: ask once for notification permission so "Log Message" can show LogIt's own notifications. */
export async function requestLogNotifications(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    const r = NativeModules.AppGroupReader as { requestNotifications?: () => Promise<boolean> } | undefined;
    try {
        return (await r?.requestNotifications?.()) ?? false;
    } catch {
        return false;
    }
}

/** How many alerts are saved on the phone waiting to be sent ("1 alert waiting to sync"). */
export async function pendingSmsCount(): Promise<number> {
    if (!reader?.getItem) return 0;
    try {
        const raw = await reader.getItem(KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.length : 0;
    } catch {
        return 0;
    }
}
