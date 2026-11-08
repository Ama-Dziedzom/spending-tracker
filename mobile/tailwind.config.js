const { tailwindColors } = require('./constants/tokens-css');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    // The in-app Theme switch (Light / Dark / Auto) drives this via lib/theme.tsx.
    darkMode: "class",
    theme: {
        extend: {
            // LogIt v1 tokens, values set per scheme as CSS variables by ThemeProvider.
            // e.g. bg-bg-canvas, bg-bg-surface, text-text-secondary, bg-cat-food-tint, border-line-default
            colors: tailwindColors(),
            fontFamily: {
                manrope: ["Manrope-Regular"],
                "manrope-medium": ["Manrope-Medium"],
                "manrope-semibold": ["Manrope-SemiBold"],
                "manrope-bold": ["Manrope-Bold"],
                "manrope-extrabold": ["Manrope-ExtraBold"],
                heading: ["Manrope-Bold"],
                body: ["Manrope-Regular"],
                numbers: ["Manrope-SemiBold"],
                hero: ["Manrope-ExtraBold"],
                ui: ["Manrope-Medium"],
                caption: ["Manrope-Regular"],
            },
            borderRadius: {
                card: "24px",
                sheet: "32px",
            },
        },
    },
    plugins: [],
};
