import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS Configuration
 *
 * Design system for the Oyrenoyret.org platform.
 * Color palette: ChatGPT/Codex neutral surfaces with a blue action accent.
 * Design tone: quiet, direct, rounded where functional, and content-first.
 */

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontWeight: {
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        comfortaa: ['var(--font-comfortaa)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic colors (shadcn/ui) - must come first
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: 'hsl(var(--success))',
        info: 'hsl(var(--info))',
        warning: 'hsl(var(--warning))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Exact neutral ramp used by ChatGPT-like content and chrome.
        neutral: {
          50: '#f9f9f9',
          100: '#f4f4f4',
          200: '#e8e8e8',
          300: '#d0d0d0',
          400: '#b4b4b4',
          500: '#8f8f8f',
          600: '#5d5d5d',
          700: '#3f3f3f',
          800: '#2f2f2f',
          900: '#212121',
          950: '#0d0d0d',
        },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      animation: {
        'progress-fill': 'progress-fill 0.5s ease-out',
        'bounce-in': 'bounce-in 0.4s ease-out',
        'skeleton-shimmer': 'skeleton-shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        'skeleton-shimmer': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
