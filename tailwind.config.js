/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#080d16',
          900: '#0d1526',
          800: '#111d35',
          700: '#162244',
          600: '#1e2f57',
        },
      },
    },
  },
  plugins: [],
};
