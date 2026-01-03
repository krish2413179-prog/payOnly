/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#0a0a0a',
        'electric-blue': '#00d4ff',
        'neon-green': '#39ff14',
        'gold': '#ffd700',
        'danger-red': '#ff3b30',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'space': ['Space Grotesk', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.33)',
            opacity: '1',
          },
          '80%, 100%': {
            transform: 'scale(2.33)',
            opacity: '0',
          },
        },
        'heartbeat': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
  },
  plugins: [],
}