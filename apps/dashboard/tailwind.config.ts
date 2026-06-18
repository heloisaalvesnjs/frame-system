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
        // ── New tokens (Lovable design system) ───────────────────
        'bg-base':      'var(--bg-base)',
        'bg-elevated':  'var(--bg-elevated)',
        'bg-surface':   'var(--bg-surface)',
        'bg-surface-2': 'var(--bg-surface-2)',
        'text-1':       'var(--text-1)',
        'text-2':       'var(--text-2)',
        'text-3':       'var(--text-3)',
        'text-4':       'var(--text-4)',
        'line-1':       'var(--line-1)',
        'line-2':       'var(--line-2)',
        'line-3':       'var(--line-3)',
        // ── Legacy aliases (backward compat) ─────────────────────
        bg:      'var(--bg-base)',
        surface: 'var(--bg-elevated)',
        raised:  'var(--bg-surface)',
        raised2: 'var(--bg-surface-2)',
        border:  'var(--line-2)',
        t1:      'var(--text-1)',
        t2:      'var(--text-2)',
        t3:      'var(--text-3)',
        t4:      'var(--text-4)',
        danger:  'var(--danger)',
        warning: 'var(--warning)',
        info:    'var(--info)',
        purple:  'var(--purple)',
        brand: {
          DEFAULT: 'var(--brand)',
          bright:  'var(--brand-bright)',
          lime:    'var(--brand-lime)',
          soft:    'var(--brand-soft)',
          ring:    'var(--brand-ring)',
          500:     '#2E7D32',
          600:     '#1B5E20',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"DM Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm:       'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        elevated: 'var(--shadow-elevated)',
        card:     'var(--shadow-sm)',
      },
    },
  },
  plugins: [],
}

export default config
