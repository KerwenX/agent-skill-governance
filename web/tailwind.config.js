/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1020",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
          300: "#CBD5E1",
          200: "#E2E8F0",
          100: "#F1F5F9",
          50:  "#F8FAFC",
        },
        brand: {
          50:  "#EEF4FF",
          100: "#DCE7FF",
          200: "#B9CDFF",
          300: "#88A8FF",
          400: "#5B82F6",
          500: "#3B62E0",
          600: "#2A48B8",
          700: "#1E3A8A",
          800: "#162C66",
          900: "#0E1E45",
        },
        signal: {
          amber:   "#F59E0B",
          emerald: "#10B981",
          rose:    "#F43F5E",
          violet:  "#8B5CF6",
          cyan:    "#06B6D4",
          orange:  "#F97316",
        },
      },
      fontFamily: {
        sans:   ['"Fira Sans"', "system-ui", "Segoe UI", "sans-serif"],
        mono:   ['"Fira Code"', "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.12)",
        pop:   "0 12px 40px -8px rgba(15,23,42,.25), 0 2px 6px rgba(15,23,42,.06)",
        ring:  "0 0 0 4px rgba(59,98,224,.18)",
      },
      borderRadius: {
        xl2: "14px",
      },
      keyframes: {
        pulseRing: {
          "0%":   { transform: "scale(.8)", opacity: ".6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        dash: {
          "0%":   { strokeDashoffset: "200" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        floatUp: {
          "0%":   { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.6s ease-out infinite",
        dash:      "dash 1.2s linear infinite",
        shimmer:   "shimmer 1.6s linear infinite",
        floatUp:   "floatUp .32s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
