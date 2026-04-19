/** True when running `npm run dev:demo` (see `.env.demo`). No secrets — safe to commit. */
export const isSkydarkDemo = import.meta.env.VITE_SKYDARK_DEMO === "true";

/** Matches `WeeklyDay["condition"]` — used to force ambient card in demo. */
export type SkydarkDemoWeatherToken =
  | "sunny"
  | "cloudy"
  | "rain"
  | "snow"
  | "partly-cloudy";

const DEMO_WEATHER_ALLOWED = new Set<SkydarkDemoWeatherToken>([
  "sunny",
  "cloudy",
  "rain",
  "snow",
  "partly-cloudy",
]);

/** Normalize query/env values like `partly_cloudy` → `partly-cloudy`. */
export function parseSkydarkDemoWeatherToken(
  raw: string | null | undefined
): SkydarkDemoWeatherToken | null {
  if (raw == null || String(raw).trim() === "") return null;
  const v = String(raw).trim().toLowerCase().replace(/_/g, "-");
  return DEMO_WEATHER_ALLOWED.has(v as SkydarkDemoWeatherToken)
    ? (v as SkydarkDemoWeatherToken)
    : null;
}

/** `VITE_SKYDARK_DEMO_WEATHER` — embedded at dev/build start; restart dev after editing `.env.demo`. */
export function getSkydarkDemoWeatherEnvOverride(): SkydarkDemoWeatherToken | null {
  if (!isSkydarkDemo) return null;
  return parseSkydarkDemoWeatherToken(String(import.meta.env.VITE_SKYDARK_DEMO_WEATHER ?? ""));
}
