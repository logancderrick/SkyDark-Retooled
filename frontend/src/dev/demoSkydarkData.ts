import { addDays, format, formatISO, setHours, setMinutes, startOfWeek } from "date-fns";
import type { SkydarkDataState } from "../hooks/useSkydarkData";
import type { CalendarEvent } from "../types/calendar";
import type { FamilyMember } from "../types/calendar";
import type { SkydarkList, SkydarkListItem, SkydarkTask } from "../lib/skyDarkApi";

const CAL = {
  ahead: "calendar.logan_work_ahead",
  console: "calendar.logan_work_cornelis",
  kaylee: "calendar.kaylee_work",
  family: "calendar.family",
} as const;

function weekSlot(dayIndex: number, hour: number, minute: number): string {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const d = addDays(weekStart, dayIndex);
  return formatISO(setMinutes(setHours(d, hour), minute));
}

function buildDemoEvents(): CalendarEvent[] {
  return [
    {
      id: "demo-1",
      title: "Design team sync",
      start_time: weekSlot(1, 9, 30),
      end_time: weekSlot(1, 11, 30),
      external_source: CAL.ahead,
      calendar_id: [CAL.ahead],
    },
    {
      id: "demo-2",
      title: "Focus block",
      start_time: weekSlot(2, 10, 0),
      end_time: weekSlot(2, 12, 0),
      external_source: CAL.console,
      calendar_id: [CAL.console],
    },
    {
      id: "demo-3",
      title: "School pickup",
      start_time: weekSlot(3, 15, 0),
      end_time: weekSlot(3, 15, 45),
      external_source: CAL.kaylee,
      calendar_id: [CAL.kaylee],
    },
    {
      id: "demo-4",
      title: "Family dinner",
      start_time: weekSlot(5, 18, 0),
      end_time: weekSlot(5, 19, 30),
      external_source: CAL.family,
      calendar_id: [CAL.family],
    },
    {
      id: "demo-5",
      title: "All-day: Team offsite",
      start_time: `${format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), 4), "yyyy-MM-dd")}T00:00:00`,
      all_day: true,
      external_source: CAL.ahead,
      calendar_id: [CAL.ahead],
    },
    {
      id: "demo-6",
      title: "Dentist",
      start_time: weekSlot(0, 13, 0),
      end_time: weekSlot(0, 13, 45),
      external_source: CAL.family,
      calendar_id: [CAL.family],
    },
    {
      id: "demo-7",
      title: "Budget review",
      start_time: weekSlot(2, 14, 0),
      end_time: weekSlot(2, 15, 0),
      external_source: CAL.console,
      calendar_id: [CAL.console],
    },
    {
      id: "demo-8",
      title: "Soccer practice",
      start_time: weekSlot(6, 16, 0),
      end_time: weekSlot(6, 17, 30),
      external_source: CAL.kaylee,
      calendar_id: [CAL.kaylee],
    },
  ];
}

const DEMO_MEMBERS: FamilyMember[] = [
  { id: "1", name: "Logan", color: "#C8E6F5", initial: "L" },
  { id: "2", name: "Kaylee", color: "#FFD4D4", initial: "K" },
  { id: "3", name: "Kittrick", color: "#C8F5E8", initial: "Ki" },
];

const DEMO_TASKS: SkydarkTask[] = [
  {
    id: "dt1",
    title: "Load dishwasher",
    assignee_id: "1",
    frequency: "daily",
    category: "chores",
    points: 5,
  },
  {
    id: "dt2",
    title: "Litter box",
    assignee_id: "2",
    frequency: "daily",
    points: 3,
  },
  {
    id: "dt3",
    title: "Put away laundry",
    assignee_id: "3",
    frequency: "daily",
    points: 10,
    completed_date: new Date().toISOString().slice(0, 10),
  },
];

const DEMO_LISTS: SkydarkList[] = [
  { id: "dl1", name: "Groceries", color: "#3B9BBF", owner_id: "1", list_type: "shopping" },
];

const DEMO_LIST_ITEMS: Record<string, SkydarkListItem[]> = {
  dl1: [
    { id: "li1", list_id: "dl1", content: "Milk", completed: 0, sort_order: 0 },
    { id: "li2", list_id: "dl1", content: "Bread", completed: 1, sort_order: 1 },
  ],
};

/** Settings merged in demo so remote toggles / colors match sample events. */
const DEMO_APP_SETTINGS: Record<string, unknown> = {
  remoteCalendarColors: {
    [CAL.ahead]: "#ea580c",
    [CAL.console]: "#7c3aed",
    [CAL.kaylee]: "#16a34a",
    [CAL.family]: "#2563eb",
  },
  remoteCalendarLabels: {
    [CAL.ahead]: "Work — Ahead",
    [CAL.console]: "Work — Console",
    [CAL.kaylee]: "Kaylee — Work",
    [CAL.family]: "Family",
  },
  showTopWeeklyForecast: false,
  calendarPreviewCameras: ["camera.demo_back_yard"],
};

/**
 * Full SkyDark payload for local UI review without Home Assistant.
 * `connection` stays null so writes are skipped in AppContext / views.
 */
export function buildDemoSkydarkState(): SkydarkDataState {
  return {
    connection: null,
    events: buildDemoEvents(),
    tasks: DEMO_TASKS,
    lists: DEMO_LISTS,
    listItems: DEMO_LIST_ITEMS,
    familyMembers: DEMO_MEMBERS,
    photos: [],
    config: { family_name: "Demo family (local preview)" },
    appSettings: DEMO_APP_SETTINGS,
    pointsByMember: { "1": 120, "2": 45, "3": 30 },
    rewards: [],
    loading: false,
    error: null,
  };
}
