/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#13131a',
        primary: '#f43f5e', // Rose color for admin panel differentiation
        primaryHover: '#e11d48',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8'
      }
    },
  },
  plugins: [],
}
