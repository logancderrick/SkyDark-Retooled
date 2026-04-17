import { useEffect, useState, useMemo, useRef } from "react";
import { getStates } from "home-assistant-js-websocket";
import type { HassEntity } from "home-assistant-js-websocket";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import { getHassAccessToken } from "../lib/haAuth";

/**
 * Load camera snapshots through the REST API with optional Bearer auth.
 * Plain <img src="/api/camera_proxy/..."> does not send WebSocket auth; HA returns 401 when
 * the panel uses a token-based connection (no session cookie), so we fetch blobs instead.
 */
async function fetchCameraSnapshotBlobUrl(
  entityId: string,
  accessToken: string | undefined
): Promise<string | null> {
  const origin = window.location.origin;
  const url = `${origin}/api/camera_proxy/${encodeURIComponent(entityId)}`;
  const res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: "include",
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default function CamerasView() {
  const skydark = useSkydarkDataContext();
  const conn = skydark?.data?.connection ?? null;
  const [cameras, setCameras] = useState<HassEntity[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [snapshotFailed, setSnapshotFailed] = useState<Record<string, boolean>>({});
  const snapshotUrlsRef = useRef<Record<string, string>>({});

  const revokeAllSnapshotUrls = () => {
    Object.values(snapshotUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    snapshotUrlsRef.current = {};
  };

  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    (async () => {
      try {
        const states = await getStates(conn);
        if (cancelled) return;
        const cams = states.filter((s) => s.entity_id.startsWith("camera."));
        setCameras(cams);
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load cameras");
        setCameras([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const sorted = useMemo(
    () =>
      [...cameras].sort((a, b) => {
        const na = String(a.attributes?.friendly_name ?? a.entity_id);
        const nb = String(b.attributes?.friendly_name ?? b.entity_id);
        return na.localeCompare(nb);
      }),
    [cameras],
  );

  const cameraKey = useMemo(() => sorted.map((c) => c.entity_id).join("|"), [sorted]);

  useEffect(() => {
    if (!conn || sorted.length === 0) {
      revokeAllSnapshotUrls();
      setSnapshots({});
      setSnapshotFailed({});
      return;
    }

    let cancelled = false;
    const token = getHassAccessToken(conn);

    (async () => {
      const nextUrls: Record<string, string> = {};
      const failed: Record<string, boolean> = {};

      await Promise.all(
        sorted.map(async (cam) => {
          const id = cam.entity_id;
          try {
            const blobUrl = await fetchCameraSnapshotBlobUrl(id, token);
            if (cancelled) {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              return;
            }
            if (blobUrl) {
              nextUrls[id] = blobUrl;
            } else {
              failed[id] = true;
            }
          } catch {
            failed[id] = true;
          }
        })
      );

      if (cancelled) {
        Object.values(nextUrls).forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      revokeAllSnapshotUrls();
      snapshotUrlsRef.current = nextUrls;
      setSnapshots(nextUrls);
      setSnapshotFailed(failed);
    })();

    return () => {
      cancelled = true;
    };
  }, [conn, tick, cameraKey, sorted]);

  useEffect(() => {
    if (sorted.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, [sorted.length]);

  useEffect(
    () => () => {
      revokeAllSnapshotUrls();
      setSnapshots({});
    },
    []
  );

  if (!conn) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-skydark-text-secondary text-sm">
        Connect to Home Assistant to view cameras.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <p className="text-skydark-text font-medium mb-1">Could not load cameras</p>
        <p className="text-sm text-skydark-text-secondary">{loadError}</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <p className="text-skydark-text font-medium mb-2">No cameras found</p>
        <p className="text-sm text-skydark-text-secondary">
          Add a camera integration in Home Assistant, then open this page again.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-lg font-semibold text-skydark-text mb-4 shrink-0">Cameras</h2>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {sorted.map((cam) => {
            const name = String(cam.attributes?.friendly_name ?? cam.entity_id);
            const src = snapshots[cam.entity_id];
            const failed = snapshotFailed[cam.entity_id];
            return (
              <div
                key={cam.entity_id}
                className="rounded-card border border-gray-200 bg-white overflow-hidden shadow-skydark flex flex-col"
              >
                <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
                  {src ? (
                    <img src={src} alt={name} className="h-full w-full object-contain" />
                  ) : (
                    <p className="text-sm text-gray-400 px-4 text-center">
                      {failed ? "Unable to load snapshot (check camera permissions or entity state)." : "Loading…"}
                    </p>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-skydark-text truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-xs text-skydark-text-secondary font-mono truncate">{cam.entity_id}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
