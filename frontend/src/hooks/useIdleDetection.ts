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
    if (!enabled || idleMinutes <= 0) {
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

    const onActivity = () => {
      setIsIdle(false);
      scheduleIdle();
    };

    scheduleIdle();

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((ev) => window.addEventListener(ev, onActivity));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, idleMinutes]);

  return { isIdle, reset };
}
