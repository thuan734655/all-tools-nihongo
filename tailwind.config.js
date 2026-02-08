/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'primary-hover': '#0b6bcb',
        'primary-light': '#e0f0ff',
        'background-light': '#f6f7f8',
        'background-dark': '#101922',
        'surface-light': '#ffffff',
        'surface-dark': '#1a2632',
        'text-main': '#111418',
        'text-sub': '#617589',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
        body: ['Lexend', 'sans-serif'],
        japanese: ['Noto Sans JP', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
