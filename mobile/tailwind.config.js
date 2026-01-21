/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                manrope: ["Manrope-Regular"],
                "manrope-medium": ["Manrope-Medium"],
                "manrope-semibold": ["Manrope-SemiBold"],
                "manrope-bold": ["Manrope-Bold"],
                heading: ["Manrope-Bold"],
                body: ["Manrope-Regular"],
                numbers: ["Manrope-SemiBold"],
                ui: ["Manrope-Medium"],
                caption: ["Manrope-Regular"],
            },
        },
    },
    plugins: [],
};
