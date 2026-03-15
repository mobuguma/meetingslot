import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 반응형 기준점: 768px (SPEC-001, SPEC-003)
      screens: {
        sm600: "768px",
      },
      // DESIGN-GUIDE.md에 정의된 색상 토큰
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          light: "#DBEAFE",
          300: "#93C5FD",
          500: "#3B82F6",
          700: "#1D4ED8",
          dark: "#1E40AF",
        },
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        error: "#EF4444",
        success: "#22C55E",
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
