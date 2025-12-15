/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aleo', 'serif'],
        serif: ['Aleo', 'serif'],
      },
      animation: {
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'pulse-glow': 'pulse-glow-sync 1.5s ease-in-out infinite',
        'pulse-glow-ring': 'pulse-glow-sync 1.5s ease-in-out infinite',
        'pulse-text': 'pulse-text 1.5s ease-in-out infinite',
        'check-entrance': 'check-entrance 1000ms ease-out forwards',
        'standout-text-entrance': 'standout-text-entrance 800ms ease-out forwards',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        'pulse-glow-sync': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(139, 92, 246, 0.4)' },
          '50%': { boxShadow: '0 0 16px 4px rgba(139, 92, 246, 0.7)' },
        },
        'pulse-text': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        'check-entrance': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'standout-text-entrance': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      }
    },
  },
  plugins: [],
}
