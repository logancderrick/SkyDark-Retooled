/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  /** Set in `.env.demo` for `npm run dev:demo` — sample data, no HA WebSocket. */
  readonly VITE_SKYDARK_DEMO?: string;
  /**
   * When developing with `npm run dev` (not demo), point this at your real HA origin
   * so OAuth and the WebSocket use Home Assistant instead of `http://localhost:5173`.
   * Example: `https://homeassistant.local:8123`
   */
  readonly VITE_HASS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
