/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          bg: '#0F0E17',
          panel: '#151421',
          accent: '#A78BFA',
          border: '#2A293E'
        },
        ocean: {
          bg: '#0B131A',
          panel: '#111E29',
          accent: '#2DD4BF',
          border: '#203444'
        },
        forest: {
          bg: '#0B1410',
          panel: '#11221A',
          accent: '#4ADE80',
          border: '#203B2E'
        }
      }
    },
  },
  plugins: [],
}