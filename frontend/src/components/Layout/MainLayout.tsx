import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Header from "./Header";
import { useAppContext } from "../../contexts/AppContext";
import { isSkydarkDemo } from "../../lib/demoMode";
import { useIdleDetection } from "../../hooks/useIdleDetection";

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
    </div>
  );
}
