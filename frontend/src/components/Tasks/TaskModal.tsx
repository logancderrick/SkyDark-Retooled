import { useState, useEffect } from "react";
import type { FamilyMember } from "../../types/calendar";
import type { Task } from "../../types/tasks";
import type { CustomScheduleType } from "../../types/tasks";
import { TASK_CATEGORIES, TASK_FREQUENCIES, WEEKDAY_LABELS, MONTH_LABELS } from "../../types/tasks";
import Modal from "../Common/Modal";
import Toggle from "../Common/Toggle";

const EMOJI_OPTIONS = ["📋", "🧹", "🍽️", "📚", "🐕", "🗑️", "💊", "⭐", ""];

/** True when the task repeats on a schedule; false = one-time task with a due date only. */
function taskIsRepeating(t: Task | null | undefined): boolean {
  if (!t) return true;
  if (t.frequency !== "custom") return true;
  const sched = t.custom_schedule ?? (t.due_date ? "date" : undefined);
  return sched !== "date";
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  familyMembers: FamilyMember[];
  onSave: (data: Partial<Task> & { id?: string }) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskModal({
  open,
  onClose,
  task,
  familyMembers,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [taskType, setTaskType] = useState<"chore" | "routine">("chore");
  const [emoji, setEmoji] = useState("");
  const [points, setPoints] = useState(0);
  const [repeats, setRepeats] = useState(true);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [customDueDate, setCustomDueDate] = useState("");
  const [customSchedule, setCustomSchedule] = useState<CustomScheduleType>("date");
  const [customMonthday, setCustomMonthday] = useState(15);
  const [customMonth, setCustomMonth] = useState(1);
  const [customWeekday, setCustomWeekday] = useState(1);
  const [customWeekOfMonth, setCustomWeekOfMonth] = useState(1);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setAssigneeId(task.assignee_id);
      setCategory(task.category || "");
      setFrequency(task.frequency || "daily");
      setEmoji(task.icon || "");
      setPoints(typeof task.points === "number" ? task.points : 0);
      setWeekdays(
        task.frequency === "weekly" && task.weekdays?.length
          ? [...task.weekdays]
          : task.frequency === "weekly"
            ? [new Date().getDay()]
            : []
      );
      setCustomDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
      setCustomSchedule((task.custom_schedule as CustomScheduleType) ?? "date");
      setCustomMonthday(task.custom_monthday ?? 15);
      setCustomMonth(task.custom_month ?? 1);
      setCustomWeekday(task.custom_weekday ?? 1);
      setCustomWeekOfMonth(task.custom_week_of_month ?? 1);
      setRepeats(taskIsRepeating(task));
    } else {
      setTitle("");
      setAssigneeId(familyMembers[0]?.id || "");
      setCategory("");
      setFrequency("daily");
      setTaskType("chore");
      setEmoji("");
      setPoints(0);
      setRepeats(true);
      const today = new Date().getDay();
      setWeekdays([today]);
      const todayStr = new Date().toISOString().slice(0, 10);
      setCustomDueDate(todayStr);
      setCustomSchedule("date");
      setCustomMonthday(new Date().getDate());
      setCustomMonth(new Date().getMonth() + 1);
      setCustomWeekday(new Date().getDay());
      const d = new Date();
      let firstOcc = 1;
      while (new Date(d.getFullYear(), d.getMonth(), firstOcc).getDay() !== d.getDay()) firstOcc++;
      setCustomWeekOfMonth(Math.min(Math.floor((d.getDate() - firstOcc) / 7) + 1, 5));
    }
  }, [task, open, familyMembers]);

  useEffect(() => {
    if (repeats && frequency === "weekly" && weekdays.length === 0) {
      setWeekdays([new Date().getDay()]);
    }
  }, [frequency, repeats]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleRepeatsChange = (next: boolean) => {
    if (next && frequency === "custom" && customSchedule === "date") {
      setFrequency("daily");
    }
    setRepeats(next);
    if (!next) {
      setCustomDueDate((d) => d || new Date().toISOString().slice(0, 10));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repeats) {
      onSave({
        ...(task?.id && { id: task.id }),
        title,
        assignee_id: assigneeId,
        category: category || undefined,
        frequency: "custom",
        custom_schedule: "date",
        due_date: customDueDate ? `${customDueDate}T23:59:59.000Z` : undefined,
        weekdays: undefined,
        custom_monthday: undefined,
        custom_month: undefined,
        custom_weekday: undefined,
        custom_week_of_month: undefined,
        icon: emoji || undefined,
        points,
      });
      onClose();
      return;
    }

    onSave({
      ...(task?.id && { id: task.id }),
      title,
      assignee_id: assigneeId,
      category: category || undefined,
      frequency,
      ...(frequency === "weekly" && { weekdays: weekdays.length ? weekdays : [new Date().getDay()] }),
      ...(frequency !== "weekly" && { weekdays: undefined }),
      ...(frequency === "custom" && {
        custom_schedule: customSchedule,
        ...(customSchedule === "date" && customDueDate && { due_date: `${customDueDate}T23:59:59.000Z` }),
        ...(customSchedule !== "date" && { due_date: undefined }),
        ...(customSchedule === "monthly" && { custom_monthday: customMonthday, custom_month: undefined, custom_weekday: undefined, custom_week_of_month: undefined }),
        ...(customSchedule === "yearly" && { custom_monthday: customMonthday, custom_month: customMonth, custom_weekday: undefined, custom_week_of_month: undefined }),
        ...(customSchedule === "weekday_of_month" && { custom_monthday: undefined, custom_month: undefined, custom_weekday: customWeekday, custom_week_of_month: customWeekOfMonth }),
      }),
      ...(frequency !== "custom" && {
        due_date: undefined,
        custom_schedule: undefined,
        custom_monthday: undefined,
        custom_month: undefined,
        custom_weekday: undefined,
        custom_week_of_month: undefined,
      }),
      icon: emoji || undefined,
      points,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit Task" : "Add Task"}
      variant="slideRight"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1">Emoji (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.filter(Boolean).map((e) => (
                <button
                  key={e}
                  type="button"
                  data-compact
                  onClick={() => setEmoji(emoji === e ? "" : e)}
                  className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-colors ${
                    emoji === e
                      ? "border-skydark-accent bg-skydark-accent-bg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  aria-label={`Select ${e}`}
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                data-compact
                onClick={() => setEmoji("")}
                className={`w-10 h-10 rounded-xl border-2 text-sm flex items-center justify-center ${
                  !emoji ? "border-skydark-accent bg-skydark-accent-bg" : "border-gray-200"
                }`}
                aria-label="Clear emoji"
              >
                —
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-skydark-text mb-2">Profiles</label>
            <div className="flex items-end gap-3 flex-wrap">
              {familyMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-compact
                  onClick={() => setAssigneeId(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 transition-colors ${
                    assigneeId === m.id
                      ? "border-skydark-accent bg-white shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.initial}
                  </div>
                  <span className="text-xs font-medium text-skydark-text">{m.name}</span>
                </button>
              ))}
              <button
                type="button"
                data-compact
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 px-2 py-1.5 text-skydark-text-secondary hover:border-skydark-accent hover:text-skydark-accent"
                aria-label="Add profile"
              >
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl font-light text-gray-400">
                  +
                </div>
                <span className="text-xs font-medium">Add</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-skydark-text mb-2">Task type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaskType("chore")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  taskType === "chore"
                    ? "bg-skydark-text text-white"
                    : "bg-gray-100 text-skydark-text-secondary hover:bg-gray-200"
                }`}
              >
                Chore
              </button>
              <button
                type="button"
                onClick={() => setTaskType("routine")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  taskType === "routine"
                    ? "bg-skydark-text text-white"
                    : "bg-gray-100 text-skydark-text-secondary hover:bg-gray-200"
                }`}
              >
                Routine
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1.5">Points (towards rewards)</label>
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
              className="input-skydark mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-skydark"
              placeholder="Task title"
              required
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <span className="text-sm font-medium text-skydark-text">Repeating chore</span>
                <p className="text-xs text-skydark-text-secondary mt-1 leading-snug">
                  Turn off for a one-time chore due on a single date.
                </p>
              </div>
              <Toggle checked={repeats} onChange={handleRepeatsChange} aria-label="Repeating chore" />
            </div>
            {!repeats && (
              <div>
                <label className="block text-sm font-medium text-skydark-text mb-1.5">Due date</label>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="input-skydark"
                  required
                />
              </div>
            )}
          </div>

          {repeats && (
            <div>
              <label className="block text-sm font-medium text-skydark-text mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="input-skydark"
              >
                {TASK_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {repeats && frequency === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-skydark-text mb-2">Days of week</label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    data-compact
                    onClick={() => toggleWeekday(day)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      weekdays.includes(day)
                        ? "bg-skydark-accent text-white"
                        : "bg-gray-100 text-skydark-text-secondary hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {repeats && frequency === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-skydark-text mb-2">Schedule type</label>
                <select
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value as CustomScheduleType)}
                  className="input-skydark"
                >
                  <option value="date">Single date</option>
                  <option value="monthly">Monthly (e.g. 15th)</option>
                  <option value="yearly">Yearly (e.g. Jan 15)</option>
                  <option value="weekday_of_month">Weekday of month (e.g. first Monday)</option>
                </select>
              </div>
              {customSchedule === "date" && (
                <div>
                  <label className="block text-sm font-medium text-skydark-text mb-2">Due date</label>
                  <input
                    type="date"
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="input-skydark"
                    aria-label="Custom due date"
                  />
                </div>
              )}
              {customSchedule === "monthly" && (
                <div>
                  <label className="block text-sm font-medium text-skydark-text mb-2">Day of month (1–31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={customMonthday}
                    onChange={(e) => setCustomMonthday(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className="input-skydark"
                  />
                </div>
              )}
              {customSchedule === "yearly" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Month</label>
                    <select
                      value={customMonth}
                      onChange={(e) => setCustomMonth(parseInt(e.target.value, 10))}
                      className="input-skydark"
                    >
                      {MONTH_LABELS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Day of month (1–31)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={customMonthday}
                      onChange={(e) => setCustomMonthday(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="input-skydark"
                    />
                  </div>
                </div>
              )}
              {customSchedule === "weekday_of_month" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Weekday</label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_LABELS.map((label, day) => (
                        <button
                          key={day}
                          type="button"
                          data-compact
                          onClick={() => setCustomWeekday(day)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            customWeekday === day ? "bg-skydark-accent text-white" : "bg-gray-100 text-skydark-text-secondary hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-skydark-text mb-1">Week of month</label>
                    <select
                      value={customWeekOfMonth}
                      onChange={(e) => setCustomWeekOfMonth(parseInt(e.target.value, 10))}
                      className="input-skydark"
                    >
                      <option value={1}>First</option>
                      <option value={2}>Second</option>
                      <option value={3}>Third</option>
                      <option value={4}>Fourth</option>
                      <option value={5}>Last</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-skydark-text mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-skydark"
            >
              <option value="">—</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-6 pb-2 shrink-0 space-y-2">
          {task && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(task.id);
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
          >
            {task ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
