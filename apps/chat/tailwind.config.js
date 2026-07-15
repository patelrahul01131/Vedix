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
        primary: '#4f46e5',
        primaryHover: '#6366f1',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8'
      }
    },
  },
  plugins: [],
}
