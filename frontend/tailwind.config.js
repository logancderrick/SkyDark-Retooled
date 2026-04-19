/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./src/**/*.css"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1366px",
      "tablet-landscape": "1280px",
      "tablet-portrait": { max: "1023px" },
      "tablet-sm": "768px",
      "tablet-md": "1024px",
      "tablet-lg": "1280px",
      mobile: { max: "767px" },
    },
    extend: {
      colors: {
        skydark: {
          bg: "var(--sd-bg)",
          text: "var(--sd-text)",
          "text-secondary": "var(--sd-text-secondary)",
          accent: "var(--sd-accent)",
          "accent-bg": "var(--sd-accent-bg)",
          surface: "var(--sd-surface)",
          "surface-muted": "var(--sd-surface-muted)",
          "surface-hover": "var(--sd-surface-hover)",
          "surface-elevated": "var(--sd-surface-elevated)",
          border: "var(--sd-border)",
          "grid-line": "var(--sd-grid-line)",
          "toggle-track": "var(--sd-toggle-track)",
          pink: "#FFD4D4",
          "pink-dark": "#FFBABA",
          blue: "#C8E6F5",
          "blue-dark": "#A5D8EC",
          green: "#C8F5E8",
          "green-dark": "#9EE5CC",
          yellow: "#FFF4D4",
          "yellow-dark": "#FFE9A3",
          purple: "#E8D8F5",
          "purple-dark": "#D4C1EC",
          orange: "#FFE5D4",
          "orange-dark": "#FFD4B8",
          "checkbox-completed": "#9EE5CC",
        },
      },
      fontFamily: {
        sans: [
          '"Bitcount Grid Single"',
          "ui-monospace",
          "Cambria Math",
          "monospace",
        ],
      },
      boxShadow: {
        skydark: "0 2px 8px rgba(0, 0, 0, 0.08)",
        "skydark-hover": "0 4px 12px rgba(0, 0, 0, 0.12)",
        "skydark-modal": "0 8px 24px rgba(0, 0, 0, 0.15)",
        fab: "0 4px 16px rgba(59, 155, 191, 0.4)",
      },
      borderRadius: {
        card: "8px",
        "card-lg": "12px",
        modal: "16px",
        "xl": "12px",
        "2xl": "16px",
      },
      fontSize: {
        "skydark-header": ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        "skydark-body": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "skydark-body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "skydark-small": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        "skydark-small-lg": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      keyframes: {
        skydarkWeatherDrift: {
          "0%, 100%": { transform: "translate(-8%, -6%) rotate(0deg)" },
          "50%": { transform: "translate(10%, 8%) rotate(6deg)" },
        },
        skydarkWeatherPulse: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.65" },
        },
        /** Vertical rain streak sheets (background-position loop). */
        skydarkRainSheets: {
          "0%": { backgroundPosition: "0 0, 12px 0" },
          "100%": { backgroundPosition: "0 72px, 12px 72px" },
        },
        /** Gentle snowfall drift (background-position loop). */
        skydarkSnowSheets: {
          "0%": { backgroundPosition: "0 0, 18px 8px, 8px 20px" },
          "100%": { backgroundPosition: "0 96px, 18px 104px, 8px 116px" },
        },
        /** Sunny haze breathing. */
        skydarkSunPulse: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1) translate(0, 0)" },
          "50%": { opacity: "0.85", transform: "scale(1.06) translate(2%, -1%)" },
        },
      },
      animation: {
        "skydark-weather-drift": "skydarkWeatherDrift 16s ease-in-out infinite",
        "skydark-weather-pulse": "skydarkWeatherPulse 7s ease-in-out infinite",
        "skydark-rain-sheets": "skydarkRainSheets 0.75s linear infinite",
        "skydark-snow-sheets": "skydarkSnowSheets 14s linear infinite",
        "skydark-sun-pulse": "skydarkSunPulse 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
