/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hindi: ["Noto Sans Devanagari", "sans-serif"],
        ui: ["IBM Plex Sans", "sans-serif"],
      },
      colors: {
        saffron: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        india: {
          green: "#138808",
          orange: "#FF9933",
          blue: "#000080",
        },
      },
    },
  },
  plugins: [],
};
