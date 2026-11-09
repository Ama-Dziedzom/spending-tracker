import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBand, Button, Icon, Tap, Text, type IconName } from '@/components/ui';
import { RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

interface Action { label: string; onPress: () => void; icon?: IconName; busy?: boolean; busyLabel?: string }

/**
 * Full-screen system states (Figma section 993:54): Something went wrong,
 * Update required, Session expired, Allow notifications. Message from y 300
 * (170 with a preview), actions from y 672 on an 844 frame, 32 side margins.
 *
 * tone 'canvas': 420 band fading to canvas, dark text, accent primary.
 * tone 'band':   full band, white text, white primary with accent label.
 */
export function StateScreen({ tone = 'canvas', icon, iconTone = 'accent', title, body, preview, primary, secondary, footnote }: {
    tone?: 'canvas' | 'band';
    icon?: IconName;
    iconTone?: 'accent' | 'danger';
    title: string;
    body?: string;
    /** Shown above the title (Allow notifications' sample toasts). */
    preview?: React.ReactNode;
    primary: Action;
    secondary?: Action;
    footnote?: string;
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const y = (v: number) => Math.round((v / 844) * height);
    const onBand = tone === 'band';

    const disc = onBand
        ? { bg: RAW.onBandFill, fg: RAW.onBand }
        : iconTone === 'danger'
            ? { bg: colors.status['danger-tint'], fg: colors.status.danger }
            : { bg: colors.brand['accent-tint'], fg: colors.brand['accent-text'] };

    return (
        <View style={{ flex: 1, backgroundColor: onBand ? colors.brand.band : colors.bg.canvas }}>
            <StatusBar style="light" />
            {onBand ? <BrandBand full /> : <BrandBand height={420} />}

            <View style={{ position: 'absolute', top: Math.max(insets.top + 24, y(preview ? 170 : 300)), left: 32, right: 32, alignItems: 'center', gap: 14 }}>
                {preview && <View style={{ alignSelf: 'stretch', gap: 8, marginBottom: 2 }}>{preview}</View>}
                {icon && (
                    <View style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: disc.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={icon} size={34} color={disc.fg} />
                    </View>
                )}
                <Text
                    weight="bold"
                    size={preview ? 24 : 22}
                    align="center"
                    tone={onBand ? 'onBand' : 'primary'}
                    style={preview ? { letterSpacing: -0.48 } : undefined}
                    accessibilityRole="header"
                >
                    {title}
                </Text>
                {body && <Text size={14} align="center" style={{ color: onBand ? RAW.onBandSecondary : colors.text.secondary }}>{body}</Text>}
            </View>

            <View style={{ position: 'absolute', left: 32, right: 32, top: Math.min(y(672), height - insets.bottom - 150), gap: 8 }}>
                {onBand ? (
                    <Tap
                        onPress={primary.onPress}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                            minHeight: 50, borderRadius: 999, backgroundColor: RAW.onBand, opacity: pressed ? 0.85 : 1,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        })}
                    >
                        {primary.icon && <Icon name={primary.icon} size={18} color={colors.brand['accent-text']} />}
                        <Text size={15} weight="bold" tone="accent">{primary.busy ? primary.busyLabel ?? primary.label : primary.label}</Text>
                    </Tap>
                ) : (
                    <Button label={primary.label} icon={primary.icon} busy={primary.busy} busyLabel={primary.busyLabel} onPress={primary.onPress} />
                )}
                {secondary && (onBand ? (
                    <Tap onPress={secondary.onPress} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <Text size={14} weight="semibold" style={{ color: RAW.onBandSecondary }}>{secondary.label}</Text>
                    </Tap>
                ) : (
                    <Button label={secondary.label} variant="secondary" onPress={secondary.onPress} />
                ))}
                {footnote && <Text variant="meta" tone="tertiary" align="center">{footnote}</Text>}
            </View>
        </View>
    );
}
