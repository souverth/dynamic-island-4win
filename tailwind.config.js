/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep matching colors from the original design
        'bg-color': '#09090b',
        'accent-color': '#007aff',
        'success-color': '#34c759',
        'warning-color': '#ff9500',
        'danger-color': '#ff3b30',
        'text-primary': '#ffffff',
        'text-secondary': '#8e8e93',
        'text-tertiary': '#48484a',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
