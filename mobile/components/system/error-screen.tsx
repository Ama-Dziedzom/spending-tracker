import React, { useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { StateScreen } from './state-screen';
import { SUPPORT } from '@/constants/support';
import { time24 } from '@/lib/format';

/**
 * Something went wrong (Figma 1014:2246). Reassures first, then one clear
 * action. The error code and time help support.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
    const [busy, setBusy] = useState(false);
    const at = useMemo(() => new Date(), []);
    const status = (error as Error & { status?: number }).status;
    const code = status ? String(status) : error.name && error.name !== 'Error' ? error.name : 'app';

    const support = SUPPORT.whatsappNumber
        ? `https://wa.me/${SUPPORT.whatsappNumber}?text=${encodeURIComponent(`LogIt error ${code} at ${time24(at)}: ${error.message}`.slice(0, 300))}`
        : null;

    return (
        <StateScreen
            icon="alert"
            iconTone="danger"
            title="LogIt couldn’t load"
            body="Your transactions are safe. This is on our side, not your phone."
            primary={{
                label: 'Try again',
                icon: 'refresh',
                busy,
                busyLabel: 'Trying again',
                onPress: async () => { setBusy(true); try { await retry(); } finally { setBusy(false); } },
            }}
            secondary={support ? { label: 'Message us', onPress: () => Linking.openURL(support).catch(() => {}) } : undefined}
            footnote={`Error ${code} · ${time24(at)}`}
        />
    );
}
