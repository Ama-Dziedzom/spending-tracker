import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, Button, Sheet, Text, useToast, type AvatarChoice } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { setAvatar } from '@/lib/settings-service';

const CHOICES: { value: AvatarChoice; label: string }[] = [
    { value: 'illustration_1', label: 'Illustration 1' },
    { value: 'illustration_2', label: 'Illustration 2' },
    { value: 'initials', label: 'Initials' },
];

/**
 * Pick your avatar (Figma 1013:1793): three choices, no gender field.
 * Initials is the default; saved as user_metadata.avatar.
 */
export function AvatarPickerSheet({ visible, current, name, onClose, onSaved }: {
    visible: boolean;
    current: AvatarChoice;
    name: string | null;
    onClose: () => void;
    onSaved: (a: AvatarChoice) => void;
}) {
    const { colors } = useTheme();
    const toast = useToast();
    const [choice, setChoice] = useState<AvatarChoice>(current);
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (visible) setChoice(current); }, [visible, current]);

    const save = async () => {
        setBusy(true);
        try {
            await setAvatar(choice);
            onSaved(choice);
            onClose();
        } catch (e) {
            toast.show({ message: e instanceof Error ? e.message : 'Couldn’t save that.', icon: 'alert' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Pick your avatar"
            subtitle="Just how you appear in LogIt. We never ask for or guess your gender."
            footer={<Button label="Use this" busy={busy} onPress={save} />}
        >
            <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
                {CHOICES.map((c) => {
                    const active = c.value === choice;
                    return (
                        <Pressable
                            key={c.value}
                            onPress={() => setChoice(c.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={c.label}
                            style={{
                                flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 18,
                                borderWidth: 2, borderColor: active ? colors.brand.accent : colors.line.default,
                                backgroundColor: colors.bg.surface,
                            }}
                        >
                            <Avatar choice={c.value} name={name} size={52} />
                            <Text size={12} weight={active ? 'bold' : 'semibold'} tone={active ? 'accent' : 'primary'}>{c.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </Sheet>
    );
}
