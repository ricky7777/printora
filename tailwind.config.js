/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './templates/**/*.liquid',
    './assets/*.{css,js}',
  ],
  theme: {
    extend: {
      colors: {
        mint: '#A8E6CF',
        'mint-light': '#C8F0E0',
        'mint-dark': '#88D4AB',
        'pastel-pink': '#FFB6C1',
        'soft-gray': '#6B7280',
        'deep-gray': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
