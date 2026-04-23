/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./src/**/*.css"],
  /** Weather ambient uses many `animate-skydark-*` utilities; keep them in prod CSS even if JIT misses a edge case. */
  safelist: [{ pattern: /^animate-skydark-/ }, "motion-safe:animate-skydark-sky-breath", "motion-reduce:animate-none"],
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
        sans: ["Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
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
        /** A single raindrop falling vertically (uses translate from above the card to below). */
        skydarkRainDrop: {
          "0%": { transform: "translate3d(0, -20%, 0)", opacity: "0" },
          "10%": { opacity: "0.85" },
          "90%": { opacity: "0.85" },
          "100%": { transform: "translate3d(-8%, 110%, 0)", opacity: "0" },
        },
        /** A snowflake drifting downward with a sinusoidal sway. */
        skydarkSnowFlake: {
          "0%": { transform: "translate3d(0, -10%, 0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "0.95" },
          "50%": { transform: "translate3d(14px, 50%, 0) rotate(180deg)" },
          "90%": { opacity: "0.95" },
          "100%": { transform: "translate3d(-10px, 110%, 0) rotate(360deg)", opacity: "0" },
        },
        /** Slow rotation of the sun rays. */
        skydarkSunSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        /** Glowing pulse for the sun core. */
        skydarkSunGlow: {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        /** Twinkling stars. */
        skydarkStarTwinkle: {
          "0%, 100%": { opacity: "0.25", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        /** Lightning flash sequence. */
        skydarkLightningFlash: {
          "0%, 92%, 100%": { opacity: "0" },
          "93%": { opacity: "0.85" },
          "94%": { opacity: "0" },
          "95%": { opacity: "0.6" },
          "96%": { opacity: "0" },
          "97%": { opacity: "0.4" },
          "98%": { opacity: "0" },
        },
        /** Subtle horizontal cloud drift. */
        skydarkCloudDrift: {
          "0%": { transform: "translate3d(-12%, 0, 0)" },
          "100%": { transform: "translate3d(12%, 0, 0)" },
        },
        /** Very slow sky opacity so night / static gradients still feel alive. */
        skydarkSkyBreath: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.88" },
        },
      },
      animation: {
        "skydark-weather-drift": "skydarkWeatherDrift 16s ease-in-out infinite",
        "skydark-weather-pulse": "skydarkWeatherPulse 7s ease-in-out infinite",
        "skydark-rain-sheets": "skydarkRainSheets 0.75s linear infinite",
        "skydark-snow-sheets": "skydarkSnowSheets 14s linear infinite",
        "skydark-sun-pulse": "skydarkSunPulse 8s ease-in-out infinite",
        "skydark-rain-drop": "skydarkRainDrop 1.05s linear infinite",
        "skydark-snow-flake": "skydarkSnowFlake 9s linear infinite",
        "skydark-sun-spin": "skydarkSunSpin 100s linear infinite",
        "skydark-sun-glow": "skydarkSunGlow 6s ease-in-out infinite",
        "skydark-star-twinkle": "skydarkStarTwinkle 3.6s ease-in-out infinite",
        "skydark-lightning-flash": "skydarkLightningFlash 7s ease-in-out infinite",
        "skydark-cloud-drift": "skydarkCloudDrift 28s ease-in-out infinite alternate",
        "skydark-sky-breath": "skydarkSkyBreath 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
