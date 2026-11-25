import React from 'react';
import { View } from 'react-native';
import { Icon, ListGroup, ListRow, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { ALL_COUNTRIES, type Country } from '@/lib/currency';

/** The flag in a muted tile, the size of a category tile (Figma 1282:6173). */
export function FlagTile({ country, size = 38 }: { country: Country; size?: number }) {
    const { colors } = useTheme();
    return (
        <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.bg.muted, alignItems: 'center', justifyContent: 'center' }}>
            <Text size={Math.round(size * 0.5)}>{country.flag}</Text>
        </View>
    );
}

/**
 * Country sheet (Figma "Country sheet" and "Change currency"). Ghana first,
 * then A to Z. At sign up it shows dialling codes; in Settings, currencies only.
 */
export function CountrySheet({ visible, onClose, selected, onPick, title, subtitle, withDial }: {
    visible: boolean;
    onClose: () => void;
    selected: Country['code'];
    onPick: (c: Country) => void;
    title: string;
    subtitle: string;
    withDial?: boolean;
}) {
    const { colors } = useTheme();
    return (
        <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
            <ListGroup bare>
                {ALL_COUNTRIES.map((c) => {
                    const on = c.code === selected;
                    return (
                        <ListRow
                            key={c.code}
                            dense
                            leading={<FlagTile country={c} />}
                            title={c.name}
                            meta={`${c.currencyName} · ${c.label}${withDial ? ` · +${c.dial}` : ''}`}
                            trailing={on ? <Icon name="tick" size={18} color={colors.brand['accent-text']} /> : 'none'}
                            onPress={() => onPick(c)}
                            accessibilityLabel={`${c.name}, ${c.currencyName}${on ? ', selected' : ''}`}
                        />
                    );
                })}
            </ListGroup>
        </Sheet>
    );
}
