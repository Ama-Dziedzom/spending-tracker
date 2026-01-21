/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                urbanist: ["Urbanist"],
                "urbanist-light": ["Urbanist-Light"],
                "urbanist-bold": ["Urbanist-Bold"],
                "urbanist-medium": ["Urbanist-Medium"],
                "urbanist-semibold": ["Urbanist-SemiBold"],
            },
        },
    },
    plugins: [],
};
