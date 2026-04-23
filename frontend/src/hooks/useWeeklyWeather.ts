import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext";
import {
  getSkydarkDemoWeatherEnvOverride,
  isSkydarkDemo,
  parseSkydarkDemoWeatherToken,
  type SkydarkDemoWeatherToken,
} from "../lib/demoMode";

export interface WeeklyDay {
  dayLabel: string;
  tempMin: number;
  tempMax: number;
  /** Probability of precipitation 0–100 (max for the day). */
  precipitation: number;
  /** Total precipitation in inches for the day. */
  precipitationIn?: number;
  /** Max wind gust/speed in mph for the day. */
  windMph?: number;
  /** Dominant wind direction in degrees (meteorological). */
  windDirectionDeg?: number;
  /** ISO timestamp for sunrise on the local day. */
  sunriseIso?: string;
  /** ISO timestamp for sunset on the local day. */
  sunsetIso?: string;
  condition: "sunny" | "cloudy" | "rain" | "snow" | "partly-cloudy";
}

export interface CurrentWeather {
  temperature: number;
  condition: WeeklyDay["condition"];
  /** Relative humidity 0–100 when provided by the API. */
  humidity?: number;
  /** Wind speed in mph when provided by the API. */
  windMph?: number;
  /** Wind direction in degrees (meteorological). */
  windDirectionDeg?: number;
  /** Apparent (feels-like) temperature in °F. */
  apparentTemperature?: number;
  /** Visibility in miles. */
  visibilityMiles?: number;
}

interface WeatherData {
  current: CurrentWeather | null;
  weekly: WeeklyDay[];
}

interface WeatherDataWithMeta extends WeatherData {
  locationLabel: string | null;
  refreshing: boolean;
  refresh: () => void;
  /** True after the first Open-Meteo request finishes (success or failure). Used to avoid flashing mock header data on cold load. */
  initialFetchComplete: boolean;
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

/** Mock 9-day forecast when no HA weather entity (matches improved card). */
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
    "cloudy",
    "partly-cloudy",
  ];
  const precipIns = [0.32, 0.37, 0, 0, 0, 0, 0, 0.12, 0.04];
  const winds = [3, 6, 8, 2, 5, 6, 6, 10, 4];
  const windDirs = [200, 240, 90, 60, 180, 220, 160, 300, 350];
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    const isToday = i === 0;
    const sunrise = new Date(d);
    sunrise.setHours(6, 42, 0, 0);
    const sunset = new Date(d);
    sunset.setHours(19, 18, 0, 0);
    return {
      dayLabel: isToday ? "Today" : dayNames[dayOfWeek],
      tempMin: 38 + (i % 5) * 2,
      tempMax: 58 + (i % 4) * 3,
      precipitation: [0, 10, 30, 60, 0, 20, 5, 25, 8][i],
      precipitationIn: precipIns[i],
      windMph: winds[i],
      windDirectionDeg: windDirs[i],
      sunriseIso: sunrise.toISOString(),
      sunsetIso: sunset.toISOString(),
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

function normalizeUsZip(rawZip: string | undefined): string | null {
  if (!rawZip) return null;
  const cleaned = rawZip.trim();
  // Accept both 5-digit ZIP and ZIP+4 (with or without hyphen),
  // then normalize to the 5-digit base ZIP for lookup.
  const normalized = cleaned.replace(/\s+/g, "");
  const fiveDigit = normalized.match(/^(\d{5})(?:-\d{4}|\d{4})?$/);
  return fiveDigit ? fiveDigit[1] : null;
}

async function getCoordsFromZippopotam(
  zip: string
): Promise<{ lat: number; lon: number; locationLabel: string | null } | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) return null;
    const json = (await response.json()) as {
      places?: Array<{
        latitude?: string;
        longitude?: string;
        "place name"?: string;
        "state abbreviation"?: string;
      }>;
    };
    const firstPlace = json.places?.[0];
    if (!firstPlace?.latitude || !firstPlace?.longitude) return null;
    const lat = Number.parseFloat(firstPlace.latitude);
    const lon = Number.parseFloat(firstPlace.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    const city = firstPlace["place name"]?.trim();
    const state = firstPlace["state abbreviation"]?.trim();
    const locationLabel = city && state ? `${city}, ${state}` : null;
    return { lat, lon, locationLabel };
  } catch {
    return null;
  }
}

