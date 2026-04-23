import { useState, useRef, useEffect, useMemo } from "react";
import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, startOfMonth } from "date-fns";
import MonthView from "../components/Calendar/MonthView";
import WeekView, { type WeekViewRef } from "../components/Calendar/WeekView";
import DayView, { type DayViewRef } from "../components/Calendar/DayView";
import EventModal from "../components/Calendar/EventModal";
import CalendarRemoteToggles from "../components/Calendar/CalendarRemoteToggles";
import CalendarDashboardTopCards from "../components/Calendar/CalendarDashboardTopCards";
import { useAppContext } from "../contexts/AppContext";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import PinPrompt from "../components/Common/PinPrompt";
import FloatingActionButton from "../components/Common/FloatingActionButton";
import { usePinGate } from "../hooks/usePinGate";
import { pushEventToHaCalendar, serviceAddEvent } from "../lib/skyDarkApi";
import type { CalendarEvent } from "../types/calendar";

const FALLBACK_EVENTS: CalendarEvent[] = [];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i, 1), "MMM"),
}));

export default function CalendarView() {
  const skydark = useSkydarkDataContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [localOverrides, setLocalOverrides] = useState<{ events: CalendarEvent[]; deleted: Set<string> }>({
    events: [],
    deleted: new Set(),
  });
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultEventStartDate, setDefaultEventStartDate] = useState<Date | null>(null);
  const { familyMembers, settings } = useAppContext();
  const haCalendarEntityIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const eid of settings.remoteCalendarEntities ?? []) {
      if (eid.startsWith("calendar.") && !seen.has(eid)) {
        seen.add(eid);
        ids.push(eid);
      }
    }
    const pushId = settings.pushEventsToCalendarEntityId?.trim();
    if (pushId?.startsWith("calendar.") && !seen.has(pushId)) {
      seen.add(pushId);
      ids.push(pushId);
    }
    return ids;
  }, [settings.remoteCalendarEntities, settings.pushEventsToCalendarEntityId]);

  const defaultHaCalendarEntityId = useMemo(() => {
    const push = settings.pushEventsToCalendarEntityId?.trim();
    if (push?.startsWith("calendar.") && haCalendarEntityIds.includes(push)) return push;
    return haCalendarEntityIds[0] ?? "";
  }, [haCalendarEntityIds, settings.pushEventsToCalendarEntityId]);

  const { runIfUnlocked, pinPromptProps } = usePinGate();
  const weekViewRef = useRef<WeekViewRef>(null);
  const dayViewRef = useRef<DayViewRef>(null);

  const serverEvents = skydark?.data?.connection ? (skydark.data.events ?? []) : FALLBACK_EVENTS;
  const events = serverEvents
    .filter((e) => !localOverrides.deleted.has(e.id))
    .map((e) => localOverrides.events.find((o) => o.id === e.id) ?? e);

  // Day view: scroll to current time after mount. Week view scrolls the current day into view internally.
  useEffect(() => {
    if (viewMode !== "day") return;
    const timer = setTimeout(() => {
      dayViewRef.current?.scrollToNow();
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode]);

  const filteredEvents = events.filter((e) => {
    if (e.external_source) {
      return settings.remoteCalendarVisibility?.[e.external_source] !== false;
    }
    return true;
  });

  const handleSaveEvent = (data: Partial<CalendarEvent> & { id?: string }) => {
    const isAdd = !data.id;
    const feature = isAdd ? "addEvents" : "editDeleteEvents";
    runIfUnlocked(feature, () => doSaveEvent(data));
  };

  const doSaveEvent = async (data: Partial<CalendarEvent> & { id?: string }) => {
    const conn = skydark?.data?.connection;
    const isAdd = !data.id;
    const hasRequired = data.title && data.start_time;
    const primaryCal = data.calendar_id?.[0];
    const targetHa =
      typeof primaryCal === "string" && primaryCal.startsWith("calendar.") ? primaryCal : null;

    if (isAdd && hasRequired && targetHa) {
      const title = data.title as string;
      const startTime = data.start_time as string;
      if (conn) {
        try {
          await pushEventToHaCalendar(conn, targetHa, {
            title,
            start_time: startTime,
            end_time: data.end_time,
            all_day: data.all_day ?? false,
            description: data.description,
            location: data.location,
          });
          await skydark?.refetchEvents();
        } catch (err) {
          console.error("[SkyDark] Failed to create event on Home Assistant calendar:", err);
        }
      }
      setEventModalOpen(false);
      setSelectedEvent(null);
      setDefaultEventStartDate(null);
      return;
    }

    if (isAdd && hasRequired) {
      const title = data.title as string;
      const startTime = data.start_time as string;
      if (conn) {
        try {
          await serviceAddEvent(conn, {
            title,
            start_time: startTime,
            end_time: data.end_time,
            all_day: data.all_day ?? false,
            calendar_id: data.calendar_id?.[0],
            calendar_ids: data.calendar_id,
            description: data.description,
            location: data.location,
          });
          await skydark?.refetchEvents();
          const pushId = settings.pushEventsToCalendarEntityId?.trim();
          if (pushId?.startsWith("calendar.")) {
            try {
              await pushEventToHaCalendar(conn, pushId, {
                title,
                start_time: startTime,
                end_time: data.end_time,
                all_day: data.all_day ?? false,
                description: data.description,
                location: data.location,
              });
            } catch (pushErr) {
              console.error("[SkyDark] Failed to push event to HA calendar:", pushErr);
            }
          }
        } catch (err) {
          console.error("[SkyDark] Failed to add event:", err);
          const newEvent: CalendarEvent = {
            id: String(Date.now()),
            title,
            start_time: startTime,
            end_time: data.end_time,
            all_day: data.all_day,
            description: data.description,
            location: data.location,
            calendar_id: data.calendar_id,
          };
          setLocalOverrides((prev) => ({ ...prev, events: [...prev.events, newEvent] }));
        }
      } else {
        const newEvent: CalendarEvent = {
          id: String(Date.now()),
          title,
          start_time: startTime,
          end_time: data.end_time,
          all_day: data.all_day,
          description: data.description,
          location: data.location,
          calendar_id: data.calendar_id,
        };
        setLocalOverrides((prev) => ({ ...prev, events: [...prev.events, newEvent] }));
      }
    } else if (data.id) {
      setLocalOverrides((prev) => ({
        ...prev,
        events: prev.events.some((e) => e.id === data.id)
          ? prev.events.map((e) => (e.id === data.id ? { ...e, ...data } : e))
          : [...prev.events, { ...serverEvents.find((e) => e.id === data.id), ...data } as CalendarEvent],
      }));
    }
    setEventModalOpen(false);
    setSelectedEvent(null);
    setDefaultEventStartDate(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    runIfUnlocked("editDeleteEvents", () => doDeleteEvent(eventId));
  };

  const doDeleteEvent = (eventId: string) => {
    setLocalOverrides((prev) => ({ ...prev, deleted: new Set(prev.deleted).add(eventId) }));
    setEventModalOpen(false);
    setSelectedEvent(null);
  };

  const openCreateEventModal = (date?: Date) => {
    runIfUnlocked("addEvents", () => {
      setSelectedEvent(null);
      setDefaultEventStartDate(date ?? null);
      setEventModalOpen(true);
    });
  };

  const goPrev = () => {
    if (viewMode === "month") setCurrentDate((d) => subWeeks(startOfWeek(d), 4));
    else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };
  const goNext = () => {
    if (viewMode === "month") setCurrentDate((d) => addWeeks(startOfWeek(d), 4));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };
  const goToday = () => {
    const now = new Date();
    if (viewMode === "week") {
      setCurrentDate(startOfWeek(now));
      queueMicrotask(() => weekViewRef.current?.scrollToNow());
    } else {
      setCurrentDate(now);
      if (viewMode === "day") queueMicrotask(() => dayViewRef.current?.scrollToNow());
    }
  };

  const weekStart = startOfWeek(currentDate);
  const focusMonthDate =
    viewMode === "month" ? addDays(weekStart, 14) : viewMode === "week" ? addDays(weekStart, 3) : currentDate;
  const monthIndex = focusMonthDate.getMonth();
  const yearIndex = focusMonthDate.getFullYear();
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, i) => y - 3 + i);
  }, []);

  const onMonthYearChange = (nextMonth: number, nextYear: number) => {
    const first = startOfMonth(new Date(nextYear, nextMonth, 1));
    setCurrentDate(startOfWeek(first));
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-skydark-bg">
      <CalendarDashboardTopCards />
      <div className="mb-3 flex min-h-10 min-w-0 shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => {
              const mode = e.target.value as "month" | "week" | "day";
              setViewMode(mode);
              const now = new Date();
              if (mode === "month") setCurrentDate(now);
              else if (mode === "week") setCurrentDate(startOfWeek(now));
              else if (mode === "day") setCurrentDate(now);
            }}
            className="input-skydark w-[7rem] shrink-0 py-2 text-sm"
            aria-label="Calendar view"
          >
            <option value="month">4 weeks</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
          {viewMode === "month" && (
            <>
              <label className="sr-only" htmlFor="cal-month">
                Month
              </label>
              <select
                id="cal-month"
                value={monthIndex}
                onChange={(e) => onMonthYearChange(Number(e.target.value), yearIndex)}
                className="input-skydark !w-max max-w-full shrink-0 py-2 text-sm [field-sizing:content]"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="cal-year">
                Year
              </label>
              <select
                id="cal-year"
                value={yearIndex}
                onChange={(e) => onMonthYearChange(monthIndex, Number(e.target.value))}
                className="input-skydark !w-max max-w-full shrink-0 py-2 text-sm tabular-nums [field-sizing:content]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}
          {viewMode === "week" && (
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-skydark-text">
              {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </span>
          )}
          {viewMode === "day" && (
            <>
              <label className="sr-only" htmlFor="cal-day">
                Date
              </label>
              <input
                id="cal-day"
                type="date"
                value={format(currentDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const [y, mo, d] = v.split("-").map(Number);
                  setCurrentDate(new Date(y, mo - 1, d));
                }}
                className="input-skydark w-[10.75rem] shrink-0 py-2 text-sm"
              />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto">
          <CalendarRemoteToggles />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={goPrev}
            className="min-h-0 min-w-0 rounded-xl p-2 hover:bg-skydark-surface-muted"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToday}
            className="min-h-0 min-w-0 whitespace-nowrap rounded-xl bg-skydark-surface-muted px-3 py-2 text-sm font-medium text-skydark-text"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNext}
            className="min-h-0 min-w-0 rounded-xl p-2 hover:bg-skydark-surface-muted"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-6">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-skydark-bg">
          {viewMode === "month" && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              familyMembers={familyMembers}
              remoteCalendarColors={settings.remoteCalendarColors}
              onDateClick={(d) => {
                setCurrentDate(d);
                openCreateEventModal(d);
              }}
              onEventClick={(e) => {
                setDefaultEventStartDate(null);
                setSelectedEvent(e);
                setEventModalOpen(true);
              }}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              ref={weekViewRef}
              currentDate={currentDate}
              events={filteredEvents}
              familyMembers={familyMembers}
              remoteCalendarColors={settings.remoteCalendarColors}
              onDateClick={(d) => {
                setCurrentDate(d);
                openCreateEventModal(d);
              }}
              onEventClick={(e) => {
                setDefaultEventStartDate(null);
                setSelectedEvent(e);
                setEventModalOpen(true);
              }}
            />
          )}
          {viewMode === "day" && (
            <DayView
              ref={dayViewRef}
              currentDate={currentDate}
              events={filteredEvents}
              familyMembers={familyMembers}
              remoteCalendarColors={settings.remoteCalendarColors}
              onDateClick={(d) => {
                setCurrentDate(d);
                openCreateEventModal(d);
              }}
              onEventClick={(e) => {
                setDefaultEventStartDate(null);
                setSelectedEvent(e);
                setEventModalOpen(true);
              }}
            />
          )}
        </div>
      </div>

      <EventModal
        open={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEvent(null);
          setDefaultEventStartDate(null);
        }}
        event={selectedEvent}
        defaultStartDate={defaultEventStartDate}
        familyMembers={familyMembers}
        haCalendarEntityIds={haCalendarEntityIds}
        defaultHaCalendarEntityId={defaultHaCalendarEntityId}
        remoteCalendarLabels={settings.remoteCalendarLabels}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <FloatingActionButton
        items={[
          {
            label: "Add event",
            icon: <span className="text-xl leading-none">+</span>,
            onClick: () => {
              openCreateEventModal();
            },
          },
        ]}
      />
      <PinPrompt {...pinPromptProps} />
    </div>
  );
}
