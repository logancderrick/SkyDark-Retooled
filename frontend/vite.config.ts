import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "."), "");
  const hassTarget = (env.VITE_HASS_URL ?? "").trim().replace(/\/+$/, "");

  return {
    plugins: [react()],
    server: {
      /** Show Network URL in terminal; wall displays often hit the machine by LAN IP. */
      host: true,
      port: 5173,
      /**
       * Dev-only: `/api/*` must hit Home Assistant, not Vite. Without this, relative HA URLs like
       * `/api/camera_proxy_stream/...` and `/api/skydark_calendar/photo/...` resolve to
       * `http://localhost:5173/api/...` → 404. Requires `VITE_HASS_URL` in `.env.local`.
       */
      proxy: hassTarget
        ? {
            "/api": {
              target: hassTarget,
              changeOrigin: true,
              secure: false,
              ws: true,
            },
          }
        : undefined,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    base: "/skydark/",
    build: {
      outDir: resolve(__dirname, "../custom_components/skydark_calendar/www"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
        output: {
          // Stable entry name — index.html is served no-cache by the Python backend
          // so a stable main.js never causes stale-reference 404s after HACS updates.
          // Lazy chunks remain content-hashed for efficient browser caching.
          entryFileNames: "assets/main.js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