async function getCoordsFromOpenMeteoGeocoding(
  zip: string
): Promise<{ lat: number; lon: number; locationLabel: string | null } | null> {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", zip);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("countryCode", "US");
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const json = (await response.json()) as {
      results?: Array<{
        latitude?: number;
        longitude?: number;
        name?: string;
        admin1?: string;
      }>;
    };
    const first = json.results?.[0];
    if (typeof first?.latitude !== "number" || typeof first?.longitude !== "number") return null;
    const city = first.name?.trim();
    const state = first.admin1?.trim();
    const locationLabel = city && state ? `${city}, ${state}` : city ?? null;
    return {
      lat: first.latitude,
      lon: first.longitude,
      locationLabel,
    };
  } catch {
    return null;
  }
}

async function getCoordsFromZip(
  zip: string
): Promise<{ lat: number; lon: number; locationLabel: string | null } | null> {
  const primary = await getCoordsFromZippopotam(zip);
  if (primary) return primary;
  return getCoordsFromOpenMeteoGeocoding(zip);
}

function forecastFromOpenMeteo(payload: {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    apparent_temperature?: number;
    visibility?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
    weather_code?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}): WeatherData | null {
  if (!payload.daily) return null;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = payload.daily.time ?? [];
  const maxTemps = payload.daily.temperature_2m_max ?? [];
  const minTemps = payload.daily.temperature_2m_min ?? [];
  const precipProb = payload.daily.precipitation_probability_max ?? [];
  const precipSum = payload.daily.precipitation_sum ?? [];
  const windMaxs = payload.daily.wind_speed_10m_max ?? [];
  const windDirs = payload.daily.wind_direction_10m_dominant ?? [];
  const weatherCodes = payload.daily.weather_code ?? [];
  const sunrises = payload.daily.sunrise ?? [];
  const sunsets = payload.daily.sunset ?? [];
  const weekly: WeeklyDay[] = [];
  const dayCount = Math.min(dates.length, 9);
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(`${dates[i]}T00:00:00`);
    const isToday = i === 0;
    weekly.push({
      dayLabel: isToday ? "Today" : dayNames[date.getDay()],
      tempMin: Math.round(minTemps[i] ?? 0),
      tempMax: Math.round(maxTemps[i] ?? 0),
      precipitation: Math.round(precipProb[i] ?? 0),
      ...(typeof precipSum[i] === "number"
        ? { precipitationIn: Math.round((precipSum[i] ?? 0) * 100) / 100 }
        : {}),
      ...(typeof windMaxs[i] === "number"
        ? { windMph: Math.round(windMaxs[i] ?? 0) }
        : {}),
      ...(typeof windDirs[i] === "number"
        ? { windDirectionDeg: Math.round(windDirs[i] ?? 0) }
        : {}),
      ...(typeof sunrises[i] === "string" ? { sunriseIso: sunrises[i] } : {}),
      ...(typeof sunsets[i] === "string" ? { sunsetIso: sunsets[i] } : {}),
      condition: mapWeatherCode(weatherCodes[i]),
    });
  }

  if (weekly.length === 0) return null;
  const current: CurrentWeather | null =
    typeof payload.current?.temperature_2m === "number"
      ? {
          temperature: Math.round(payload.current.temperature_2m),
          condition: mapWeatherCode(payload.current.weather_code),
          ...(typeof payload.current.relative_humidity_2m === "number"
            ? { humidity: Math.round(payload.current.relative_humidity_2m) }
            : {}),
          ...(typeof payload.current.wind_speed_10m === "number"
            ? { windMph: Math.round(payload.current.wind_speed_10m) }
            : {}),
          ...(typeof payload.current.wind_direction_10m === "number"
            ? { windDirectionDeg: Math.round(payload.current.wind_direction_10m) }
            : {}),
          ...(typeof payload.current.apparent_temperature === "number"
            ? { apparentTemperature: Math.round(payload.current.apparent_temperature) }
            : {}),
          ...(typeof payload.current.visibility === "number"
            ? {
                // Open-Meteo returns visibility in meters; convert to miles.
                visibilityMiles:
                  Math.round((payload.current.visibility / 1609.344) * 10) / 10,
              }
            : {}),
        }
      : null;

  return { current, weekly };
}

