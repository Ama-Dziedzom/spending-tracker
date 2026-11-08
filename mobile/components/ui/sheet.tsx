import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
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
}

/**
 * Bottom sheet with grabber, radius 32 on the top corners, bg/scrim backdrop.
 * Sizes to its content. Wraps @gorhom/bottom-sheet (already used in the app).
 */
export function Sheet({ visible, onClose, title, subtitle, children, raised }: SheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const ref = useRef<BottomSheet>(null);

    useEffect(() => {
        if (visible) ref.current?.expand();
        else ref.current?.close();
    }, [visible]);

    const backdrop = useCallback(
        (p: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={[p.style, { backgroundColor: colors.bg.scrim }]} />
        ),
        [colors.bg.scrim],
    );

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            enableDynamicSizing
            enablePanDownToClose
            onClose={onClose}
            backdropComponent={backdrop}
            backgroundStyle={{ backgroundColor: raised ? colors.bg.raised : colors.bg.surface, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet }}
            handleStyle={{ paddingTop: 10, paddingBottom: 0 }}
            handleIndicatorStyle={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line.default }}
            accessibilityLabel={title}
        >
            <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 16 }}>
                {(title || subtitle) && (
                    <View style={{ gap: 8 }}>
                        {title && <Text variant="screenTitle" size={20} style={{ letterSpacing: -0.4 }} accessibilityRole="header">{title}</Text>}
                        {subtitle && <Text size={13} tone="secondary">{subtitle}</Text>}
                    </View>
                )}
                {children}
            </BottomSheetView>
        </BottomSheet>
    );
}
