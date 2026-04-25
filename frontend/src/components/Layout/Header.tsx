import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/AppContext";
import PinPrompt from "../Common/PinPrompt";
import { useWeatherData, getWeatherIcon } from "../../hooks/useWeeklyWeather";
import { publicLogoUrl } from "../../lib/branding";
import ThemeToggleButton from "../Common/ThemeToggleButton";
import {
  isHaChromeHidden,
  onHaChromeStateChange,
  toggleHaChrome,
} from "../../lib/hideHaChrome";

interface HeaderProps {
  weatherEntity?: string;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  );
}

export default function Header({
  weatherEntity: _weatherEntity,
}: HeaderProps) {
  const { pathname } = useLocation();
  const [time, setTime] = useState("");
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const { settings, isLocked, unlockApp, setIsLocked } = useAppContext();

  // Track whether the HA sidebar + header are currently hidden
  const [haChromeHidden, setHaChromeHidden] = useState(isHaChromeHidden);
  useEffect(() => onHaChromeStateChange(setHaChromeHidden), []);
  /** Calendar body already has a full-width forecast card; skip duplicate header strip there. */
  const hideHeaderForecastOnCalendar = pathname === "/calendar";
  const weather = useWeatherData();
  const currentWeather = weather.current;
  const familyName = settings.familyName?.trim() || "The Derricks";

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="px-4 sm:px-6 py-3 sm:py-4 border-b border-skydark-border bg-skydark-bg"
      style={{ minHeight: 80 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-wrap">
          <img
            src={publicLogoUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain shrink-0 md:hidden"
            aria-hidden
          />
          <h1 className="text-lg sm:text-xl font-semibold text-skydark-text truncate">
            {familyName}
          </h1>
          <span className="text-base sm:text-lg font-semibold text-skydark-text shrink-0 tabular-nums">
            {time}
          </span>
          {weather.locationLabel && (
            <span className="text-sm sm:text-base font-medium text-skydark-text-secondary shrink-0">
              {weather.locationLabel}
            </span>
          )}
          <span className="text-base sm:text-lg font-semibold text-skydark-text shrink-0">
            {currentWeather
              ? `${getWeatherIcon(currentWeather.condition)} ${currentWeather.temperature}°`
              : "Weather"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          {/* HA sidebar/header toggle — only shown when inside HA iframe */}
          {window.parent !== window && (
            <button
              type="button"
              onClick={toggleHaChrome}
              title={haChromeHidden ? "Show HA sidebar" : "Hide HA sidebar"}
              aria-label={haChromeHidden ? "Show HA sidebar" : "Hide HA sidebar"}
              className="p-2 rounded-lg opacity-30 hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-skydark-accent"
            >
              {/* Panel / sidebar icon */}
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-skydark-text"
                aria-hidden
              >
                {haChromeHidden ? (
                  /* Sidebar-hidden state: show "expand" arrows */
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <polyline points="13 8 17 12 13 16" />
                  </>
                ) : (
                  /* Sidebar-visible state: show "collapse" arrows */
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <polyline points="15 8 11 12 15 16" />
                  </>
                )}
              </svg>
            </button>
          )}
          <ThemeToggleButton />
          {settings.showTopWeeklyForecast &&
            !hideHeaderForecastOnCalendar &&
            weather.weekly.length > 0 && (
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[52vw]"
              aria-label="Top weekly forecast"
            >
              {weather.weekly.slice(0, 7).map((day) => (
                <div
                  key={day.dayLabel}
                  className="rounded-lg border border-skydark-border bg-skydark-surface px-2 py-1 min-w-[86px] text-center"
                >
                  <div className="text-[11px] font-medium text-skydark-text-secondary">{day.dayLabel}</div>
                  <div className="text-sm">{getWeatherIcon(day.condition)}</div>
                  <div className="text-[11px] text-skydark-text">
                    {day.tempMin}° / {day.tempMax}°
                  </div>
                </div>
              ))}
            </div>
          )}
          {settings.lockEnabled && (
            <div className="flex items-center shrink-0">
              {isLocked ? (
                <button
                  type="button"
                  onClick={() => setShowUnlockPrompt(true)}
                  className="p-2 rounded-lg hover:bg-skydark-surface-muted focus:outline-none focus:ring-2 focus:ring-skydark-accent"
                  aria-label="Unlock (enter PIN)"
                >
                  <LockIcon className="w-6 h-6 text-red-500" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLocked(true)}
                  className="p-2 rounded-lg hover:bg-skydark-surface-muted focus:outline-none focus:ring-2 focus:ring-skydark-accent"
                  aria-label="Lock"
                >
                  <UnlockIcon className="w-6 h-6 text-green-500" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <PinPrompt
        open={showUnlockPrompt}
        onClose={() => setShowUnlockPrompt(false)}
        onVerify={(pin) => unlockApp(pin)}
        title="Enter PIN to unlock"
      />
    </header>
  );
}
