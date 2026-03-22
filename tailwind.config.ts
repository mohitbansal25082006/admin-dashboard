// Admin-Dashboard/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#6C63FF',
          dark:    '#5A52E0',
          light:   'rgba(108, 99, 255, 0.15)',
        },
        surface: {
          base:     '#080810',
          DEFAULT:  '#0D0D1A',
          elevated: '#13131F',
          card:     '#16162A',
        },
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'animate-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'fade-in':        'fade-in 0.2s ease-out',
        'animate-in':     'animate-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;