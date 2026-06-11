import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (CSS vars, theme-aware) ──────────────
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        raised:   'var(--raised)',
        raised2:  'var(--raised-2)',
        border:   'var(--border)',
        t1:       'var(--t1)',
        t2:       'var(--t2)',
        t3:       'var(--t3)',
        t4:       'var(--t4)',

        // ── Semantic status colors ───────────────────────────────
        danger:  'var(--danger)',
        warning: 'var(--warning)',
        info:    'var(--info)',
        purple:  'var(--purple)',

        // ── Brand (hex — suporta Tailwind opacity modifiers) ─────
        brand: {
          DEFAULT: '#00C27C',
          50:      '#E8FBF4',
          100:     '#C6F6E4',
          400:     '#00E892',
          500:     '#00C27C',
          600:     '#009A62',
          700:     '#007A4E',
          subtle:  '#0B2E1E',
        },

        // ── Legacy aliases (backward compat) ─────────────────────
        ui: {
          bg:       'var(--bg)',
          card:     'var(--surface)',
          elevated: 'var(--raised)',
          border:   'var(--border)',
          sidebar:  'var(--bg)',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)',
        'card-md': '0 4px 8px rgba(0,0,0,.10), 0 2px 4px rgba(0,0,0,.06)',
      },
    },
  },
  plugins: [],
}

export default config
