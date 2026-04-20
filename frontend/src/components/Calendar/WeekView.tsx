import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  format,
  startOfWeek,
  addDays,
  parseISO,
  isSameDay,
  isToday,
} from "date-fns";
import type { CalendarEvent } from "../../types/calendar";
import type { FamilyMember } from "../../types/calendar";
import { getEventColorStyleForDisplay } from "./EventColorPattern";
import { isAllDayEvent } from "./calendarScrollUtils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
  remoteCalendarColors?: Record<string, string>;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export interface WeekViewRef {
  scrollToNow: () => void;
}

function formatEventTime(iso: string) {
  const d = parseISO(iso);
  return format(d, "h:mm a");
}

const WeekView = forwardRef<WeekViewRef, WeekViewProps>(function WeekView(
  { currentDate, events, familyMembers, remoteCalendarColors, onDateClick, onEventClick },
  ref
) {
  const weekStart = startOfWeek(currentDate);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToNow: () => {
      const col = todayColRef.current;
      const sc = scrollRef.current;
      if (!col || !sc) return;
      const left = col.offsetLeft - sc.clientWidth / 2 + col.clientWidth / 2;
      sc.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    },
  }), []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      todayColRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [weekStart]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-skydark-bg">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 gap-px overflow-x-auto overflow-y-hidden bg-skydark-grid-line pb-1"
      >
        {days.map((d) => {
          const dayEvents = events.filter((e) => {
            const start = parseISO(e.start_time);
            return isSameDay(start, d);
          });
          const allDayEvents = dayEvents.filter((e) => isAllDayEvent(e));
          const timedEvents = dayEvents
            .filter((e) => !isAllDayEvent(e))
            .slice()
            .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
          const today = isToday(d);

          return (
            <div
              key={d.toISOString()}
              ref={today ? todayColRef : undefined}
              className={`flex min-w-[7.5rem] max-w-[11rem] flex-1 flex-col border border-skydark-border bg-skydark-surface ${
                today ? "ring-2 ring-skydark-accent/50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onDateClick?.(d)}
                className="flex flex-shrink-0 flex-col items-center border-b border-skydark-border bg-skydark-surface-muted px-1 py-2 text-center hover:bg-skydark-surface"
              >
                <span className="text-xs font-semibold uppercase text-skydark-text-secondary">{format(d, "EEE")}</span>
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    today ? "text-skydark-accent" : "text-skydark-text"
                  }`}
                >
                  {format(d, "d")}
                </span>
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
                {allDayEvents.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {allDayEvents.map((event) => {
                      const { style: colorStyle, borderColor } = getEventColorStyleForDisplay(
                        event,
                        familyMembers,
                        remoteCalendarColors
                      );
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onEventClick?.(event)}
                          className="w-full rounded-md border border-skydark-border px-1.5 py-1 text-left text-[11px] font-medium leading-tight"
                          style={{ ...colorStyle, borderLeft: `3px solid ${borderColor}` }}
                        >
                          <span className="text-skydark-text-secondary">All day · </span>
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-1.5">
                  {timedEvents.map((event) => {
                    const { style: colorStyle, borderColor } = getEventColorStyleForDisplay(
                      event,
                      familyMembers,
                      remoteCalendarColors
                    );
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onEventClick?.(event)}
                        className="w-full rounded-md px-1.5 py-1.5 text-left text-xs font-medium leading-snug"
                        style={{ ...colorStyle, borderLeft: `3px solid ${borderColor}` }}
                      >
                        <div className="text-[10px] font-normal text-skydark-text-secondary">
                          {formatEventTime(event.start_time)}
                        </div>
                        <div className="line-clamp-3 text-skydark-text">{event.title}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default WeekView;
