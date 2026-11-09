import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '@/lib/theme';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

interface DialogProps {
    visible: boolean;
    /** Called for the safe choice and on backdrop / back press. */
    onCancel: () => void;
    onConfirm: () => void;
    icon: IconName;
    /** 'danger' for deletes, 'neutral' for discard-style confirms. */
    tone?: 'danger' | 'neutral';
    title: string;
    body?: string;
    /** Safe choice, on the left. */
    cancelLabel: string;
    confirmLabel: string;
    /** Confirm above cancel, full width (Log out, Figma 1013:2008). */
    stacked?: boolean;
}

/**
 * Only for things that can't be undone or lose work. The safe choice sits on
 * the left. Never used for offline or errors (those are banners/toasts).
 */
export function Dialog({ visible, onCancel, onConfirm, icon, tone = 'danger', title, body, cancelLabel, confirmLabel, stacked }: DialogProps) {
    const { colors, shadows } = useTheme();
    const danger = tone === 'danger';
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
            <Pressable
                onPress={onCancel}
                accessibilityLabel="Dismiss"
                style={{ flex: 1, backgroundColor: colors.bg.scrim, justifyContent: 'center', paddingHorizontal: 20 }}
            >
                <Pressable
                    // Swallow taps so they don't reach the backdrop.
                    onPress={() => {}}
                    accessibilityViewIsModal
                    style={{
                        backgroundColor: colors.bg.raised, borderRadius: 28, borderWidth: 1, borderColor: colors.line.default,
                        padding: 20, gap: 12, alignItems: 'center', ...shadows.card,
                    }}
                >
                    <View style={{ width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? colors.status['danger-tint'] : colors.brand['accent-tint'] }}>
                        <Icon name={icon} size={22} color={danger ? colors.status.danger : colors.brand['accent-text']} />
                    </View>
                    <Text variant="cardTitle" align="center" accessibilityRole="header">{title}</Text>
                    {body && <Text size={13} tone="secondary" align="center">{body}</Text>}
                    {stacked ? (
                        <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 4 }}>
                            <Button label={confirmLabel} onPress={onConfirm} variant={danger ? 'danger' : 'ink'} />
                            <Button label={cancelLabel} onPress={onCancel} variant="secondary" />
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
                            <Button label={cancelLabel} onPress={onCancel} variant="secondary" size="md" fill />
                            <Button label={confirmLabel} onPress={onConfirm} variant={danger ? 'danger' : 'ink'} size="md" fill />
                        </View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
