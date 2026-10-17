/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode base
        surface: {
          900: '#111110',
          800: '#1C1C1A',
          700: '#272724',
          600: '#313130',
          500: '#3E3E3C',
        },
        // Light mode base
        light: {
          100: '#FAF8F4',
          200: '#F0EDE6',
          300: '#E4DFD6',
          400: '#C8C2B8',
        },
        // Accent - dusty saffron
        accent: {
          DEFAULT: '#C4923A',
          light: '#D4A855',
          dark: '#A67830',
          muted: '#C4923A26',
        },
        // Text
        ink: {
          primary: '#F0EDE8',
          secondary: '#A09C96',
          muted: '#6B6762',
        },
        // Ledger people colors
        person: {
          H: '#7B9E87',
          S: '#8B7BA8',
          L: '#C4923A',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
