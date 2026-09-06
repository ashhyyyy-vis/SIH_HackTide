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
          50: '#EEF3FA',
          100: '#D6E1F3',
          500: '#1D55A3',
          600: '#14407A',
          700: '#0F305C',
        },
        accent: {
          50: '#FBF1E6',
          500: '#D97A1F',
        },
        n: {
          900: '#1A1F2B',
          700: '#3D4453',
          500: '#6B7280',
          300: '#C9CFD8',
          200: '#E3E7EE',
          100: '#F1F3F7',
          0: '#FFFFFF',
        },
        bg: {
          page: '#F5F7FA',
          surface: '#FFFFFF',
          header: '#14407A',
          emphasis: '#EEF3FA',
          overlay: 'rgba(26,31,43,.5)',
        },
        success: {
          DEFAULT: '#1E7F4F',
          tint: '#E6F4EC',
          text: '#145C39',
        },
        warning: {
          DEFAULT: '#B7791F',
          tint: '#FBF3E0',
          text: '#7A5011',
        },
        error: {
          DEFAULT: '#B42318',
          tint: '#FCE9E7',
          text: '#8A1A12',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Kannada"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      spacing: {
        's1': '4px',
        's2': '8px',
        's3': '12px',
        's4': '16px',
        's6': '24px',
        's8': '32px',
        's12': '48px',
        's16': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'full': '999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(26,31,43,.06)',
        'md': '0 4px 12px rgba(26,31,43,.10)',
      },
      minHeight: {
        'tap': '48px',
      },
    },
  },
  plugins: [],
}
