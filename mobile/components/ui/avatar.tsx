import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { RAW } from '@/constants/theme';
import { Text } from './text';

/** Stored as user_metadata.avatar. Never store or ask for gender (handoff §4). */
export type AvatarChoice = 'illustration_1' | 'illustration_2' | 'initials';

const SOURCES = {
    illustration_1: require('@/assets/avatars/illustration-1.png'),
    illustration_2: require('@/assets/avatars/illustration-2.svg'),
} as const;

const INITIALS_BG = RAW.avatarInitialsBg;
const INITIALS_INK = RAW.avatarInitialsInk;

interface Props {
    choice?: AvatarChoice | null;
    /** Display name; first letter is used for Initials. */
    name?: string | null;
    /** 38 in headers, 52 in Settings, 64 in the picker. */
    size?: number;
}

/** The person picks it; LogIt never guesses it. Default: Initials. */
export function Avatar({ choice, name, size = 38 }: Props) {
    const c: AvatarChoice = choice ?? 'initials';
    const radius = size / 2;

    if (c === 'initials') {
        const initial = (name?.trim()[0] ?? '?').toUpperCase();
        return (
            <View
                accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
                style={{ width: size, height: size, borderRadius: radius, backgroundColor: INITIALS_BG, alignItems: 'center', justifyContent: 'center' }}
            >
                <Text weight="extrabold" size={Math.round(size * 0.42)} style={{ color: INITIALS_INK }}>{initial}</Text>
            </View>
        );
    }
    return (
        <Image
            source={SOURCES[c]}
            style={{ width: size, height: size, borderRadius: radius }}
            contentFit="cover"
            accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
        />
    );
}
