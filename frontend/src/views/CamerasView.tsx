import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import type { HassEntity } from "home-assistant-js-websocket";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import { getStatesOrDemo } from "../lib/demoHassStates";
import { isSkydarkDemo } from "../lib/demoMode";
import HaCameraLive from "../components/Cameras/HaCameraLive";

/** Hidden from the grid (e.g. vacuum map render entities, not real security feeds). */
const EXCLUDED_CAMERA_ENTITIES = new Set(["camera.l40_ultra_map", "camera.l40_ultra_map_1"]);

export default function CamerasView() {
  const skydark = useSkydarkDataContext();
  const conn = skydark?.data?.connection ?? null;
  const [cameras, setCameras] = useState<HassEntity[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreenCam, setFullscreenCam] = useState<HassEntity | null>(null);

  const closeFullscreen = useCallback(() => setFullscreenCam(null), []);

  useEffect(() => {
    if (!fullscreenCam) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreenCam, closeFullscreen]);

  useEffect(() => {
    if (!conn && !isSkydarkDemo) return;
    let cancelled = false;
    (async () => {
      try {
        const states = await getStatesOrDemo(conn);
        if (cancelled) return;
        const cams = states.filter(
          (s) => s.entity_id.startsWith("camera.") && !EXCLUDED_CAMERA_ENTITIES.has(s.entity_id)
        );
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
  }, [conn, isSkydarkDemo]);

  const sorted = useMemo(
    () =>
      [...cameras].sort((a, b) => {
        const na = String(a.attributes?.friendly_name ?? a.entity_id);
        const nb = String(b.attributes?.friendly_name ?? b.entity_id);
        return na.localeCompare(nb);
      }),
    [cameras],
  );

  if (!conn && !isSkydarkDemo) {
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

  const fullscreenOverlay =
    fullscreenCam &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex flex-col bg-black"
        role="dialog"
        aria-modal="true"
        aria-label={`Fullscreen camera: ${String(fullscreenCam.attributes?.friendly_name ?? fullscreenCam.entity_id)}`}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-4 py-3 text-white"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {String(fullscreenCam.attributes?.friendly_name ?? fullscreenCam.entity_id)}
            </p>
            <p className="truncate font-mono text-xs text-white/60">{fullscreenCam.entity_id}</p>
          </div>
          <button
            type="button"
            onClick={closeFullscreen}
            className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-skydark-accent"
          >
            Exit fullscreen
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {conn ? (
            <HaCameraLive
              entityId={fullscreenCam.entity_id}
              title={String(fullscreenCam.attributes?.friendly_name ?? fullscreenCam.entity_id)}
              connection={conn}
              entityPicture={
                typeof fullscreenCam.attributes?.entity_picture === "string"
                  ? fullscreenCam.attributes.entity_picture
                  : undefined
              }
              compact
            />
          ) : (
            <div className="flex h-full min-h-[40vh] items-center justify-center bg-gradient-to-b from-zinc-900 to-black px-6 text-center">
              <p className="text-sm text-white/70">
                Demo — connect to Home Assistant for a live stream in fullscreen.
              </p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="h-full flex flex-col min-h-0">
      {fullscreenOverlay}
      <h2 className="text-lg font-semibold text-skydark-text mb-4 shrink-0">Cameras</h2>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 items-start sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {sorted.map((cam) => {
            const name = String(cam.attributes?.friendly_name ?? cam.entity_id);
            const isFs = fullscreenCam?.entity_id === cam.entity_id;
            return (
              <button
                key={cam.entity_id}
                type="button"
                onClick={() => setFullscreenCam(cam)}
                className="rounded-[18px] border border-skydark-border bg-skydark-surface overflow-hidden shadow-skydark flex flex-col text-left transition-shadow hover:shadow-skydark-hover focus:outline-none focus:ring-2 focus:ring-skydark-accent"
              >
                <div className="relative w-full shrink-0 overflow-hidden">
                  {conn && !isFs ? (
                    <HaCameraLive
                      entityId={cam.entity_id}
                      title={name}
                      connection={conn}
                      entityPicture={
                        typeof cam.attributes?.entity_picture === "string"
                          ? cam.attributes.entity_picture
                          : undefined
                      }
                    />
                  ) : conn && isFs ? (
                    <div className="relative flex aspect-video w-full items-center justify-center bg-skydark-surface-muted px-3 text-center">
                      <p className="text-xs font-medium text-skydark-text-secondary">Playing in fullscreen…</p>
                    </div>
                  ) : (
                    <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 px-3 text-center">
                      <p className="text-xs leading-snug text-skydark-text-secondary opacity-80">
                        Demo entity — live stream when connected to Home Assistant.
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-skydark-border">
                  <p className="text-sm font-medium text-skydark-text truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-xs text-skydark-text-secondary font-mono truncate">{cam.entity_id}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
