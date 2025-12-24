/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gpt: {
          bg: '#212121',
          sidebar: '#171717',
          input: '#2f2f2f',
          hover: '#2f2f2f',
          border: '#424242',
          text: '#ececec',
          muted: '#9b9b9b',
          user: '#2f2f2f',
          assistant: '#212121',
          accent: '#10a37f',
        },
      },
      fontFamily: {
        sans: ['Söhne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Söhne Mono', 'Monaco', 'Andale Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
