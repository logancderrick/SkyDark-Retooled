import { useMemo, useState, useEffect } from "react";

export interface WeeklyDay {
  dayLabel: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  condition: "sunny" | "cloudy" | "rain" | "snow" | "partly-cloudy";
}

export interface CurrentWeather {
  temperature: number;
  condition: WeeklyDay["condition"];
}

interface WeatherData {
  current: CurrentWeather | null;
  weekly: WeeklyDay[];
}

/** Map condition to a short display icon (emoji for no extra deps). */
export function getWeatherIcon(condition: WeeklyDay["condition"]): string {
  switch (condition) {
    case "sunny":
      return "☀️";
    case "partly-cloudy":
      return "⛅";
    case "cloudy":
      return "☁️";
    case "rain":
      return "🌧️";
    case "snow":
      return "❄️";
    default:
      return "☀️";
  }
}

const FALLBACK_COORDS = { lat: 40.7128, lon: -74.006 };
const WEATHER_REFRESH_MS = 30 * 60 * 1000;

function mapWeatherCode(code: number | undefined): WeeklyDay["condition"] {
  if (typeof code !== "number") return "sunny";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return "rain";
  }
  if ([1, 2].includes(code)) return "partly-cloudy";
  if (code === 3 || [45, 48].includes(code)) return "cloudy";
  return "sunny";
}

/** Mock 7-day forecast when no HA weather entity. */
function buildMockWeeklyForecast(): WeeklyDay[] {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const conditions: WeeklyDay["condition"][] = [
    "sunny",
    "partly-cloudy",
    "cloudy",
    "rain",
    "snow",
    "partly-cloudy",
    "sunny",
  ];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    const isToday = i === 0;
    return {
      dayLabel: isToday ? "Today" : dayNames[dayOfWeek],
      tempMin: 38 + (i % 5) * 2,
      tempMax: 58 + (i % 4) * 3,
      precipitation: [0, 10, 30, 60, 0, 20, 5][i % 7],
      condition: conditions[i % conditions.length],
    };
  });
}

function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(FALLBACK_COORDS),
      { timeout: 7000 }
    );
  });
}

function forecastFromOpenMeteo(payload: {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
}): WeatherData | null {
  if (!payload.daily) return null;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = payload.daily.time ?? [];
  const maxTemps = payload.daily.temperature_2m_max ?? [];
  const minTemps = payload.daily.temperature_2m_min ?? [];
  const precip = payload.daily.precipitation_probability_max ?? [];
  const weatherCodes = payload.daily.weather_code ?? [];
  const weekly: WeeklyDay[] = [];
  for (let i = 0; i < 7 && i < dates.length; i++) {
    const date = new Date(`${dates[i]}T00:00:00`);
    const isToday = i === 0;
    weekly.push({
      dayLabel: isToday ? "Today" : dayNames[date.getDay()],
      tempMin: Math.round(minTemps[i] ?? 0),
      tempMax: Math.round(maxTemps[i] ?? 0),
      precipitation: Math.round(precip[i] ?? 0),
      condition: mapWeatherCode(weatherCodes[i]),
    });
  }

  if (weekly.length === 0) return null;
  const current: CurrentWeather | null =
    typeof payload.current?.temperature_2m === "number"
      ? {
          temperature: Math.round(payload.current.temperature_2m),
          condition: mapWeatherCode(payload.current.weather_code),
        }
      : null;

  return { current, weekly };
}

export function useWeatherData(): WeatherData {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchWeather = async () => {
      try {
        const { lat, lon } = await getCurrentPosition();
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lon));
        url.searchParams.set("current", "temperature_2m,weather_code");
        url.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        );
        url.searchParams.set("temperature_unit", "fahrenheit");
        url.searchParams.set("precipitation_unit", "percent");
        url.searchParams.set("timezone", "auto");
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Weather fetch failed: ${response.status}`);
        const json = (await response.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
          daily?: {
            time?: string[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            precipitation_probability_max?: number[];
            weather_code?: number[];
          };
        };
        const parsed = forecastFromOpenMeteo(json);
        if (mounted && parsed) setWeatherData(parsed);
      } catch {
        if (mounted) setWeatherData(null);
      }
    };

    fetchWeather();
    const id = window.setInterval(fetchWeather, WEATHER_REFRESH_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  return useMemo(() => {
    if (weatherData) return weatherData;
    const weekly = buildMockWeeklyForecast();
    return {
      current: { temperature: weekly[0].tempMax, condition: weekly[0].condition },
      weekly,
    };
  }, [weatherData]);
}

export function useCurrentWeather(): CurrentWeather | null {
  return useWeatherData().current;
}

export function useWeeklyWeather(): WeeklyDay[] {
  return useWeatherData().weekly;
}
