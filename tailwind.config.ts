import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'repixl-bg': '#121012',
        'repixl-bone': '#F4EFE9',
        'repixl-red': '#C22C2C',
        'repixl-rose': '#EBD3CE',
        'repixl-charcoal': '#16131a',
        'repixl-text-light': '#F5F1EC',
        'repixl-text-dark': '#1A1816',
        'repixl-muted': '#8C8580',
        'repixl-success': '#5A6E4E',
        'repixl-warning': '#C98A2B',
      },
      fontFamily: {
        display: ['var(--font-general-sans)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      maxWidth: {
        container: '1440px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['1.25rem', { lineHeight: '1.3' }],
      },
    },
  },
  plugins: [],
}

export default config
