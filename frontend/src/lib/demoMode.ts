/** True when running `npm run dev:demo` (see `.env.demo`). No secrets — safe to commit. */
export const isSkydarkDemo = import.meta.env.VITE_SKYDARK_DEMO === "true";
