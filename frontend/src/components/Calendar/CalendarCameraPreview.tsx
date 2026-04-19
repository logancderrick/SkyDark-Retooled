import { useEffect, useMemo, useState } from "react";
import type { Connection, HassEntity } from "home-assistant-js-websocket";
import { getStatesOrDemo } from "../../lib/demoHassStates";
import HaCameraLive from "../Cameras/HaCameraLive";

interface CalendarCameraPreviewProps {
  /** Null in demo mode: entity names still load; live stream shows a placeholder. */
  connection: Connection | null;
  /** Home Assistant `camera.*` entity IDs; two or more rotate on an interval. */
  cameraEntityIds: string[];
  /** Seconds between switches when more than one camera is configured. */
  rotateIntervalSec: number;
  /** When nested in a parent card, drop outer border/radius so the shell does not double-frame. */
  embedded?: boolean;
}

export default function CalendarCameraPreview({
  connection,
  cameraEntityIds,
  rotateIntervalSec,
  embedded = false,
}: CalendarCameraPreviewProps) {
  const ids = useMemo(
    () => cameraEntityIds.filter((id) => typeof id === "string" && id.trim().startsWith("camera.")).map((id) => id.trim()),
    [cameraEntityIds]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [metaById, setMetaById] = useState<Record<string, HassEntity>>({});

  useEffect(() => {
    setActiveIndex(0);
  }, [ids.join("|")]);

  useEffect(() => {
    if (ids.length <= 1) return;
    const ms = Math.max(10, Math.min(120, rotateIntervalSec)) * 1000;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % ids.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [ids, rotateIntervalSec]);

  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const states = await getStatesOrDemo(connection);
        if (cancelled) return;
        const next: Record<string, HassEntity> = {};
        for (const e of states) {
          if (ids.includes(e.entity_id)) next[e.entity_id] = e;
        }
        setMetaById(next);
      } catch {
        if (!cancelled) setMetaById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, ids.join("|")]);

  if (ids.length === 0) return null;

  const activeId = ids[activeIndex % ids.length]!;
  const entity = metaById[activeId];
  const title = String(entity?.attributes?.friendly_name ?? activeId);
  const entityPicture =
    typeof entity?.attributes?.entity_picture === "string" ? entity.attributes.entity_picture : undefined;

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-none border-0 bg-gray-950 shadow-none"
          : "flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-skydark-border bg-gray-950 shadow-skydark"
      }
      aria-label="Calendar camera preview"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-900/95 border-b border-gray-800 shrink-0">
        <span className="text-xs font-medium text-gray-100 truncate" title={title}>
          {title}
        </span>
        {ids.length > 1 && (
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
            {activeIndex + 1}/{ids.length}
          </span>
        )}
      </div>
      <div
        className={
          embedded
            ? "relative min-h-0 flex-1 w-full min-w-0 overflow-hidden bg-black"
            : "relative w-full min-w-0 shrink-0 overflow-hidden bg-black"
        }
      >
        {connection ? (
          <HaCameraLive
            key={activeId}
            entityId={activeId}
            title={title}
            connection={connection}
            entityPicture={entityPicture}
            compact={embedded}
          />
        ) : (
          <div
            className={
              embedded
                ? "relative flex h-full min-h-0 w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 px-3 text-center"
                : "relative flex aspect-video w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 px-4 text-center"
            }
          >
            <p
              className={
                embedded ? "text-xs leading-snug text-gray-400" : "max-w-[18rem] text-sm leading-snug text-gray-400"
              }
            >
              Demo camera entity — connect to Home Assistant for a live stream.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
