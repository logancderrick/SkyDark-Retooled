import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/** Bust browser cache for stable `assets/main.js` filename on each production build. */
function skydarkMainCacheBust(): Plugin {
  return {
    name: "skydark-main-cache-bust",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /(src="[^"]*\/assets\/main\.js)"/,
        `$1?v=${Date.now()}"`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), skydarkMainCacheBust()],
  server: {
    /** Show Network URL in terminal; wall displays often hit the machine by LAN IP. */
    host: true,
    port: 5173,
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
        // Stable entry name so HA panel never 404s on a stale index.html → hashed main mismatch
        // after partial copies; lazy chunks stay content-hashed.
        entryFileNames: "assets/main.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
