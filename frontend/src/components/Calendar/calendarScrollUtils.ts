import { parseISO, isSameDay } from "date-fns";
import type { CalendarEvent } from "../../types/calendar";

/** Treats an event as all-day so it never appears in the time grid (e.g. at 12am). */
export function isAllDayEvent(event: CalendarEvent): boolean {
  if (event.all_day === true || (event as { all_day?: number }).all_day === 1)
    return true;
  const start = parseISO(event.start_time);
  if (start.getHours() !== 0 || start.getMinutes() !== 0) return false;
  if (!event.end_time) return true;
  const end = parseISO(event.end_time);
  const durationMs = end.getTime() - start.getTime();
  const sameDay = isSameDay(start, end);
  return sameDay ? durationMs >= 23 * 60 * 60 * 1000 : durationMs >= 24 * 60 * 60 * 1000 - 60000;
}

/**
 * Calculates scroll position (in pixels) so the viewport shows the time range
 * where most events occur. Centers events in view with ~12 hours visible.
 * Adds a small offset above the first event so it's not flush at the top.
 * All-day events (including those starting at 12am) are excluded and do not affect scroll.
 */
export function calculateOptimalScrollPosition(
  events: CalendarEvent[],
  pixelsPerHour: number
): number {
  const timedEvents = events.filter((e) => !isAllDayEvent(e));
  if (timedEvents.length === 0) return 6 * pixelsPerHour;

  const times = timedEvents.map((e) => {
    const start = parseISO(e.start_time);
    return start.getHours() * 60 + start.getMinutes();
  });
  const minMinutes = Math.min(...times);
  const maxMinutes = Math.max(...times);
  const centerMinutes = (minMinutes + maxMinutes) / 2;
  const viewportHours = 12;
  // Show ~0.5 hour above the centered range so first event isn't flush at top
  const paddingMinutes = 30;
  const scrollToMinutes = Math.max(
    0,
    centerMinutes - (viewportHours * 60) / 2 - paddingMinutes
  );
  return (scrollToMinutes / 60) * pixelsPerHour;
}

const HOURS_BEFORE_REFERENCE = 2;

/**
 * Returns scroll offset (in pixels) to center the reference time in a 4-hour viewport.
 * This positions the viewport so the reference time appears at the exact center.
 * The returned value can be negative for early morning times (handled by infinite scroll).
 */
export function getInitialScrollTopForFourHourWindow(
  referenceDate: Date,
  pixelsPerHour: number
): number {
  const minutesFromMidnight =
    referenceDate.getHours() * 60 + referenceDate.getMinutes();
  // Position 2 hours before the reference time so it's centered in the 4-hour viewport
  const scrollToMinutes = minutesFromMidnight - HOURS_BEFORE_REFERENCE * 60;
  return (scrollToMinutes / 60) * pixelsPerHour;
}
