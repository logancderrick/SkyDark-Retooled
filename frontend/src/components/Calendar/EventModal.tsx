import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import type { CalendarEvent } from "../../types/calendar";
import type { FamilyMember } from "../../types/calendar";
import { calendarEntityLabel } from "../../lib/calendarEntityUi";
import Modal from "../Common/Modal";
import Toggle from "../Common/Toggle";
import { normalizeCalendarIds } from "./EventColorPattern";

type EventModalMode = "view" | "edit" | "create";

function toLocalDateTimeInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultStartDate?: Date | null;
  familyMembers: FamilyMember[];
  /** When adding an event, user picks one of these HA calendar entities. */
  haCalendarEntityIds?: string[];
  /** Preferred HA calendar when opening Add Event (e.g. Settings default). */
  defaultHaCalendarEntityId?: string;
  remoteCalendarLabels?: Record<string, string>;
  onSave: (data: Partial<CalendarEvent> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
}

export default function EventModal({
  open,
  onClose,
  event,
  defaultStartDate,
  familyMembers,
  haCalendarEntityIds = [],
  defaultHaCalendarEntityId,
  remoteCalendarLabels,
  onSave,
  onDelete,
}: EventModalProps) {
  const [mode, setMode] = useState<EventModalMode>("create");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  /** SkyDark "calendar" = family profile id stored as calendar_id */
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [countdown, setCountdown] = useState(false);
  const [reminder, setReminder] = useState(false);

  useEffect(() => {
    if (open && event) setMode("view");
    else if (open && !event) setMode("create");
  }, [open, event]);

  useEffect(() => {
    if (event) {
      const ids = normalizeCalendarIds(event.calendar_id);
      setTitle(event.title);
      setStartTime(event.start_time.slice(0, 16));
      setEndTime(event.end_time ? event.end_time.slice(0, 16) : "");
      setAllDay(!!event.all_day);
      setSelectedCalendarId(ids[0] ?? familyMembers[0]?.id ?? "");
      setDescription(event.description || "");
      setLocation(event.location || "");
    } else {
      const now = new Date();
      const start = defaultStartDate ? new Date(defaultStartDate) : new Date(now);
      if (defaultStartDate) {
        start.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setTitle("");
      setStartTime(toLocalDateTimeInput(start));
      setEndTime(toLocalDateTimeInput(end));
      setAllDay(false);
      const haIds = haCalendarEntityIds ?? [];
      const preferredHa = defaultHaCalendarEntityId?.trim();
      const defaultHa =
        preferredHa && haIds.includes(preferredHa) ? preferredHa : haIds[0] ?? "";
      setSelectedCalendarId(defaultHa);
      setDescription("");
      setLocation("");
      setRepeats(false);
      setCountdown(false);
      setReminder(false);
    }
  }, [event, open, familyMembers, defaultStartDate, haCalendarEntityIds, defaultHaCalendarEntityId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const calId = selectedCalendarId.trim();
    onSave({
      ...(event?.id && { id: event.id }),
      title,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : undefined,
      all_day: allDay,
      calendar_id: calId ? [calId] : undefined,
      description: description || undefined,
      location: location || undefined,
    });
    onClose();
  };

  const isView = mode === "view";
  const isRemoteEvent = !!event?.external_source;
  const creating = !event;
  const editingProfileEvent = !!(event && !event.external_source);

  const viewCalendarMembers = event
    ? (normalizeCalendarIds(event.calendar_id)
        .map((id) => familyMembers.find((m) => m.id === id))
        .filter(Boolean) as FamilyMember[])
    : [];

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isView ? (event?.title ?? "Event") : event ? "Edit Event" : "Add Event"}
        variant="slideRight"
        rightAction={
          isView && !isRemoteEvent ? (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="p-2 rounded-lg hover:bg-gray-100 text-skydark-text-secondary"
              aria-label="Edit event"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          ) : undefined
        }
      >
        {isView ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-skydark-text-secondary mb-0.5">When</p>
              <p className="text-skydark-text font-medium">
                {allDay
                  ? format(parseISO(startTime), "EEE, MMM d, yyyy")
                  : `${format(parseISO(startTime), "EEE, MMM d · h:mm a")}${
                      endTime ? ` – ${format(parseISO(endTime), "h:mm a")}` : ""
                    }`}
              </p>
            </div>
            {location && (
              <div>
                <p className="text-sm text-skydark-text-secondary mb-0.5">Location</p>
                <p className="text-skydark-text">{location}</p>
              </div>
            )}
            {event?.external_source && (
              <div>
                <p className="text-sm text-skydark-text-secondary mb-0.5">Home Assistant calendar</p>
                <p className="text-skydark-text text-sm break-all">{event.external_source}</p>
              </div>
            )}
            {!isRemoteEvent && viewCalendarMembers.length > 0 && (
              <div>
                <p className="text-sm text-skydark-text-secondary mb-0.5">Calendar</p>
                <div className="flex flex-wrap gap-2">
                  {viewCalendarMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.initial}
                      </div>
                      <span className="text-skydark-text">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {description && (
              <div>
                <p className="text-sm text-skydark-text-secondary mb-0.5">Description</p>
                <p className="text-skydark-text whitespace-pre-wrap">{description}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-medium text-skydark-text mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-skydark"
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-skydark-text">All day</span>
                <Toggle checked={allDay} onChange={setAllDay} aria-label="All day event" />
              </div>

              {allDay ? (
                <div>
                  <label className="block text-sm font-medium text-skydark-text mb-1">Date</label>
                  <input
                    type="date"
                    value={startTime.slice(0, 10)}
                    onChange={(e) => {
                      const d = e.target.value;
                      setStartTime(d ? `${d}T00:00:00` : startTime);
                      if (endTime) setEndTime(endTime.slice(0, 10) + "T23:59:59");
                    }}
                    className="input-skydark"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Starts</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-skydark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Ends</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input-skydark"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-skydark-text">Repeats</span>
                <Toggle checked={repeats} onChange={setRepeats} aria-label="Repeats" />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-skydark-text">Countdown</span>
                <Toggle checked={countdown} onChange={setCountdown} aria-label="Countdown" />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-skydark-text">Reminder</span>
                <Toggle checked={reminder} onChange={setReminder} aria-label="Reminder" />
              </div>

              <div>
                {creating ? (
                  <>
                    <label className="block text-sm font-medium text-skydark-text mb-1.5">Home Assistant calendar</label>
                    {(haCalendarEntityIds ?? []).length === 0 ? (
                      <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        Add at least one <span className="font-mono">calendar.*</span> entity under{" "}
                        <span className="font-medium">Settings → Calendar → Remote calendars</span> so you can choose where new
                        events are created.
                      </p>
                    ) : (
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="input-skydark w-full"
                        required
                        aria-label="Home Assistant calendar for this event"
                      >
                        {(haCalendarEntityIds ?? []).map((eid) => (
                          <option key={eid} value={eid}>
                            {calendarEntityLabel(eid, remoteCalendarLabels)}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-skydark-text-secondary mt-1.5">
                      The event is written to this calendar using Home Assistant&apos;s{" "}
                      <span className="font-mono">calendar.create_event</span> and appears in SkyDark when that calendar is merged.
                    </p>
                  </>
                ) : editingProfileEvent ? (
                  <>
                    <label className="block text-sm font-medium text-skydark-text mb-1.5">Family profile</label>
                    {familyMembers.length === 0 ? (
                      <p className="text-sm text-skydark-text-secondary">
                        Add a family profile under Settings first.
                      </p>
                    ) : (
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="input-skydark w-full"
                        required
                        aria-label="Family profile for this event"
                      >
                        {familyMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-skydark-text-secondary mt-1.5">
                      SkyDark stores this event on the selected profile. Use Settings → Calendar for defaults and merged HA
                      calendars.
                    </p>
                  </>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-skydark-text mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-skydark"
                  placeholder="Location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-skydark-text mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input-skydark resize-none"
                  placeholder="Description"
                />
              </div>
            </div>

            <div className="pt-6 pb-2 shrink-0 space-y-2">
              {event && onDelete && !isRemoteEvent && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(event.id);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={
                  creating
                    ? (haCalendarEntityIds ?? []).length === 0
                    : editingProfileEvent && familyMembers.length === 0
                }
              >
                {event ? "Save" : "Add"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
