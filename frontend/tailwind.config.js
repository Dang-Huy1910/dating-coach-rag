/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Màu chủ đạo: Hồng cánh sen (Magenta)
        magenta: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#D91B5C', // Core Magenta
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        // Màu chủ đạo: Đỏ cam (Passionate Red/Orange)
        passion: {
          50: '#FFF5F2',
          100: '#FFE8E2',
          200: '#FED0C5',
          300: '#FCB09F',
          400: '#F97F67',
          500: '#F95738', // Core Red-Orange
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Màu chủ đạo: Hồng neon (Playful Pink)
        neon: {
          pink: '#FF2A85',
          light: '#FF70AB',
          glow: 'rgba(255, 42, 133, 0.4)',
        },
        // Màu bổ trợ: Trắng, Xám nhạt, Than đen
        charcoal: {
          DEFAULT: '#18181B', // Than đen sắc nét
          soft: '#27272A',
          deep: '#09090B',
          muted: '#71717A',
          faint: '#A1A1AA',
        },
        paper: {
          DEFAULT: '#F8F9FA', // Xám nhạt nền
          card: '#FFFFFF',    // Trắng tinh khiết
          subtle: '#F3F4F6',  // Xám nhạt thứ cấp
          border: '#E5E7EB',  // Đường viền tóc
          hover: '#EFEFEF',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-neon': '0 0 20px rgba(255, 42, 133, 0.25)',
        'glow-magenta': '0 4px 20px rgba(217, 27, 92, 0.2)',
        'glow-passion': '0 4px 20px rgba(249, 87, 56, 0.2)',
      }
    },
  },
  plugins: [],
}

