import type { CalendarEvent } from "../../types/calendar";
import type { FamilyMember } from "../../types/calendar";
import { format, parseISO } from "date-fns";
import { getEventColorStyleForDisplay } from "./EventColorPattern";

interface EventCardProps {
  event: CalendarEvent;
  familyMembers: FamilyMember[];
  remoteCalendarColors?: Record<string, string>;
  compact?: boolean;
  showTime?: boolean;
}

export default function EventCard({
  event,
  familyMembers,
  remoteCalendarColors,
  compact = false,
  showTime = true,
}: EventCardProps) {
  const start = parseISO(event.start_time);
  const end = event.end_time ? parseISO(event.end_time) : null;
  const isAllDay = event.all_day === true || (event as { all_day?: number }).all_day === 1;
  const timeStr =
    isAllDay
      ? "All day"
      : end
        ? `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`
        : format(start, "h:mm a");

  const { style: colorStyle, borderColor } = getEventColorStyleForDisplay(
    event,
    familyMembers,
    remoteCalendarColors
  );

  return (
    <div
      className="rounded-card overflow-hidden text-skydark-small-lg font-medium truncate shadow-skydark hover:shadow-skydark-hover transition-shadow leading-tight"
      style={{
        ...colorStyle,
        borderLeft: `4px solid ${borderColor}`,
        padding: compact ? "4px 8px" : "6px 10px",
      }}
      title={`${event.title} ${timeStr}`}
    >
      {showTime && (
        <span className="text-skydark-text-secondary text-xs block">
          {timeStr}
        </span>
      )}
      <span className="block truncate">{event.title}</span>
    </div>
  );
}
