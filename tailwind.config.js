/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#f47b20',
        'primary-dark': '#d4610a',
        'primary-light': '#ffa050',
        background: '#ffffff',
        surface: '#f9f9f9',
        'text-primary': '#1a1a1a',
        'text-secondary': '#666666',
        'text-muted': '#999999',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        border: '#e5e5e5',
      },
    },
  },
  plugins: [],
};
