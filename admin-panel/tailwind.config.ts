import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C9A4A0',
          accent: '#C9A87C',
          bg: '#F8F5F2',
        },
        sidebar: {
          DEFAULT: '#141218',
          hover: '#1f1c28',
          active: '#1f1c28',
          border: '#262333',
          text: '#8b8599',
          'text-active': '#f5f3ff',
          section: '#4a4660',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
