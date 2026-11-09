import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StateScreen } from '@/components/system/state-screen';
import { useToast } from '@/components/ui';
import { useAuth } from '@/lib/useAuth';
import { lastPhone, maskPhone } from '@/lib/session';
import { phoneAuthMessage } from '@/lib/phone';

/**
 * Session expired (Figma 1014:2313). Number pre-filled, one tap to a code.
 * Autopilot alerts still queue on the phone meanwhile.
 */
export default function SessionExpired() {
    const toast = useToast();
    const { loading, sendPhoneCode } = useAuth();
    const [phone, setPhone] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        lastPhone().then((p) => {
            if (!p) router.replace('/login');
            else setPhone(p);
        });
    }, []);

    const send = async () => {
        if (!phone) return;
        const r = await sendPhoneCode(phone, { create: false });
        if (r.success) router.push({ pathname: '/otp', params: { mode: 'phone', intent: 'login', phone } });
        else toast.show({ message: phoneAuthMessage(r.error), icon: 'alert' });
    };

    return (
        <StateScreen
            icon="lock"
            title="Log in again"
            body={`For your safety we log you out after 60 days. We’ll text a code to ${phone ? maskPhone(phone) : 'your phone'}.`}
            primary={{ label: 'Send code', onPress: send, busy: loading, busyLabel: 'Sending code' }}
            secondary={{ label: 'Use a different number', onPress: () => router.replace('/login') }}
        />
    );
}
