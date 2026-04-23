import type { ReactNode } from "react";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import { useWeatherData } from "../hooks/useWeeklyWeather";

function BootstrapSplash() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-skydark-bg px-6 text-center text-skydark-text">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-skydark-border border-t-skydark-accent" aria-hidden />
      <p className="text-sm text-skydark-text-secondary">Loading SkyDark…</p>
    </div>
  );
}

/**
 * Delays showing the main shell until SkyDark’s first HA payload has finished loading and the
 * first weather request has settled, so the header and calendar are not briefly populated with
 * local defaults / mock forecast tiles.
 */
export default function AppBootstrapGate({ children }: { children: ReactNode }) {
  const skydark = useSkydarkDataContext();
  const weather = useWeatherData();

  const skydarkSettled = skydark?.data == null ? true : !skydark.data.loading;
  const ready = skydarkSettled && weather.initialFetchComplete;

  if (!ready) {
    return <BootstrapSplash />;
  }

  return <>{children}</>;
}
