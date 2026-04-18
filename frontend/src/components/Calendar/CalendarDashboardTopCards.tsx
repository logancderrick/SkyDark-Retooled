import type { Connection } from "home-assistant-js-websocket";
import CalendarCameraPreview from "./CalendarCameraPreview";
import { useWeatherData, getWeatherIcon, type WeeklyDay } from "../../hooks/useWeeklyWeather";
import { isSkydarkDemo } from "../../lib/demoMode";

function ForecastDayCell({ day }: { day: WeeklyDay }) {
  return (
    <div className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-3 text-center sm:min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-skydark-text-secondary">
        {day.dayLabel}
      </span>
      <span className="text-2xl leading-none" aria-hidden>
        {getWeatherIcon(day.condition)}
      </span>
      <span className="text-sm font-semibold text-skydark-text">
        {day.tempMin}° / {day.tempMax}°
      </span>
      <span className="text-xs text-skydark-text-secondary">{day.precipitation}% precip</span>
    </div>
  );
}

interface CalendarDashboardTopCardsProps {
  connection: Connection | null;
  cameraEntityIds: string[];
  rotateIntervalSec: number;
}

/**
 * Large weather, forecast, and camera tiles for the top of the calendar page only.
 * Does not alter month/week/day views or sidebar.
 */
export default function CalendarDashboardTopCards({
  connection,
  cameraEntityIds,
  rotateIntervalSec,
}: CalendarDashboardTopCardsProps) {
  const weather = useWeatherData();
  const cur = weather.current;
  const weekly = weather.weekly.slice(0, 7);

  return (
    <div className="mb-5 grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
      <section
        className="relative isolate min-h-[220px] overflow-hidden rounded-2xl border border-gray-200 shadow-skydark"
        aria-label="Current weather"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <div className="absolute -left-1/3 -top-1/3 h-[140%] w-[90%] rounded-full bg-gradient-to-br from-sky-200/70 via-indigo-200/50 to-violet-200/40 blur-3xl animate-skydark-weather-drift" />
          <div className="absolute -right-1/4 bottom-0 h-[110%] w-[70%] rounded-full bg-gradient-to-tl from-cyan-100/60 via-sky-100/40 to-transparent blur-2xl animate-skydark-weather-pulse" />
        </div>
        <div className="relative z-10 flex min-h-[220px] flex-col bg-white/90 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-skydark-text-secondary">
                Current conditions
              </p>
              {weather.locationLabel && (
                <p className="mt-1 text-sm font-medium text-skydark-text">{weather.locationLabel}</p>
              )}
            </div>
            <button
              type="button"
              data-compact
              onClick={() => weather.refresh()}
              disabled={weather.refreshing}
              className="rounded-lg border border-gray-200 bg-white/60 px-2 py-1 text-xs font-medium text-skydark-accent hover:bg-skydark-accent-bg disabled:opacity-50"
            >
              {weather.refreshing ? "…" : "Refresh"}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <span className="text-6xl leading-none sm:text-7xl" aria-hidden>
              {cur ? getWeatherIcon(cur.condition) : "—"}
            </span>
            <div>
              <p className="text-5xl font-bold tabular-nums leading-none text-skydark-text sm:text-6xl">
                {cur ? `${cur.temperature}°` : "—"}
              </p>
              {(cur?.humidity != null || cur?.windMph != null) && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-skydark-text-secondary">
                  {cur.humidity != null && (
                    <>
                      <dt className="font-medium">Humidity</dt>
                      <dd className="tabular-nums text-skydark-text">{cur.humidity}%</dd>
                    </>
                  )}
                  {cur.windMph != null && (
                    <>
                      <dt className="font-medium">Wind</dt>
                      <dd className="tabular-nums text-skydark-text">{cur.windMph} mph</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="flex min-h-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-skydark"
        aria-label="Seven day forecast"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-skydark-text-secondary">
          7-day forecast
        </p>
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1 sm:overflow-visible">
          {weekly.map((day, i) => (
            <ForecastDayCell key={`${i}-${day.dayLabel}`} day={day} />
          ))}
        </div>
      </section>

      <section
        className="flex h-[220px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-skydark"
        aria-label="Camera preview"
      >
        {(connection || isSkydarkDemo) && cameraEntityIds.length > 0 ? (
          <CalendarCameraPreview
            embedded
            connection={connection}
            cameraEntityIds={cameraEntityIds}
            rotateIntervalSec={rotateIntervalSec}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-skydark-text-secondary">
            Connect to Home Assistant and add camera entities under Settings → Calendar preview cameras.
          </div>
        )}
      </section>
    </div>
  );
}
