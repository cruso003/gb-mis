import type { Config } from 'tailwindcss';

// MOGCSP brand palette — derived from the LWEP brochure (purple + green).
// Use CSS custom properties so themes can be extended in the future.

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    // Consume in apps by extending this config and adding app-specific content paths
  ],
  theme: {
    extend: {
      colors: {
        // MOGCSP brand purple (primary)
        brand: {
          50: '#f5f0ff',
          100: '#ede0ff',
          200: '#d8bfff',
          300: '#bc8fff',
          400: '#9b59b6',
          500: '#7b2d8b', // Primary brand purple (from brochure)
          600: '#6a1a7a',
          700: '#560d65',
          800: '#440850',
          900: '#340540',
          950: '#210230',
        },
        // MOGCSP accent green (secondary)
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Accent green (from brochure)
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Status colours aligned with accessibility requirements
        status: {
          open: '#3b82f6',      // blue
          urgent: '#f59e0b',    // amber
          critical: '#ef4444',  // red
          closed: '#6b7280',    // gray
          success: '#22c55e',   // green
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
