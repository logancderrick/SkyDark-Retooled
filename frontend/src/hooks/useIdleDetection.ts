import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Tracks user activity and sets isIdle to true after idleMinutes of no activity.
 * Listens to mouse, keyboard, touch, and scroll. Resets on any activity.
 */
export function useIdleDetection(idleMinutes: number, enabled: boolean) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setIsIdle(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const validMinutes = Number.isFinite(idleMinutes) && idleMinutes > 0;
    if (!enabled || !validMinutes) {
      setIsIdle(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const delayMs = idleMinutes * 60 * 1000;

    const scheduleIdle = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setIsIdle(true);
      }, delayMs);
    };

    const lastScheduledRef = { current: 0 };
    const THROTTLE_MS = 500;
    const onActivity = () => {
      setIsIdle(false);
      const now = Date.now();
      if (now - lastScheduledRef.current >= THROTTLE_MS) {
        lastScheduledRef.current = now;
        scheduleIdle();
      }
    };

    scheduleIdle();

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((ev) => {
      window.addEventListener(ev, onActivity, ev === "scroll" ? { passive: true } : false);
    });

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, onActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, idleMinutes]);

  return { isIdle, reset };
}
