import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { AnimatedView } from './animated-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ToastOptions {
    /** Past tense and short: "Logged · GHS 85 on Food". */
    message: string;
    icon?: IconName;
    /** "Undo" when something was removed; "View", "Retry" otherwise. */
    action?: { label: string; onPress: () => void };
    /** Defaults to 4 s. */
    duration?: number;
}

const ToastContext = createContext<{ show: (t: ToastOptions) => void } | null>(null);

/** Height of the floating tab bar area, so toasts sit above the nav. */
const ABOVE_NAV = 96;

/**
 * One toast at a time, bottom of screen above the nav, 4 s.
 * Always bg/inverse with text/on-inverse (handoff §5).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback((t: ToastOptions) => {
        if (timer.current) clearTimeout(timer.current);
        const id = Date.now();
        setToast({ ...t, id });
        timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), t.duration ?? 4000);
    }, []);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            {toast && (
                <ToastView
                    key={toast.id}
                    {...toast}
                    onDismiss={() => setToast(null)}
                />
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>');
    return ctx;
}

function ToastView({ message, icon = 'tick', action, onDismiss }: ToastOptions & { onDismiss: () => void }) {
    const { colors, shadows } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <AnimatedView
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(150)}
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + ABOVE_NAV }}
        >
            <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingLeft: 12, paddingRight: 14, paddingVertical: 12,
                    borderRadius: 18, backgroundColor: colors.bg.inverse, ...shadows.toast,
                }}
            >
                <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: RAW.onInverseFill, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={icon} size={16} color={colors.text['on-inverse']} />
                </View>
                <Text size={13} weight="semibold" tone="onInverse" style={{ flex: 1 }}>{message}</Text>
                {action && (
                    <Pressable
                        onPress={() => { action.onPress(); onDismiss(); }}
                        hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
                        accessibilityRole="button"
                    >
                        <Text size={13} weight="bold" style={{ color: RAW.toastUndo }}>{action.label}</Text>
                    </Pressable>
                )}
            </View>
        </AnimatedView>
    );
}
