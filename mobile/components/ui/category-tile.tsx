import React from 'react';
import { View } from 'react-native';
import { RADIUS, type CategoryColor } from '@/constants/theme';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Tone = CategoryColor | 'accent' | 'success' | 'warn' | 'danger' | 'muted';

interface Props {
    /** Category key (cat/*) or a semantic tone for non-category rows. */
    tone: Tone;
    icon?: IconName;
    /** Person rows show initials in a circle instead of an icon. */
    initials?: string;
    /** 22–44. Icon is ~50 % of the tile. */
    size?: number;
}

/** Rounded square (radius ≈ 32 %), tint fill, coloured icon (handoff §4). */
export function CategoryTile({ tone, icon, initials, size = 40 }: Props) {
    const { colors } = useTheme();
    const { fill, fg } = toneColors(colors, tone);
    const iconSize = Math.round(size * 0.5);
    return (
        <View
            style={{
                width: size, height: size,
                borderRadius: initials ? 999 : RADIUS.tile(size),
                backgroundColor: fill,
                alignItems: 'center', justifyContent: 'center',
            }}
        >
            {initials ? (
                <Text weight="extrabold" size={Math.round(size * 0.33)} style={{ color: colors.brand['accent-text'] }}>
                    {initials}
                </Text>
            ) : icon ? (
                <Icon name={icon} size={iconSize} color={fg} />
            ) : null}
        </View>
    );
}

function toneColors(colors: ReturnType<typeof useTheme>['colors'], tone: Tone) {
    switch (tone) {
        case 'accent': return { fill: colors.brand['accent-tint'], fg: colors.brand['accent-text'] };
        case 'success': return { fill: colors.status['success-tint'], fg: colors.status.success };
        case 'warn': return { fill: colors.status['warn-tint'], fg: colors.status.warn };
        case 'danger': return { fill: colors.status['danger-tint'], fg: colors.status.danger };
        case 'muted': return { fill: colors.bg.muted, fg: colors.text.secondary };
        default: return { fill: colors.cat[`${tone}-tint`], fg: colors.cat[tone] };
    }
}
