import { useEffect, useMemo, useState } from "react";
import { getStates } from "home-assistant-js-websocket";
import type { Connection, HassEntity } from "home-assistant-js-websocket";
import HaCameraLive from "../Cameras/HaCameraLive";

interface CalendarCameraPreviewProps {
  connection: Connection;
  /** Home Assistant `camera.*` entity IDs; two or more rotate on an interval. */
  cameraEntityIds: string[];
  /** Seconds between switches when more than one camera is configured. */
  rotateIntervalSec: number;
}

export default function CalendarCameraPreview({
  connection,
  cameraEntityIds,
  rotateIntervalSec,
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
    const ms = Math.min(120, Math.max(10, rotateIntervalSec)) * 1000;
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
        const states = await getStates(connection);
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
      className="rounded-2xl border border-gray-200 bg-gray-950 overflow-hidden shadow-skydark w-full max-h-[min(42vh,360px)] flex flex-col"
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
      <div className="relative w-full flex-1 min-h-[180px] bg-black">
        <HaCameraLive
          key={activeId}
          entityId={activeId}
          title={title}
          connection={connection}
          entityPicture={entityPicture}
        />
      </div>
    </div>
  );
}
