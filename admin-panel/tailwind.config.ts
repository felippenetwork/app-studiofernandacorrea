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
          DEFAULT: '#1e1b2e',
          hover: '#2a2740',
          active: '#352f54',
          border: '#2e2b42',
          text: '#a8a3c4',
          'text-active': '#f0eeff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
