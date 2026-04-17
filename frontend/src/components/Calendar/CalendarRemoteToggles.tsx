import { useAppContext } from "../../contexts/AppContext";
import { useSkydarkDataContext } from "../../contexts/SkydarkDataContext";
import { calendarEntityLabel } from "../../lib/calendarEntityUi";
import { colorForRemoteCalendarEntity } from "./EventColorPattern";

export default function CalendarRemoteToggles() {
  const { settings, setSettings } = useAppContext();
  const skydark = useSkydarkDataContext();
  const entities = settings.remoteCalendarEntities ?? [];
  const vis = settings.remoteCalendarVisibility ?? {};
  const hasConnection = !!skydark?.data?.connection;

  if (entities.length === 0) {
    return null;
  }

  const toggleEntity = (entityId: string) => {
    const isVisible = vis[entityId] !== false;
    setSettings({
      remoteCalendarVisibility: {
        ...vis,
        [entityId]: !isVisible,
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end w-full">
      {entities.map((eid) => {
        const on = vis[eid] !== false;
        const accent = colorForRemoteCalendarEntity(eid, settings.remoteCalendarColors);
        const label = calendarEntityLabel(eid, settings.remoteCalendarLabels);
        return (
          <button
            key={eid}
            type="button"
            onClick={() => toggleEntity(eid)}
            disabled={!hasConnection}
            title={eid}
            className={`px-3 py-2 rounded-xl text-sm font-medium min-h-0 min-w-0 max-w-[11rem] truncate transition-colors border ${
              on
                ? "text-skydark-text shadow-sm"
                : "bg-gray-100 text-skydark-text-secondary border-gray-200 opacity-80"
            } ${!hasConnection ? "opacity-50 cursor-not-allowed" : ""}`}
            style={
              on
                ? {
                    backgroundColor: `${accent}CC`,
                    borderColor: accent,
                  }
                : undefined
            }
            aria-pressed={on}
            aria-label={`${on ? "Hide" : "Show"} events from ${label}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
