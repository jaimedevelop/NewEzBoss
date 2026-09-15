/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'dropdown-slide': {
          '0%': { opacity: '0', transform: 'scaleY(0.85) translateY(-6px)' },
          '100%': { opacity: '1', transform: 'scaleY(1) translateY(0)' },
        },
      },
      animation: {
        'dropdown-slide': 'dropdown-slide 150ms ease-out',
      },
    },
  },
  plugins: [],
};
