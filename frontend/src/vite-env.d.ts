/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  /** Set in `.env.demo` for `npm run dev:demo` — sample data, no HA WebSocket. */
  readonly VITE_SKYDARK_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
