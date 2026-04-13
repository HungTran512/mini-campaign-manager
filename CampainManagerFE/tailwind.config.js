/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        /** Used when a recipient field passes validation (user-requested “cursive” cue). */
        validScript: ['cursive', 'Brush Script MT', 'Segoe Script', 'serif'],
      },
      colors: {
        ink: {
          950: '#0c0f14',
          900: '#121722',
          800: '#1a2130',
          700: '#252e42',
        },
        mist: '#94a3b8',
        accent: {
          DEFAULT: '#c9a227',
          dim: '#9a7b1c',
        },
      },
    },
  },
  plugins: [],
};
