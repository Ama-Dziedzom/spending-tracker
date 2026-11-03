import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

/**
 * Keeps a screen up to date without pull-to-refresh:
 *  - when LogIt comes back to the foreground (e.g. after sharing from Messages)
 *  - when this user's transactions, wallets or Needs review items change,
 *    e.g. a message logged by the Shortcuts automation while the app is open
 *    (Supabase Realtime; tables are added to the publication by migration
 *    20261103040000_realtime.sql).
 * Bursts (a multi-message share) are collapsed into one refresh.
 */
export function useLiveRefresh(refresh: () => void, screen: string) {
    const latest = useRef(refresh);
    latest.current = refresh;

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | undefined;

        const trigger = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => latest.current(), 500);
        };

        const appState = AppState.addEventListener('change', (state) => {
            if (state === 'active') trigger();
        });

        supabase.auth.getUser().then(({ data }) => {
            const userId = data.user?.id;
            if (!userId || cancelled) return;
            const filter = `user_id=eq.${userId}`;
            channel = supabase
                .channel(`live-${screen}-${userId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter }, trigger)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter }, trigger)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'failed_parses', filter }, trigger)
                .subscribe();
        });

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            appState.remove();
            if (channel) supabase.removeChannel(channel);
        };
    }, [screen]);
}
