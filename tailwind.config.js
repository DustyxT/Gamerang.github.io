/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00f7ff',
        'neon-pink': '#ff00f7',
        'neon-purple': '#9d00ff',
        'dark-bg': '#0f0f1a',
        'card-bg': '#1a1a2e',
      },
      fontFamily: {
        'header': ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 