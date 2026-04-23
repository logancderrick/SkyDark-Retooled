import { ReactNode, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Header from "./Header";
import { useAppContext } from "../../contexts/AppContext";
import { usePhotosContext } from "../../contexts/PhotosContext";
import { useSkydarkDataContext } from "../../contexts/SkydarkDataContext";
import { isSkydarkDemo } from "../../lib/demoMode";
import { useIdleDetection } from "../../hooks/useIdleDetection";
import { usePhotoDisplayUrl } from "../../hooks/usePhotoDisplayUrl";
import { useWeeklyWeather, getWeatherIcon } from "../../hooks/useWeeklyWeather";

function SleepModeTime() {
  const { settings } = useAppContext();
  const [time, setTime] = useState("");
  const scale = settings.screensaverTimeDisplayScale ?? 50;
  const sizeClass =
    scale <= 20 ? "text-2xl" :
    scale <= 40 ? "text-3xl" :
    scale <= 60 ? "text-4xl" :
    scale <= 80 ? "text-5xl" : "text-7xl";

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
    <div
      className={`absolute top-4 right-4 px-4 py-3 rounded-xl bg-black/50 text-white font-medium tabular-nums pointer-events-none ${sizeClass}`}
      aria-live="polite"
    >
      {time}
    </div>
  );
}

