import type { Config } from 'tailwindcss';

/**
 * TYPE design system.
 * One accent — lime #CCFF00 — over a near-black / white grayscale.
 * Minimalist, high-contrast, calm. Lime is reserved for brand, actions,
 * focus, and "this is yours" signals (sent bubbles, active states).
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces (dark, neutral with a faint cool cast)
        canvas: '#0B0B0E', // app background
        surface: '#141418', // cards, sidebar
        elevated: '#1C1C22', // popovers, inputs, incoming bubbles
        hover: '#22222A', // hover state on dark surfaces
        line: '#27272F', // hairline borders
        'line-strong': '#34343E',

        // Text
        fg: '#F5F5F7', // primary text
        muted: '#9A9AA5', // secondary text
        faint: '#65656F', // tertiary / placeholders

        // The one accent
        lime: {
          DEFAULT: '#CCFF00',
          bright: '#D9FF40',
          deep: '#A8D400',
          ink: '#1A1F00', // text/icon color placed ON lime
        },
        danger: '#FF5C5C',
        online: '#34E27A',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(204,255,0,0.5), 0 0 24px -4px rgba(204,255,0,0.45)',
        'glow-sm': '0 0 16px -6px rgba(204,255,0,0.5)',
        soft: '0 8px 30px -12px rgba(0,0,0,0.6)',
        pop: '0 12px 40px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'bubble-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        blink: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
        'bubble-in': 'bubble-in 0.2s cubic-bezier(0.22,1,0.36,1) both',
        blink: 'blink 1.2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.22,1,0.36,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
