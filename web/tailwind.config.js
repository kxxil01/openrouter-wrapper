/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        claude: {
          primary: '#8C52FF',
          secondary: '#B17DFF',
          light: '#E9DEFF',
          dark: '#2E0070',
        },
        dark: {
          primary: '#121212',
          secondary: '#1E1E1E',
          tertiary: '#2D2D2D',
          accent: '#8C52FF',
          text: '#E0E0E0',
          muted: '#A0A0A0',
          border: '#3D3D3D',
          hover: '#3A3A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
