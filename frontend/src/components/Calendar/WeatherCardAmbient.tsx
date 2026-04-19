import type { WeeklyDay } from "../../hooks/useWeeklyWeather";

type Condition = WeeklyDay["condition"];

const motionSafe = "motion-reduce:animate-none";

/** Decorative, pointer-events-none layers behind the current-weather card (condition-based). */
export default function WeatherCardAmbient({ condition }: { condition: Condition }) {
  switch (condition) {
    case "rain":
      return (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-sky-300/50 via-slate-400/35 to-indigo-600/40 dark:from-slate-700/55 dark:via-slate-900/50 dark:to-slate-950/70"
            aria-hidden
          />
          <div
            className={`absolute inset-[-35%] opacity-[0.38] dark:opacity-[0.5] animate-skydark-rain-sheets ${motionSafe}`}
            style={{
              backgroundImage: [
                "repeating-linear-gradient(104deg, transparent 0px, transparent 6px, rgba(255,255,255,0.2) 6px, rgba(255,255,255,0.2) 7px)",
                "repeating-linear-gradient(112deg, transparent 0px, transparent 12px, rgba(191,219,254,0.45) 12px, rgba(191,219,254,0.45) 13px)",
              ].join(", "),
              backgroundSize: "52px 64px, 76px 88px",
            }}
            aria-hidden
          />
        </>
      );
    case "snow":
      return (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-200/55 via-sky-100/40 to-indigo-200/45 dark:from-slate-800/60 dark:via-slate-900/55 dark:to-indigo-950/60"
            aria-hidden
          />
          <div
            className={`absolute inset-[-30%] opacity-[0.42] dark:opacity-[0.52] animate-skydark-snow-sheets ${motionSafe}`}
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.9) 0, rgba(255,255,255,0.9) 1.2px, transparent 1.6px), radial-gradient(circle at 70% 55%, rgba(255,255,255,0.85) 0, rgba(255,255,255,0.85) 1px, transparent 1.4px), radial-gradient(circle at 40% 80%, rgba(224,242,254,0.95) 0, rgba(224,242,254,0.95) 1px, transparent 1.5px)",
              backgroundSize: "56px 72px, 48px 64px, 64px 80px",
            }}
            aria-hidden
          />
        </>
      );
    case "cloudy":
      return (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-300/55 via-slate-200/40 to-zinc-400/45 dark:from-slate-800/65 dark:via-slate-900/55 dark:to-slate-950/70"
            aria-hidden
          />
          <div
            className={`absolute -left-1/4 top-1/4 h-[85%] w-[95%] rounded-full bg-gradient-to-r from-slate-400/35 to-slate-300/20 blur-3xl animate-skydark-weather-drift dark:from-slate-600/30 dark:to-slate-700/15 ${motionSafe}`}
            aria-hidden
          />
          <div
            className={`absolute -right-1/3 bottom-0 h-[100%] w-[80%] rounded-full bg-gradient-to-tl from-zinc-400/30 to-transparent blur-2xl animate-skydark-weather-pulse dark:from-slate-600/25 ${motionSafe}`}
            aria-hidden
          />
        </>
      );
    case "partly-cloudy":
      return (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-200/45 via-sky-200/35 to-slate-300/40 dark:from-amber-900/25 dark:via-slate-800/50 dark:to-slate-950/65"
            aria-hidden
          />
          <div
            className={`absolute -right-1/4 -top-1/4 h-[95%] w-[70%] rounded-full bg-gradient-to-bl from-amber-300/50 to-orange-200/25 blur-3xl animate-skydark-weather-pulse dark:from-amber-700/20 dark:to-transparent ${motionSafe}`}
            aria-hidden
          />
          <div
            className={`absolute -left-1/3 bottom-0 h-[80%] w-[90%] rounded-full bg-gradient-to-tr from-slate-400/30 to-transparent blur-3xl animate-skydark-weather-drift dark:from-slate-600/25 ${motionSafe}`}
            aria-hidden
          />
        </>
      );
    case "sunny":
    default:
      return (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-200/55 via-yellow-100/40 to-sky-200/45 dark:from-amber-900/30 dark:via-orange-950/25 dark:to-sky-950/40"
            aria-hidden
          />
          <div
            className={`absolute -left-1/4 -top-1/3 h-[120%] w-[75%] rounded-full bg-gradient-to-br from-amber-300/60 via-yellow-200/35 to-orange-200/30 blur-3xl animate-skydark-sun-pulse dark:from-amber-600/25 dark:via-orange-900/20 dark:to-amber-950/15 ${motionSafe}`}
            aria-hidden
          />
          <div
            className={`absolute -right-1/4 bottom-0 h-[100%] w-[65%] rounded-full bg-gradient-to-tl from-sky-200/50 via-amber-100/30 to-transparent blur-2xl animate-skydark-weather-drift dark:from-sky-900/20 dark:via-amber-900/10 ${motionSafe}`}
            aria-hidden
          />
        </>
      );
  }
}
