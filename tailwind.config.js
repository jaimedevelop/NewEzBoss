/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'ai-settings-pulse': {
          '0%, 100%': { backgroundColor: '#ffedd5', borderColor: '#fb923c' },
          '50%': { backgroundColor: '#fdba74', borderColor: '#ea580c' },
        },
        'dropdown-slide': {
          '0%': { opacity: '0', transform: 'scaleY(0.85) translateY(-6px)' },
          '100%': { opacity: '1', transform: 'scaleY(1) translateY(0)' },
        },
      },
      animation: {
        'ai-settings-pulse': 'ai-settings-pulse 1.5s ease-in-out infinite',
        'dropdown-slide': 'dropdown-slide 150ms ease-out',
      },
    },
  },
  plugins: [],
};