function resolveDemoWeatherOverride(search: string): SkydarkDemoWeatherToken | null {
  if (!isSkydarkDemo) return null;
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(qs);
  const fromUrl =
    parseSkydarkDemoWeatherToken(params.get("demoWeather")) ??
    parseSkydarkDemoWeatherToken(params.get("weather"));
  return fromUrl ?? getSkydarkDemoWeatherEnvOverride();
}

function applyDemoWeatherCondition(
  data: WeatherData,
  condition: SkydarkDemoWeatherToken
): WeatherData {
  return {
    ...data,
    current: data.current
      ? { ...data.current, condition }
      : {
          temperature: data.weekly[0]?.tempMax ?? 72,
          condition,
        },
    weekly: data.weekly.map((d, i) => (i === 0 ? { ...d, condition } : d)),
  };
}

export function useWeatherData(): WeatherDataWithMeta {
  const { settings } = useAppContext();
  const location = useLocation();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const weatherZipCode = settings.weatherZipCode;
  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchWeather = async () => {
      if (mounted) setRefreshing(true);
      try {
        const normalizedZip = normalizeUsZip(weatherZipCode);
        const zipCoords = normalizedZip ? await getCoordsFromZip(normalizedZip) : null;
        const { lat, lon } = zipCoords ?? (await getCurrentPosition());
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lon));
        url.searchParams.set(
          "current",
          "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,visibility"
        );
        url.searchParams.set("wind_speed_unit", "mph");
        url.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset"
        );
        url.searchParams.set("temperature_unit", "fahrenheit");
        url.searchParams.set("precipitation_unit", "inch");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "9");
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`Weather fetch failed: ${response.status}`);
        const json = (await response.json()) as {
          current?: {
            temperature_2m?: number;
            weather_code?: number;
            relative_humidity_2m?: number;
            wind_speed_10m?: number;
            wind_direction_10m?: number;
            apparent_temperature?: number;
            visibility?: number;
          };
          daily?: {
            time?: string[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            precipitation_probability_max?: number[];
            precipitation_sum?: number[];
            wind_speed_10m_max?: number[];
            wind_direction_10m_dominant?: number[];
            weather_code?: number[];
            sunrise?: string[];
            sunset?: string[];
          };
        };
        const parsed = forecastFromOpenMeteo(json);
        if (mounted) {
          if (parsed) setWeatherData(parsed);
          setLocationLabel(zipCoords?.locationLabel ?? null);
        }
      } catch {
        if (mounted) {
          setWeatherData(null);
          setLocationLabel(null);
        }
      } finally {
        if (mounted) {
          setRefreshing(false);
          setInitialFetchComplete(true);
        }
      }
    };

    fetchWeather();
    const id = window.setInterval(fetchWeather, WEATHER_REFRESH_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [weatherZipCode, refreshTick]);

  return useMemo(() => {
    const demoCondition = resolveDemoWeatherOverride(location.search);
    const patch = (data: WeatherData): WeatherData =>
      demoCondition ? applyDemoWeatherCondition(data, demoCondition) : data;

    if (weatherData) {
      return {
        ...patch(weatherData),
        locationLabel,
        refreshing,
        refresh,
        initialFetchComplete,
      };
    }
    const weekly = buildMockWeeklyForecast();
    const fallback: WeatherData = {
      current: {
        temperature: weekly[0].tempMax,
        condition: weekly[0].condition,
        humidity: 55,
        windMph: weekly[0].windMph ?? 6,
        windDirectionDeg: weekly[0].windDirectionDeg ?? 200,
        apparentTemperature: weekly[0].tempMax - 3,
        visibilityMiles: 6.2,
      },
      weekly,
    };
    return {
      ...patch(fallback),
      locationLabel,
      refreshing,
      refresh,
      initialFetchComplete,
    };
  }, [weatherData, locationLabel, refreshing, refresh, location.search, initialFetchComplete]);
}

export function useCurrentWeather(): CurrentWeather | null {
  return useWeatherData().current;
}

export function useWeeklyWeather(): WeeklyDay[] {
  return useWeatherData().weekly;
}
