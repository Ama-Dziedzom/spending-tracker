import React, { forwardRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAND, BrandBand, Icon, Tap, Text, type BandShape, type IconName } from '@/components/ui';
import { FONT, RAW } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { ghanaNetwork, toE164 } from '@/lib/phone';
import type { Country } from '@/lib/currency';
import { CountrySheet } from '@/components/settings/country-sheet';

/**
 * Onboarding and sign-in layout (Figma section 993:48): a band with a
 * back button, a 30 ExtraBold title and a subtitle, then a white card from
 * y 300 (on an 844 frame) with 36 corners. Fields at the top, the main
 * action and links pinned to the bottom of the card.
 */
export function AuthLayout({ title, subtitle, back = true, onBack, hero, cardTop = 300, band = BAND.auth, softLightEllipse, children, footer }: {
    title?: string;
    subtitle?: string;
    back?: boolean;
    onBack?: () => void;
    /** Centred content on the band instead of a title ("You're in", "Autopilot is on"). */
    hero?: React.ReactNode;
    /** Where the card starts, in Figma points on an 844 frame. */
    cardTop?: number;
    /** This screen's band from Figma (default: Sign up / Log in / Code). */
    band?: BandShape;
    /** Autopilot · it works: the light ellipse behind the subtitle at 20 %. */
    softLightEllipse?: boolean;
    children?: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const headerMin = Math.round((cardTop / 844) * height);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg.surface }}>
            <StatusBar style="light" />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg.canvas }} />
            <BrandBand {...band} softLightEllipse={softLightEllipse} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={{ minHeight: headerMin, paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 28 }}>
                        {back ? (
                            <Tap
                                onPress={onBack ?? (() => router.back())}
                                accessibilityRole="button"
                                accessibilityLabel="Back"
                                hitSlop={4}
                                style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: RAW.onBandFill, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Icon name="back" size={20} color={RAW.onBand} />
                            </Tap>
                        ) : <View style={{ height: 40 }} />}
                        {hero ? (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 12 }}>{hero}</View>
                        ) : (
                            <View style={{ marginTop: 20, paddingHorizontal: 4, gap: 8 }}>
                                {title && <Text weight="extrabold" size={30} tone="onBand" style={{ letterSpacing: -0.9 }} accessibilityRole="header">{title}</Text>}
                                {subtitle && <Text size={15} tone="onBand">{subtitle}</Text>}
                            </View>
                        )}
                    </View>
                    <View
                        style={{
                            flex: 1, backgroundColor: colors.bg.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36,
                            paddingTop: 28, paddingHorizontal: 24, paddingBottom: Math.max(34, insets.bottom + 10), gap: 18,
                        }}
                    >
                        {children}
                        <View style={{ flex: 1, minHeight: 12 }} />
                        {footer && <View style={{ gap: 10 }}>{footer}</View>}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

/** Big centred hero on the band: white disc with an icon, a title, a line (Figma 1001:158, 1001:327). */
export function BandHero({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
    const { colors } = useTheme();
    return (
        <>
            <View style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: RAW.onBandFill, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: RAW.onBand, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={icon} size={26} color={colors.brand.accent} />
                </View>
            </View>
            <Text weight="extrabold" size={26} tone="onBand" align="center" style={{ letterSpacing: -0.78 }} accessibilityRole="header">{title}</Text>
            {subtitle && <Text size={14} weight="semibold" align="center" tone="onBand">{subtitle}</Text>}
        </>
    );
}

/** "FULL NAME": 12 Bold, +6 % tracking, text/secondary. */
export function FieldLabel({ children }: { children: string }) {
    return <Text size={12} weight="bold" tone="secondary" style={{ letterSpacing: 0.72, textTransform: 'uppercase' }}>{children}</Text>;
}

/** 56 tall pill field with an optional leading icon (Figma 1000:129). Accent border while focused. */
export const TextField = forwardRef<TextInput, TextInputProps & { icon?: IconName; error?: boolean }>(function TextField({ icon, error, style, onFocus, onBlur, ...rest }, ref) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
        <View
            style={{
                height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: colors.bg.surface, borderWidth: 1.5,
                borderColor: error ? colors.status.danger : focused ? colors.brand.accent : colors.line.default,
            }}
        >
            {icon && <Icon name={icon} size={20} color={colors.text.secondary} />}
            <TextInput
                ref={ref}
                placeholderTextColor={colors.text.tertiary}
                onFocus={(e) => { setFocused(true); onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); onBlur?.(e); }}
                style={[{ flex: 1, fontFamily: FONT.medium, fontSize: 16, color: colors.text.primary, paddingVertical: 0 }, style]}
                {...rest}
            />
        </View>
    );
});

