import type { Config } from 'tailwindcss';

/**
 * TYPE design system — light edition.
 * A soft white canvas with a single accent: lime #CCFF00. Lime is used as a
 * FILL (buttons, your sent bubbles, the highlight marker) with dark ink on top;
 * for the rare lime TEXT accent use `lime-deep`, which stays readable on white.
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
        // Surfaces (soft white, warm neutral)
        canvas: '#FAFAF7', // app background
        surface: '#FFFFFF', // cards, sidebar
        elevated: '#F1F2EC', // inputs, incoming bubbles, chips
        hover: '#E9EAE2', // hover state
        line: '#E6E7DF', // hairline borders
        'line-strong': '#D5D7CB',

        // Text
        fg: '#15160E', // primary near-black text
        muted: '#6A6C5E', // secondary text
        faint: '#9B9D8F', // tertiary / placeholders

        // The one accent
        lime: {
          DEFAULT: '#CCFF00',
          bright: '#D7FF45',
          deep: '#5F7A00', // readable lime for TEXT on white/light
          ink: '#1A1F00', // text/icon color placed ON a lime fill
        },
        danger: '#D6453C',
        online: '#2EA043',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['var(--font-display)', 'ui-serif', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(204,255,0,0.7), 0 8px 24px -6px rgba(150,190,0,0.45)',
        'glow-sm': '0 6px 18px -6px rgba(150,190,0,0.5)',
        soft: '0 8px 30px -14px rgba(20,22,8,0.18)',
        pop: '0 16px 50px -18px rgba(20,22,8,0.28)',
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
        'bunny-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-6px) rotate(-1.5deg)' },
          '60%': { transform: 'translateY(-10px) rotate(1.5deg)' },
        },
        'bunny-hop': {
          '0%, 70%, 100%': { transform: 'translateY(0)' },
          '78%': { transform: 'translateY(-14px)' },
          '86%': { transform: 'translateY(0)' },
          '90%': { transform: 'translateY(-5px)' },
          '94%': { transform: 'translateY(0)' },
        },
        'aura-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.18s ease-out both',
        'bubble-in': 'bubble-in 0.2s cubic-bezier(0.22,1,0.36,1) both',
        blink: 'blink 1.2s ease-in-out infinite',
        'bunny-float': 'bunny-float 4s ease-in-out infinite',
        'bunny-hop': 'bunny-hop 5.5s ease-in-out infinite',
        'aura-pulse': 'aura-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
