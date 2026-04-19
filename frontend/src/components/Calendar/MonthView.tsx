import { useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import type { CalendarEvent } from "../../types/calendar";
import type { FamilyMember } from "../../types/calendar";
import { getEventColorStyleForDisplay } from "./EventColorPattern";

const MAX_VISIBLE_EVENTS = 3;

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  familyMembers: FamilyMember[];
  /** Per remote calendar entity_id -> hex color */
  remoteCalendarColors?: Record<string, string>;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export default function MonthView({
  currentDate,
  events,
  familyMembers,
  remoteCalendarColors,
  onDateClick,
  onEventClick,
}: MonthViewProps) {
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(() => new Set());
  const monthKey = format(currentDate, "yyyy-MM");
  useEffect(() => {
    setExpandedDayKeys(new Set());
  }, [monthKey]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (d: Date) => {
    const dStr = format(d, "yyyy-MM-dd");
    return events.filter((e) => {
      const start = parseISO(e.start_time);
      const startStr = format(start, "yyyy-MM-dd");
      if (e.end_time) {
        const end = parseISO(e.end_time);
        const endStr = format(end, "yyyy-MM-dd");
        return dStr >= startStr && dStr <= endStr;
      }
      return startStr === dStr;
    });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid grid-cols-7 gap-px bg-skydark-grid-line rounded-lg overflow-hidden">
      {weekDays.map((wd) => (
        <div
          key={wd}
          className="bg-skydark-surface-muted p-2 text-center text-sm font-semibold text-skydark-text"
        >
          {wd}
        </div>
      ))}
      {days.map((d) => {
        const dayKey = format(d, "yyyy-MM-dd");
        const dayEvents = getEventsForDay(d);
        const isExpanded = expandedDayKeys.has(dayKey);
        const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, MAX_VISIBLE_EVENTS);
        const moreCount = isExpanded ? 0 : Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS);
        const isCurrentMonth = isSameMonth(d, currentDate);

        return (
          <div
            key={d.toISOString()}
            className="bg-skydark-surface min-h-[100px] p-1 flex flex-col"
            onClick={() => onDateClick?.(d)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDateClick?.(d);
              }}
              className={`text-left text-sm w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                !isCurrentMonth ? "text-skydark-text-secondary opacity-60" : "text-skydark-text"
              } ${isToday(d) ? "bg-red-100 text-red-700 font-semibold dark:bg-red-950/70 dark:text-red-200" : ""}`}
            >
              {format(d, "d")}
            </button>
            <div className={`flex-1 space-y-1 ${isExpanded ? "overflow-y-auto max-h-[220px]" : "overflow-hidden"}`}>
              {visibleEvents.map((ev) => {
                const { style: colorStyle, borderColor } = getEventColorStyleForDisplay(
                  ev,
                  familyMembers,
                  remoteCalendarColors
                );
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                    className="w-full text-left rounded-sm overflow-hidden min-h-[24px] flex items-center px-2 py-1 text-xs font-medium truncate transition-shadow hover:shadow-sm"
                    style={{
                      ...colorStyle,
                      borderLeft: `4px solid ${borderColor}`,
                    }}
                    title={ev.title}
                  >
                    <span className="block truncate text-skydark-text">{ev.title}</span>
                  </button>
                );
              })}
              {moreCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-skydark-text-secondary hover:underline w-full text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDayKeys((prev) => {
                      const next = new Set(prev);
                      next.add(dayKey);
                      return next;
                    });
                  }}
                >
                  +{moreCount} more
                </button>
              )}
              {isExpanded && dayEvents.length > MAX_VISIBLE_EVENTS && (
                <button
                  type="button"
                  className="text-xs text-skydark-text-secondary hover:underline w-full text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDayKeys((prev) => {
                      const next = new Set(prev);
                      next.delete(dayKey);
                      return next;
                    });
                  }}
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
