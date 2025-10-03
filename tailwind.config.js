/** @type {import('tailwindcss').Config} */
/* here where all custom themes goes */
const customTheme = require('./src/theme.ts'); // Import your theme

module.exports = {
  content: [
    "./src/*.{tsx, ts}" // which files to scan to find tailwind class names.
  ],
  theme: {
    extend: {
      colors: {
        ...customTheme.colors
      },
      fontFamily: {
        ...customTheme.fontFamily
      }
    },
  },
  plugins: [],
}

