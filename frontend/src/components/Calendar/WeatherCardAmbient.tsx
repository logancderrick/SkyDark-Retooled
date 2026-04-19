import { useMemo } from "react";
import type { WeeklyDay } from "../../hooks/useWeeklyWeather";

type Condition = WeeklyDay["condition"];

const motionSafe = "motion-reduce:animate-none";

/**
 * Decorative, pointer-events-none animated layers that live behind card content.
 * Inspired by the HA "Weather Forecast Card" condition effects (rain droplets,
 * snowflakes, animated sun, stars, lightning flashes, drifting clouds).
 *
 * The component renders an absolutely-positioned full-bleed stack so it should
 * be placed inside a `relative isolate overflow-hidden` parent.
 */
export default function WeatherCardAmbient({
  condition,
  isNight = false,
}: {
  condition: Condition;
  isNight?: boolean;
}) {
  switch (condition) {
    case "rain":
      return (
        <>
          <SkyGradient kind="rain" />
          <CloudDriftLayer tone="storm" />
          <RainLayer drops={70} />
        </>
      );
    case "snow":
      return (
        <>
          <SkyGradient kind="snow" />
          <CloudDriftLayer tone="snow" />
          <SnowLayer flakes={45} />
        </>
      );
    case "cloudy":
      return (
        <>
          <SkyGradient kind="cloudy" />
          <CloudDriftLayer tone="cloud" />
        </>
      );
    case "partly-cloudy":
      return (
        <>
          <SkyGradient kind={isNight ? "night" : "partly"} />
          {isNight ? <MoonAndStars compact /> : <SunLayer compact />}
          <CloudDriftLayer tone="cloud" />
        </>
      );
    case "sunny":
    default:
      if (isNight) {
        return (
          <>
            <SkyGradient kind="night" />
            <MoonAndStars />
          </>
        );
      }
      return (
        <>
          <SkyGradient kind="sunny" />
          <SunLayer />
        </>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Sky gradient                                                               */
/* -------------------------------------------------------------------------- */

type SkyKind = "sunny" | "partly" | "cloudy" | "rain" | "snow" | "night";

function SkyGradient({ kind }: { kind: SkyKind }) {
  /** Always use the deep palette: this card is a fixed dark UI. Basing tints on `html.dark`
   *  caused a milky white/grey wash whenever the app was in light mode (or before `dark` applied). */
  const breath = "motion-safe:animate-skydark-sky-breath motion-reduce:animate-none";
  const cls: Record<SkyKind, string> = {
    sunny:
      `absolute inset-0 bg-gradient-to-br from-amber-900/35 via-orange-950/30 to-sky-950/55 ${breath}`,
    partly:
      `absolute inset-0 bg-gradient-to-br from-amber-900/25 via-slate-800/45 to-slate-950/65 ${breath}`,
    cloudy:
      `absolute inset-0 bg-gradient-to-br from-slate-800/65 via-slate-900/55 to-slate-950/70 ${breath}`,
    rain:
      `absolute inset-0 bg-gradient-to-br from-slate-700/55 via-slate-800/55 to-indigo-950/70 ${breath}`,
    snow:
      `absolute inset-0 bg-gradient-to-br from-slate-800/60 via-slate-900/55 to-indigo-950/65 ${breath}`,
    night:
      `absolute inset-0 bg-gradient-to-br from-indigo-950/85 via-slate-950/85 to-slate-950/90 ${breath}`,
  };
  return <div aria-hidden className={cls[kind]} />;
}

/* -------------------------------------------------------------------------- */
/* Rain (discrete drops)                                                      */
/* -------------------------------------------------------------------------- */

function RainLayer({ drops }: { drops: number }) {
  const rng = useMemo(() => seedRng(1729), []);
  const items = useMemo(
    () =>
      Array.from({ length: drops }, (_, i) => ({
        left: rng() * 100,
        delay: rng() * -1.4,
        duration: 0.7 + rng() * 0.8,
        height: 10 + rng() * 16,
        opacity: 0.45 + rng() * 0.5,
        width: rng() > 0.85 ? 1.6 : 1.1,
        key: `r-${i}`,
      })),
    [drops, rng]
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((d) => (
        <span
          key={d.key}
          className={`absolute -top-3 block rounded-full bg-sky-200/75 transform-gpu animate-skydark-rain-drop ${motionSafe}`}
          style={{
            left: `${d.left}%`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            opacity: d.opacity,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            transform: "rotate(8deg)",
            filter: "blur(0.3px)",
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Snow (discrete flakes)                                                     */
/* -------------------------------------------------------------------------- */

function SnowLayer({ flakes }: { flakes: number }) {
  const rng = useMemo(() => seedRng(421), []);
  const items = useMemo(
    () =>
      Array.from({ length: flakes }, (_, i) => ({
        left: rng() * 100,
        delay: rng() * -9,
        duration: 6 + rng() * 7,
        size: 2 + rng() * 4,
        opacity: 0.55 + rng() * 0.45,
        key: `s-${i}`,
      })),
    [flakes, rng]
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((d) => (
        <span
          key={d.key}
          className={`absolute -top-3 block rounded-full bg-white/90 transform-gpu animate-skydark-snow-flake ${motionSafe}`}
          style={{
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            opacity: d.opacity,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            boxShadow: "0 0 4px rgba(255,255,255,0.6)",
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sun (animated rays + glow)                                                 */
/* -------------------------------------------------------------------------- */

function SunLayer({ compact = false }: { compact?: boolean }) {
  const size = compact ? 88 : 118;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${
        compact ? "right-4 top-1" : "-right-4 -top-8"
      }`}
      style={{ width: size, height: size }}
    >
      {/* outer glow */}
      <div
        className={`absolute inset-0 rounded-full animate-skydark-sun-glow ${motionSafe}`}
        style={{
          background:
            "radial-gradient(circle at center, rgba(253,224,71,0.65) 0%, rgba(251,191,36,0.32) 35%, rgba(0,0,0,0) 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* spinning rays */}
      <div
        className={`absolute inset-0 transform-gpu animate-skydark-sun-spin ${motionSafe}`}
        style={{ transformOrigin: "50% 50%" }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <defs>
            <radialGradient id="sd-ray" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(253,224,71,0.55)" />
              <stop offset="100%" stopColor="rgba(253,224,71,0)" />
            </radialGradient>
          </defs>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6;
            const x1 = 50 + Math.cos(a) * 30;
            const y1 = 50 + Math.sin(a) * 30;
            const x2 = 50 + Math.cos(a) * 50;
            const y2 = 50 + Math.sin(a) * 50;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(253,224,71,0.55)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>
      {/* core */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 0.46,
          height: size * 0.46,
          background:
            "radial-gradient(circle at 35% 35%, #fef08a 0%, #facc15 55%, #f59e0b 100%)",
          boxShadow: "0 0 24px rgba(251,191,36,0.55)",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Moon + twinkling stars (clear night)                                       */
/* -------------------------------------------------------------------------- */

function MoonAndStars({ compact = false }: { compact?: boolean }) {
  const rng = useMemo(() => seedRng(9999), []);
  const stars = useMemo(
    () =>
      Array.from({ length: compact ? 14 : 28 }, (_, i) => ({
        left: rng() * 100,
        top: rng() * 80,
        size: 1 + rng() * 2.4,
        delay: rng() * -3.6,
        duration: 2.4 + rng() * 2.6,
        key: `st-${i}`,
      })),
    [compact, rng]
  );
  const moonSize = compact ? 46 : 64;

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {stars.map((s) => (
          <span
            key={s.key}
            className={`absolute block rounded-full bg-white animate-skydark-star-twinkle ${motionSafe}`}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              boxShadow: "0 0 4px rgba(255,255,255,0.85)",
            }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute ${
          compact ? "right-4 top-2" : "right-6 top-4"
        }`}
        style={{ width: moonSize, height: moonSize }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #cbd5e1 55%, #94a3b8 100%)",
            boxShadow: "0 0 20px rgba(220,220,235,0.55)",
          }}
        />
        {/* subtle crescent shadow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 70% 50%, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0) 55%)",
            mixBlendMode: "multiply",
          }}
        />
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Drifting cloud blobs                                                       */
/* -------------------------------------------------------------------------- */

function CloudDriftLayer({ tone }: { tone: "cloud" | "storm" | "snow" }) {
  const palette =
    tone === "storm"
      ? "from-slate-500/35 to-slate-700/15"
      : tone === "snow"
      ? "from-slate-300/45 to-slate-500/15"
      : "from-slate-400/40 to-slate-600/15";
  return (
    <>
      <div
        aria-hidden
        className={`absolute -left-1/4 top-[6%] h-[55%] w-[80%] rounded-full bg-gradient-to-r ${palette} blur-3xl animate-skydark-cloud-drift ${motionSafe}`}
      />
      <div
        aria-hidden
        className={`absolute -right-1/3 top-[18%] h-[60%] w-[80%] rounded-full bg-gradient-to-l ${palette} blur-3xl animate-skydark-weather-drift ${motionSafe}`}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* tiny seedable RNG so SSR/CSR positions stay stable across renders          */
/* -------------------------------------------------------------------------- */

function seedRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
