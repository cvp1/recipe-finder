/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef7ee",
          100: "#fdedd3",
          200: "#fad7a5",
          300: "#f6b96d",
          400: "#f19132",
          500: "#ee7710",
          600: "#df5d09",
          700: "#b9450a",
          800: "#933710",
          900: "#772f10",
        },
      },
    },
  },
  plugins: [],
};