function SleepModeWeather() {
  const { settings } = useAppContext();
  const week = useWeeklyWeather();
  const today = week[0];
  const scale = settings.screensaverWeatherDisplayScale ?? 50;
  const transformScale =
    scale <= 50
      ? 0.7 + (scale / 50) * 0.3
      : 1 + ((scale - 50) / 50) * 1;

  return (
    <div
      className="absolute bottom-5 left-1/2 w-[min(92vw,740px)] rounded-2xl border border-white/20 bg-black/35 px-4 py-3 text-white shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-md pointer-events-none"
      style={{
        transform: `translateX(-50%) scale(${transformScale})`,
        transformOrigin: "bottom center",
      }}
      aria-label="Weekly weather forecast"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold tracking-wide text-white/95">Weather</p>
        {today ? (
          <p className="text-sm font-medium text-white/90">
            {getWeatherIcon(today.condition)} {today.tempMin}° / {today.tempMax}°
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
        {week.map((day) => (
          <div
            key={day.dayLabel}
            className="flex flex-col items-center gap-0.5 min-w-[3rem]"
          >
            <span className="text-xs font-medium opacity-90">{day.dayLabel}</span>
            <span className="text-lg" aria-hidden>
              {getWeatherIcon(day.condition)}
            </span>
            <span className="text-sm font-medium">
              {day.tempMin}° / {day.tempMax}°
            </span>
            <span className="text-xs opacity-80">
              {day.precipitation}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenSaverOverlay() {
  const { settings, screensaverTriggered, setScreensaverTriggered } = useAppContext();
  const { photos } = usePhotosContext();
  const conn = useSkydarkDataContext()?.data?.connection ?? null;
  const { isIdle, reset } = useIdleDetection(
    settings.screensaverIdleMinutes,
    settings.screensaverEnabled
  );
  const intervalMs =
    (settings.screensaverSlideshowIntervalUnit ?? "seconds") === "minutes"
      ? (settings.screensaverSlideshowIntervalMinutes ?? 1) * 60 * 1000
      : (settings.screensaverSlideshowIntervalSeconds ?? 5) * 1000;
  const durationMs = settings.screensaverTransitionDurationMs ?? 1200;
  const transitionType = settings.screensaverTransitionType ?? "fade";

  const [index, setIndex] = useState(0);
  const [visibleLayer, setVisibleLayer] = useState(0);
  const transitionEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevShowRef = useRef(false);

  useEffect(() => {
    if (!isIdle && !screensaverTriggered) return;
    if (photos.length === 0) return;
    const id = setInterval(() => {
      if (photos.length <= 1) return;
      if (transitionType === "none") {
        setIndex((i) => (i + 1) % photos.length);
        return;
      }
      setVisibleLayer((v) => 1 - v);
      transitionEndRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length);
        setVisibleLayer((v) => 1 - v);
        transitionEndRef.current = null;
      }, durationMs);
    }, intervalMs);
    return () => {
      clearInterval(id);
      if (transitionEndRef.current) clearTimeout(transitionEndRef.current);
    };
  }, [isIdle, screensaverTriggered, photos.length, intervalMs, durationMs, transitionType]);

  const show = photos.length > 0 && ((isIdle && settings.screensaverEnabled) || screensaverTriggered);

  useEffect(() => {
    if (show && !prevShowRef.current && photos.length > 0) {
      setIndex(Math.floor(Math.random() * photos.length));
      setVisibleLayer(0);
    }
    prevShowRef.current = show;
  }, [show, photos.length]);
  const currentPhoto = photos[index];
  const nextIndex = (index + 1) % photos.length;
  const nextPhoto = photos[nextIndex];
  const currentUrl = usePhotoDisplayUrl(currentPhoto?.url ?? "", conn);
  const nextUrl = usePhotoDisplayUrl(nextPhoto?.url ?? "", conn);
  const transitionStyle = { transition: `opacity ${durationMs}ms ease-out` };
  const slideStyle = { transition: `transform ${durationMs}ms ease-out` };

  const dismiss = () => {
    if (transitionEndRef.current) clearTimeout(transitionEndRef.current);
    transitionEndRef.current = null;
    reset();
    setScreensaverTriggered(false);
  };

  // Preload resolved URLs to avoid black frames on transitions.
  useEffect(() => {
    if (!currentUrl) return;
    const preload = (url: string) => {
      const img = new Image();
      img.src = url;
    };
    preload(currentUrl);
    if (nextUrl) preload(nextUrl);
  }, [currentUrl, nextUrl]);

  if (!show) return null;

  const singleImage = transitionType === "none" || photos.length === 1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={dismiss}
      onKeyDown={(e) => { if (e.key === "Escape") dismiss(); }}
      role="button"
      tabIndex={0}
      aria-label="Screen saver active, click to exit"
    >
      {singleImage ? (
        <img
          src={currentUrl}
          alt={currentPhoto?.caption || "Slideshow"}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : transitionType === "fade" ? (
        <>
          <img
            src={currentUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ ...transitionStyle, opacity: visibleLayer === 0 ? 1 : 0 }}
            draggable={false}
            aria-hidden
          />
          <img
            src={nextUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ ...transitionStyle, opacity: visibleLayer === 1 ? 1 : 0 }}
            draggable={false}
            aria-hidden
          />
          <img
            src={visibleLayer === 0 ? currentUrl : nextUrl}
            alt={currentPhoto?.caption || nextPhoto?.caption || "Slideshow"}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none sr-only"
            draggable={false}
          />
        </>
      ) : (
        <>
          <img
            src={currentUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              ...slideStyle,
              transform: visibleLayer === 0 ? "translateX(0)" : "translateX(-100%)",
            }}
            draggable={false}
            aria-hidden
          />
          <img
            src={nextUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              ...slideStyle,
              transform: visibleLayer === 1 ? "translateX(0)" : "translateX(100%)",
            }}
            draggable={false}
            aria-hidden
          />
          <img
            src={visibleLayer === 0 ? currentUrl : nextUrl}
            alt={currentPhoto?.caption || nextPhoto?.caption || "Slideshow"}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none sr-only"
            draggable={false}
          />
        </>
      )}
      <SleepModeTime />
      <SleepModeWeather />
    </div>
  );
}

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const { settings, isLocked, setIsLocked } = useAppContext();
  const [isPortrait, setIsPortrait] = useState(false);
  const { isIdle } = useIdleDetection(
    settings.autoRelockMinutes,
    !!(settings.lockEnabled && !isLocked && settings.autoRelockEnabled)
  );

  useEffect(() => {
    if (isIdle) setIsLocked(true);
  }, [isIdle, setIsLocked]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const updateOrientation = () => setIsPortrait(mediaQuery.matches);
    updateOrientation();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateOrientation);
      return () => mediaQuery.removeEventListener("change", updateOrientation);
    }
    mediaQuery.addListener(updateOrientation);
    return () => mediaQuery.removeListener(updateOrientation);
  }, []);

  const isCalendar = pathname.includes("calendar");
  // Keep desktop calendar locked to viewport; allow mobile pages to scroll naturally.
  const shouldLockToViewport = isCalendar && !isPortrait;
  /** Desktop: fixed viewport height so only the main column scrolls; sidebar stays put. */
  const desktopShellLock = !isPortrait;

  return (
    <div
      className={`flex bg-skydark-bg font-sans text-skydark-text max-w-full ${
        isPortrait ? "min-h-screen flex-col" : "h-screen max-h-screen overflow-hidden"
      }`}
    >
      {!isPortrait && <Sidebar />}
      <div
        className={`flex flex-1 flex-col min-w-0 ${
          desktopShellLock ? "min-h-0 overflow-hidden" : "min-h-screen"
        }`}
      >
        {!isPortrait && <MobileNav />}
        <div className="shrink-0">
          <Header />
        </div>
        {isSkydarkDemo && (
          <div
            role="status"
            className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
          >
            Demo mode — no Home Assistant connection. Sample data for layout review; changes are not saved to HA.
          </div>
        )}
        <main
          className={`flex-1 bg-skydark-bg p-5 sm:p-6 ${
            desktopShellLock ? "min-h-0" : ""
          } ${
            shouldLockToViewport ? "overflow-hidden" : "overflow-y-auto"
          } ${isPortrait ? "pb-24" : ""}`}
        >
          {children}
        </main>
        {isPortrait && <MobileNav position="bottom" forceVisible iconOnly />}
      </div>
      <ScreenSaverOverlay />
    </div>
  );
}
