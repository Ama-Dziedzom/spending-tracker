import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
    BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Text } from './text';

interface SheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    /** Optional line under the title (13 Medium, text/secondary). */
    subtitle?: string;
    children: React.ReactNode;
    /** Sheets sit on bg/surface; pickers over settings use bg/raised. */
    raised?: boolean;
    /** The main action ("Save", "Log GHS 30 cash"), 16 below the content as in Figma. */
    footer?: React.ReactNode;
}

/**
 * Bottom sheet with grabber, radius 32 on the top corners, bg/scrim backdrop.
 * Hugs its content (Figma: 10 to the grabber, 16 between items, 20 sides,
 * 34 at the bottom including the home indicator); taller content scrolls.
 * Rendered as a modal above everything, so the floating tab bar never covers
 * it. Content mounts only while open, so inputs inside can't grab the
 * keyboard while the sheet is closed.
 */
export function Sheet({ visible, onClose, title, subtitle, children, raised, footer }: SheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const window = useWindowDimensions();
    const ref = useRef<BottomSheetModal>(null);
    const [mounted, setMounted] = useState(visible);
    const visibleRef = useRef(visible);
    visibleRef.current = visible;

    useEffect(() => {
        if (visible) {
            setMounted(true);
            ref.current?.present();
        } else {
            ref.current?.dismiss();
        }
    }, [visible]);

    const backdrop = useCallback(
        (p: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} pressBehavior="close" style={[p.style, { backgroundColor: colors.bg.scrim }]} />
        ),
        [colors.bg.scrim],
    );

    const maxHeight = window.height - insets.top - 12;

    const header = (title || subtitle) && (
        <View style={{ gap: 8 }}>
            {title && <Text variant="screenTitle" size={20} style={{ letterSpacing: -0.4 }} accessibilityRole="header">{title}</Text>}
            {subtitle && <Text size={13} tone="secondary">{subtitle}</Text>}
        </View>
    );

    return (
        <BottomSheetModal
            ref={ref}
            enableDynamicSizing
            maxDynamicContentSize={maxHeight}
            enablePanDownToClose
            onDismiss={() => {
                setMounted(false);
                // Closed by a swipe or a backdrop tap: tell the parent.
                if (visibleRef.current) onClose();
            }}
            backdropComponent={backdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{ backgroundColor: raised ? colors.bg.raised : colors.bg.surface, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet }}
            handleStyle={{ paddingTop: 10, paddingBottom: 0 }}
            handleIndicatorStyle={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line.default }}
            accessibilityLabel={title}
        >
            <BottomSheetScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 16, paddingBottom: Math.max(insets.bottom, 20) }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {mounted && header}
                {mounted && children}
                {mounted && footer}
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
}