/**
 * Ghana phone field: "🇬🇭 +233 | 24 412 3456" with the network hint under it
 * ("MTN number · we'll text you a code"), so the number is checked before a
 * text is spent (Figma 1000:136).
 */
export function PhoneField({ value, onChange, autoFocus, onSubmit, error, country, onCountry }: {
    value: string;
    onChange: (v: string) => void;
    autoFocus?: boolean;
    onSubmit?: () => void;
    error?: string | null;
    /** Sets the dialling code and number rules (Figma "Sign up · Nigeria"). */
    country: Country;
    /** Picked from the country sheet; also sets the currency at sign up. */
    onCountry: (c: Country) => void;
}) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    const [picking, setPicking] = useState(false);
    const e164 = toE164(value, `+${country.dial}`);
    const network = ghanaNetwork(e164);
    const digits = value.replace(/\D/g, '');
    return (
        <View style={{ gap: 8 }}>
            <View
                style={{
                    height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: colors.bg.surface, borderWidth: 1.5,
                    borderColor: error ? colors.status.danger : focused ? colors.brand.accent : colors.line.default,
                }}
            >
                <Tap
                    onPress={() => setPicking(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`${country.name}, +${country.dial}. Change country`}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}
                >
                    <Text size={16} weight="medium">{country.flag}  +{country.dial}</Text>
                    <Icon name="down" size={16} color={colors.text.secondary} />
                </Tap>
                <View style={{ width: 1.5, height: 24, backgroundColor: colors.line.default }} />
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    autoFocus={autoFocus}
                    placeholder={country.example}
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={16}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                    accessibilityLabel="Phone number"
                    style={{ flex: 1, fontFamily: FONT.medium, fontSize: 16, color: colors.text.primary, paddingVertical: 0 }}
                />
            </View>
            {error ? (
                <Text size={13} weight="medium" tone="danger">{error}</Text>
            ) : network ? (
                <Text size={13} weight="medium" tone="success">{network} number · we’ll text you a code</Text>
            ) : e164 && country.code !== 'GH' ? (
                <Text size={13} weight="medium" tone="success">We’ll text you a code</Text>
            ) : digits.length >= country.digits ? (
                <Text size={13} weight="medium" tone="warn">That doesn’t look like a {country.name} mobile number. Check the digits.</Text>
            ) : null}
            <CountrySheet
                visible={picking}
                onClose={() => setPicking(false)}
                selected={country.code}
                withDial
                title="Where’s your number from?"
                subtitle="Sets your phone code and the currency LogIt counts in. You can change it later in Settings."
                onPick={(c) => { setPicking(false); onCountry(c); }}
            />
        </View>
    );
}

/** Text link inside the card: 14 Bold accent ("Send a new code", "Change number"). */
export function CardLink({ label, onPress, prefix }: { label: string; onPress: () => void; prefix?: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            {prefix && <Text size={13} tone="secondary">{prefix} </Text>}
            <Tap onPress={onPress} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text size={prefix ? 13 : 14} weight="bold" tone="accent">{label}</Text>
            </Tap>
        </View>
    );
}
