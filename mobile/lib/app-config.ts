import Constants from 'expo-constants';
import { API_URL } from './sms-api';

/** "1.10.2" vs "1.9" → true when a < b. Non-numeric parts count as 0. */
export function isOlder(a: string, b: string): boolean {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] ?? 0;
        const y = pb[i] ?? 0;
        if (x !== y) return x < y;
    }
    return false;
}

/**
 * Update required (Figma 1014:2283): the API's /app-config says the lowest
 * version that still reads alerts correctly. Never blocks launch: if the
 * check is slow or offline, carry on.
 */
export async function checkUpdateRequired(): Promise<{ required: false } | { required: true; reason: string | null }> {
    const installed = Constants.expoConfig?.version;
    if (!installed) return { required: false };
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${API_URL}/app-config`, { signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) return { required: false };
        const body = await res.json() as { minVersion?: string | null; updateMessage?: string | null };
        if (body.minVersion && isOlder(installed, body.minVersion)) return { required: true, reason: body.updateMessage ?? null };
    } catch {
        // Offline or slow: never stop someone getting to their money.
    }
    return { required: false };
}
