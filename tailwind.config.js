/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: 'rgba(124, 58, 237, 0.12)',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out 1',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%': { opacity: '0' },
          '40%': { opacity: '0.6' },
          '100%': { opacity: '0.15' },
        },
      },
    },
  },
  plugins: [],
}
