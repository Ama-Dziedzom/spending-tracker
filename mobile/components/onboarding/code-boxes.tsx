import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '@/components/ui';
import { FONT } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

/**
 * Six code boxes (Figma 1000:191, 1000:237): 48×58, 16 corners, 22 Bold.
 * One hidden input underneath, so the code fills itself from the text on
 * iPhone (oneTimeCode) and Android (sms-otp). Red boxes when it's wrong.
 */
export function CodeBoxes({ value, onChange, error, length = 6 }: {
    value: string;
    onChange: (v: string) => void;
    error?: boolean;
    length?: number;
}) {
    const { colors } = useTheme();
    const input = useRef<TextInput>(null);
    const focusAt = Math.min(value.length, length - 1);

    return (
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel={`Code, ${value.length} of ${length} digits`}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                {Array.from({ length }, (_, i) => {
                    const ch = value[i] ?? '';
                    const active = !error && i === focusAt && value.length < length;
                    return (
                        <View
                            key={i}
                            style={{
                                width: 48, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: colors.bg.surface, borderWidth: 1.5,
                                borderColor: error ? colors.status.danger : active ? colors.brand.accent : colors.line.default,
                            }}
                        >
                            <Text size={22} weight="bold" style={{ color: error ? colors.status.danger : colors.text.primary }}>{ch}</Text>
                        </View>
                    );
                })}
            </View>
            <TextInput
                ref={input}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                maxLength={length}
                caretHidden
                accessibilityLabel="Code"
                style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1, fontFamily: FONT.bold }}
            />
        </Pressable>
    );
}
