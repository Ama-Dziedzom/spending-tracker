import React, { useEffect, useState } from 'react';
import { View, type KeyboardTypeOptions } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Button, FieldError, Sheet, Text } from '@/components/ui';
import { FONT } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

/** One field in a sheet: Name, Email. Errors say how to fix it (handoff §10). */
export function TextEditSheet({ visible, title, subtitle, label, initial, placeholder, keyboardType, autoCapitalize = 'words', validate, onSave, onClose, saveLabel = 'Save' }: {
    visible: boolean;
    title: string;
    subtitle?: string;
    label: string;
    initial: string;
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'words' | 'sentences';
    /** Returns a fix-it message, or null when fine. */
    validate: (v: string) => string | null;
    /** Throws with a user-facing message on failure. */
    onSave: (v: string) => Promise<void>;
    onClose: () => void;
    saveLabel?: string;
}) {
    const { colors } = useTheme();
    const [value, setValue] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (visible) { setValue(initial); setError(null); setBusy(false); } }, [visible, initial]);

    const save = async () => {
        const problem = validate(value.trim());
        if (problem) { setError(problem); return; }
        setBusy(true);
        try {
            await onSave(value.trim());
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Couldn’t save that. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} footer={<Button label={saveLabel} busy={busy} onPress={save} />}>
            <View style={{ gap: 6 }}>
                <Text variant="row" tone="secondary">{label}</Text>
                <BottomSheetTextInput
                    value={value}
                    onChangeText={(t) => { setValue(t); setError(null); }}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    autoFocus
                    accessibilityLabel={label}
                    returnKeyType="done"
                    onSubmitEditing={save}
                    style={{
                        fontFamily: FONT.semibold, fontSize: 16, color: colors.text.primary,
                        backgroundColor: colors.bg.muted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                        borderWidth: 1.5, borderColor: error ? colors.status.danger : 'transparent',
                    }}
                />
                {error && <FieldError message={error} />}
            </View>
        </Sheet>
    );
}
