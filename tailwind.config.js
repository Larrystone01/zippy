/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fffaf0",
          100: "#fff4dd",
          200: "#f4c76b",
          500: "#b2843a",
          600: "#b2843a",
          700: "#987033",
          900: "#17130f",
        },
      },
    },
  },
  plugins: [],
};
