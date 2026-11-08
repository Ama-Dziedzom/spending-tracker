import React from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SPACE } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { BrandBand } from './brand-band';

interface Props {
    children: React.ReactNode;
    /** Show the blue band. Height per handoff §3. Pass false for plain canvas screens. */
    band?: false | { height?: number; full?: boolean };
    /** Pinned above the content (e.g. TopBar). */
    header?: React.ReactNode;
    /** Pinned below the content (e.g. Ask bar). The tab bar is handled by the tab layout. */
    footer?: React.ReactNode;
    scroll?: boolean;
    scrollProps?: ScrollViewProps;
    contentStyle?: StyleProp<ViewStyle>;
    /** Extra bottom space so content clears the floating tab bar. */
    bottomInset?: number;
}

/**
 * Base screen: canvas background, optional blue band, light status bar on
 * the band, 16 gutter, 12 between cards.
 */
export function Screen({
    children, band = {}, header, footer, scroll = true, scrollProps, contentStyle, bottomInset = 24,
}: Props) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const onBand = band !== false;

    const content = [
        { paddingHorizontal: SPACE.gutter, gap: SPACE.cardGap, paddingBottom: insets.bottom + bottomInset },
        contentStyle,
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
            {onBand && <BrandBand {...band} />}
            <StatusBar style={onBand || isDark ? 'light' : 'dark'} />
            <View style={{ paddingTop: insets.top }}>{header}</View>
            {scroll ? (
                <ScrollView
                    {...scrollProps}
                    contentContainerStyle={[content, scrollProps?.contentContainerStyle]}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[{ flex: 1 }, content]}>{children}</View>
            )}
            {footer}
        </View>
    );
}
