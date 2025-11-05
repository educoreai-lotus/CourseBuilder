/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          500: '#00A676'
        },
        cyan: {
          500: '#1DD3B0'
        }
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px'
      }
    },
  },
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [],
}


