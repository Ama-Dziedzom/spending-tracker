import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * The Ask LogIt mark (Figma component "LogIt / Ask mark", 1211:6084): the app
 * icon's brand-blue tile with a soft white speech bubble and the wordmark's
 * yellow corner dot. Replaces the sparkle wherever LogIt speaks. Drawn at 72
 * and scaled, so it stays crisp at any size. Fixed colours on purpose: it's a
 * logo, the same in light and dark.
 */
export function AskMark({ size = 34 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Defs>
                <LinearGradient id="askTile" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#4469F0" />
                    <Stop offset="0.55" stopColor="#1642E5" />
                    <Stop offset="1" stopColor="#1642E5" />
                </LinearGradient>
                <LinearGradient id="askBubble" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" />
                    <Stop offset="1" stopColor="#DBE3FA" />
                </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="72" height="72" rx="20" fill="url(#askTile)" />
            <Rect x="0.75" y="0.75" width="70.5" height="70.5" rx="19.25" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} />
            {/* Bubble shadow, then the bubble */}
            <Path d="M36 22c-11.6 0-21 7.8-21 17.5 0 5.2 2.7 9.8 7 13L20.5 60l9.4-4.4c1.9.5 3.9.7 6.1.7 11.6 0 21-7.8 21-17.4C57 29.8 47.6 22 36 22Z" fill="#0A1E73" fillOpacity={0.3} />
            <Path d="M36 19c-11.6 0-21 7.8-21 17.5 0 5.2 2.7 9.8 7 13L20.5 57l9.4-4.4c1.9.5 3.9.7 6.1.7 11.6 0 21-7.8 21-17.4C57 26.8 47.6 19 36 19Z" fill="url(#askBubble)" />
            <Path d="M47 13h11v11c-6.1 0-11-4.9-11-11Z" fill="#FFCC00" />
        </Svg>
    );
}
