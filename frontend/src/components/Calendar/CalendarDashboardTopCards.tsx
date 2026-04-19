import { useWeatherData, getWeatherIcon, type WeeklyDay } from "../../hooks/useWeeklyWeather";
import WeatherCardAmbient from "./WeatherCardAmbient";

function ForecastDayCell({ day }: { day: WeeklyDay }) {
  return (
    <div className="flex min-w-[3.5rem] flex-1 flex-col items-center gap-0.5 rounded-lg border border-skydark-border bg-skydark-surface px-1.5 py-2 text-center sm:min-w-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-skydark-text-secondary">
        {day.dayLabel}
      </span>
      <span className="text-xl leading-none" aria-hidden>
        {getWeatherIcon(day.condition)}
      </span>
      <span className="text-xs font-semibold text-skydark-text">
        {day.tempMin}° / {day.tempMax}°
      </span>
      <span className="text-[0.65rem] text-skydark-text-secondary">{day.precipitation}% precip</span>
    </div>
  );
}

/**
 * Weather and forecast tiles for the top of the calendar page only.
 * Does not alter month/week/day views or sidebar.
 */
export default function CalendarDashboardTopCards() {
  const weather = useWeatherData();
  const cur = weather.current;
  const weekly = weather.weekly.slice(0, 7);
  const ambientCondition = cur?.condition ?? "sunny";

  return (
    <div className="mb-5 grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4">
      <section
        className="relative isolate flex h-[165px] flex-col overflow-hidden rounded-2xl border border-skydark-border shadow-skydark"
        aria-label="Current weather"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          aria-hidden
        >
          <WeatherCardAmbient condition={ambientCondition} />
        </div>
        <div className="relative z-10 flex flex-1 flex-col bg-skydark-surface-elevated p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-skydark-text-secondary">
                Current conditions
              </p>
              {weather.locationLabel && (
                <p className="mt-0.5 text-xs font-medium text-skydark-text">{weather.locationLabel}</p>
              )}
            </div>
            <button
              type="button"
              data-compact
              onClick={() => weather.refresh()}
              disabled={weather.refreshing}
              className="rounded-lg border border-skydark-border bg-skydark-surface-muted px-2 py-0.5 text-[0.65rem] font-medium text-skydark-accent hover:bg-skydark-accent-bg disabled:opacity-50"
            >
              {weather.refreshing ? "…" : "Refresh"}
            </button>
          </div>
          <div className="mt-3 flex flex-1 items-center gap-4">
            <span className="text-5xl leading-none sm:text-6xl" aria-hidden>
              {cur ? getWeatherIcon(cur.condition) : "—"}
            </span>
            <div>
              <p className="text-4xl font-bold tabular-nums leading-none text-skydark-text sm:text-5xl">
                {cur ? `${cur.temperature}°` : "—"}
              </p>
              {(cur?.humidity != null || cur?.windMph != null) && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-skydark-text-secondary">
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
        className="flex h-[165px] flex-col rounded-2xl border border-skydark-border bg-skydark-surface p-3 shadow-skydark"
        aria-label="Seven day forecast"
      >
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-skydark-text-secondary">
          7-day forecast
        </p>
        <div className="flex min-h-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-0.5 sm:overflow-visible">
          {weekly.map((day, i) => (
            <ForecastDayCell key={`${i}-${day.dayLabel}`} day={day} />
          ))}
        </div>
      </section>
    </div>
  );
}
