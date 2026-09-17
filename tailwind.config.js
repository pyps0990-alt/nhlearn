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
        white: '#FAFAF7', // 紙感白，降低眩光
        'pure-white': '#FFFFFF',

        /*
         * 調色盤與前導頁統一：改用螢光筆／海報質感的高彩度平塗色，
         * 取代 Tailwind 預設偏灰的色階。
         * 色相刻意保留區分（課表以色相辨識科目），只調整彩度與明度性格。
         */

        // 主色 — 薄荷綠
        emerald: {
          50: '#e6fbf3', 100: '#c2f5e2', 200: '#86ebc6', 300: '#45dfa7',
          400: '#12d492', 500: '#00c07f', 600: '#00a06a', 700: '#008055',
          800: '#006343', 900: '#004b33', 950: '#002a1d',
        },
        teal: {
          50: '#e6faf9', 100: '#c0f3ef', 200: '#82e7e0', 300: '#3ad8cf',
          400: '#0ec6bd', 500: '#00aaa3', 600: '#008d87', 700: '#00706c',
          800: '#005754', 900: '#00423f', 950: '#002524',
        },
        green: {
          50: '#edfbe8', 100: '#d6f5cc', 200: '#aeeb9c', 300: '#7cdc63',
          400: '#53cb36', 500: '#36b01e', 600: '#2a9117', 700: '#207312',
          800: '#19590e', 900: '#12430b', 950: '#082606',
        },

        // 次色 — 電光藍
        blue: {
          50: '#ecefff', 100: '#d5dcff', 200: '#adbaff', 300: '#8094ff',
          400: '#546eff', 500: '#2b4cff', 600: '#1c34d9', 700: '#1527ab',
          800: '#101d80', 900: '#0c1659', 950: '#060b33',
        },
        sky: {
          50: '#e6f6ff', 100: '#c2ebff', 200: '#85d6ff', 300: '#3fbdff',
          400: '#0ba4f5', 500: '#0087d1', 600: '#006fac', 700: '#005887',
          800: '#004468', 900: '#00334e', 950: '#001d2c',
        },
        indigo: {
          50: '#efecff', 100: '#ddd6ff', 200: '#bdaeff', 300: '#9a81ff',
          400: '#7b5cff', 500: '#5f3bf0', 600: '#4a2bc9', 700: '#3a219e',
          800: '#2d1a78', 900: '#211356', 950: '#130a31',
        },
        purple: {
          50: '#f6eaff', 100: '#ecd2ff', 200: '#daa6ff', 300: '#c574ff',
          400: '#b249fa', 500: '#9c2ce0', 600: '#8021ba', 700: '#661a94',
          800: '#4e1471', 900: '#390f53', 950: '#20082f',
        },
        violet: {
          50: '#f3ecff', 100: '#e5d7ff', 200: '#caaeff', 300: '#ac80ff',
          400: '#9159fa', 500: '#7a3ae5', 600: '#632bbe', 700: '#4e2197',
          800: '#3c1a74', 900: '#2b1254', 950: '#180a2f',
        },

        // 強調 — 桃紅
        rose: {
          50: '#fff0f3', 100: '#ffdbe2', 200: '#ffb8c6', 300: '#ff8da3',
          400: '#ff6b87', 500: '#f52f57', 600: '#cf1e43', 700: '#a71634',
          800: '#801128', 900: '#5c0c1d', 950: '#350610',
        },
        pink: {
          50: '#ffeef7', 100: '#ffd6ed', 200: '#ffabd9', 300: '#ff78c1',
          400: '#fa4da8', 500: '#e5278d', 600: '#bd1a73', 700: '#97145b',
          800: '#730f45', 900: '#530a32', 950: '#2f051c',
        },
        red: {
          50: '#ffeeec', 100: '#ffd7d2', 200: '#ffaea5', 300: '#ff7d6e',
          400: '#fa5340', 500: '#e5331e', 600: '#bd2414', 700: '#961b0f',
          800: '#72140b', 900: '#530e08', 950: '#2f0704',
        },
        orange: {
          50: '#fff2e6', 100: '#ffe1c2', 200: '#ffc285', 300: '#ff9e3d',
          400: '#fa820b', 500: '#dd6a00', 600: '#b65500', 700: '#914300',
          800: '#6e3300', 900: '#502500', 950: '#2d1500',
        },

        // 提示 — 螢光黃（500 以下壓深以確保白字可讀）
        amber: {
          50: '#fffbe6', 100: '#fff4b8', 200: '#ffe97a', 300: '#ffdd3d',
          400: '#ffd000', 500: '#e0aa00', 600: '#b88a00', 700: '#916c00',
          800: '#6e5200', 900: '#503b00', 950: '#2d2100',
        },
        yellow: {
          50: '#fffde6', 100: '#fffab0', 200: '#fff266', 300: '#ffe600',
          400: '#f0d400', 500: '#d1b700', 600: '#ab9500', 700: '#877500',
          800: '#665900', 900: '#4b4100', 950: '#2a2500',
        },

        // 中性 — 紙與墨
        slate: {
          50: '#f8f7f4', 100: '#f2f1ec', 200: '#e4e2da', 300: '#cfccc1',
          400: '#9c998f', 500: '#6d6b64', 600: '#54524d', 700: '#3e3d39',
          800: '#2a2926', 900: '#1c1c1a', 950: '#111110',
        },
        gray: {
          50: '#f8f8f6', 100: '#f2f2ef', 200: '#e5e4df', 300: '#d0cfc8',
          400: '#9d9c95', 500: '#6e6d68', 600: '#555450', 700: '#3f3f3b',
          800: '#2b2a28', 900: '#1d1d1b', 950: '#121211',
        },
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
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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