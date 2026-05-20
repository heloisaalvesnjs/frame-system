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
        brand: {
          50:  '#edfdf5',
          100: '#d3f9e7',
          200: '#aaf0d1',
          300: '#6ee4b7',
          400: '#32cf93',
          500: '#10c97a',
          600: '#0aad68',
          700: '#098a54',
          800: '#0a6d44',
          900: '#0d4a32',
        },
        ui: {
          bg:       '#111318',
          card:     '#181c27',
          elevated: '#1e2233',
          border:   '#252d3c',
          sidebar:  '#0d2118',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
