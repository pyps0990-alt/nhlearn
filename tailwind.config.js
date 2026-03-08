/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: '#FAFAFC', // Slightly darker, softer white to reduce glare
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Nunito', 'Noto Sans TC', 'ui-rounded', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(0, 0, 0, 0.04)',
        'neo': '8px 8px 16px rgba(0, 0, 0, 0.03), -8px -8px 16px rgba(255, 255, 255, 0.8)',
        'float': '0 20px 40px -10px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'slide-up-fade': 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pop-in': 'popIn 0.8s cubic-bezier(0.25, 1.25, 0.5, 1) forwards',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.05)',
        'spring-bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(10px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', filter: 'blur(5px)' },
          '100%': { opacity: '1', filter: 'blur(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  plugins: [],
}