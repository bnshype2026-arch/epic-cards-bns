/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0d',
        surface: '#121216',
        primary: '#3b82f6', // soft blue
        rarity: {
          common: '#a1a1aa',
          rare: '#60a5fa',
          epic: '#c084fc',
          legendary: '#fbbf24',
          mystic: '#f43f5e',
        }
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.6))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
