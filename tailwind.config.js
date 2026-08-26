/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          subtle: 'var(--color-surface-subtle)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-muted)',
        },
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          fg: 'var(--color-primary-fg)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          fg: 'var(--color-accent-fg)',
        },
        spot: {
          DEFAULT: 'var(--color-spot)',
          hover: 'var(--color-spot-hover)',
          fg: 'var(--color-spot-fg)',
        },
        ripe: {
          DEFAULT: 'var(--color-ripe)',
          bg: 'var(--color-ripe-bg)',
          border: 'var(--color-ripe-border)',
        },
        unripe: {
          DEFAULT: 'var(--color-unripe)',
          bg: 'var(--color-unripe-bg)',
          border: 'var(--color-unripe-border)',
        },
        borderline: {
          DEFAULT: 'var(--color-borderline)',
          bg: 'var(--color-borderline-bg)',
          border: 'var(--color-borderline-border)',
        },
        // Decorative raw palette ramps for charts / visualizers
        rind: {
          dark: '#14532d',
          base: '#16a34a',
          light: '#86efac',
          yellow: '#facc15',
          pale: '#fef08a'
        },
        flesh: {
          pink: '#fb7185',
          red: '#e11d48',
          deep: '#be123c'
        }
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-ui)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
