import { useMemo } from "react";

export interface WeeklyDay {
  dayLabel: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  condition: "sunny" | "cloudy" | "rain" | "snow" | "partly-cloudy";
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

/** Mock 7-day forecast. Replace with HA or API later. */
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

export function useWeeklyWeather(): WeeklyDay[] {
  return useMemo(buildMockWeeklyForecast, []);
}
