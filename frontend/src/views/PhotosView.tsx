import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import { useAppContext } from "../contexts/AppContext";
import { addPhotoWS, deletePhotoWS, fetchPhotos, resolveMediaUrl, type SkydarkPhoto } from "../lib/skyDarkApi";
import { loadHaImageAsBlobUrl } from "../lib/loadHaImageBlob";
import { haMediaImgSrc } from "../lib/haMediaImgUrl";
import { getWeatherIcon, useWeatherData } from "../hooks/useWeeklyWeather";
import CalendarCameraPreview from "../components/Calendar/CalendarCameraPreview";

type PhotoItem = {
  id: string;
  caption: string;
  rawUrl: string;
  displayUrl: string;
};

function normalizePhotos(photos: SkydarkPhoto[]): PhotoItem[] {
  return photos
    .map((p) => ({
      id: String(p.id),
      caption: String(p.caption ?? ""),
      rawUrl: String(p.file_path ?? "").trim(),
      displayUrl: "",
    }))
    .filter((p) => p.rawUrl.length > 0);
}

export default function PhotosView() {
  const skydark = useSkydarkDataContext();
  const conn = skydark?.data?.connection ?? null;
  const weather = useWeatherData();
  const { settings } = useAppContext();
  const sleepCameraIds = settings.calendarPreviewCameras ?? [];

  const [isSleeping, setIsSleeping] = useState(false);
  const photosRef = useRef<PhotoItem[]>([]);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sleepPhotoId, setSleepPhotoId] = useState<string | null>(null);
  /** Set when <img> fires onError (bad URL, 401, missing file). */
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  /** When query-token img fails, same-origin fetch with Bearer often still works — use blob: URLs. */
  const [fallbackBlobUrls, setFallbackBlobUrls] = useState<Record<string, string>>({});
  const blobRecoveringRef = useRef(new Set<string>());
  const resolveRecoveringRef = useRef(new Set<string>());
  const [sleepImageError, setSleepImageError] = useState(false);
  const [sleepBlobUrl, setSleepBlobUrl] = useState<string | null>(null);
  const sleepRecoveringRef = useRef(false);

  const loadPhotos = useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPhotos(conn);
      const normalized = normalizePhotos(res.photos ?? []);
      const resolved = await Promise.all(
        normalized.map(async (photo) => {
          try {
            const displayUrl = await resolveMediaUrl(conn, photo.rawUrl);
            return { ...photo, displayUrl };
          } catch {
            return { ...photo, displayUrl: "" };
          }
        })
      );
      setPhotos(resolved);
      setImageLoadErrors({});
      setFallbackBlobUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return {};
      });
      blobRecoveringRef.current.clear();
      resolveRecoveringRef.current.clear();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load photos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [conn]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  // Keep a ref to photos so the slideshow interval can access the latest list without re-mounting.
  useEffect(() => {
    photosRef.current = photos;
  });

  // Rotate to a new random photo every 60 seconds while sleep mode is active.
  useEffect(() => {
    if (!isSleeping) return;
    const timerId = window.setInterval(() => {
      setSleepPhotoId((current) => {
        const all = photosRef.current;
        if (all.length <= 1) return current;
        const pool = all.filter((p) => p.id !== current);
        const src = pool.length > 0 ? pool : all;
        return src[Math.floor(Math.random() * src.length)].id;
      });
    }, 60_000);
    return () => window.clearInterval(timerId);
  }, [isSleeping]);

  useEffect(() => {
    setSleepImageError(false);
    setSleepBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    sleepRecoveringRef.current = false;
  }, [sleepPhotoId]);

  useEffect(
    () => () => {
      setFallbackBlobUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return {};
      });
      setSleepBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    []
  );

  useEffect(() => {
    if (!sleepPhotoId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitSleep();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepPhotoId]);

  const sleepPhoto = useMemo(
    () => photos.find((p) => p.id === sleepPhotoId) ?? null,
    [photos, sleepPhotoId]
  );

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!conn || files.length === 0) return;
    setError(null);
    try {
      await Promise.all(
        files.map(
          (file) =>
            new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const dataUrl = String(reader.result ?? "");
                  if (!dataUrl.startsWith("data:image/")) {
                    reject(new Error(`Unsupported image data in ${file.name}`));
                    return;
                  }
                  await addPhotoWS(conn, { url: dataUrl, caption: "", filename: file.name });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              };
              reader.onerror = () => reject(new Error(`Failed reading ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      );
      await loadPhotos();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Photo upload failed";
      setError(message);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!conn) return;
    try {
      await deletePhotoWS(conn, photoId);
      await loadPhotos();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
    }
  };

  const startSleep = () => {
    if (photos.length === 0) return;
    const random = photos[Math.floor(Math.random() * photos.length)];
    setSleepPhotoId(random.id);
    setIsSleeping(true);
  };

  const exitSleep = () => {
    setSleepPhotoId(null);
    setIsSleeping(false);
  };

  return (
    <div className="h-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-skydark-text">Photos</h2>
        <div className="flex items-center gap-2">
          <label className="btn-secondary cursor-pointer">
            Upload photos
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
          <button
            type="button"
            onClick={startSleep}
            disabled={photos.length === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sleep
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-skydark-text-secondary">Loading photos...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && photos.length === 0 ? (
        <p className="text-sm text-skydark-text-secondary">No photos yet. Upload some to get started.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const blobSrc = fallbackBlobUrls[photo.id];
            const rawSrc = blobSrc ?? photo.displayUrl;
            const imgSrc = rawSrc ? (blobSrc ? rawSrc : haMediaImgSrc(rawSrc)) : "";
            const showImg = Boolean(imgSrc) && (!imageLoadErrors[photo.id] || Boolean(blobSrc));
            return (
            <div key={photo.id} className="group relative aspect-[3/2] overflow-hidden rounded-card bg-skydark-surface-muted">
              {showImg ? (
                <img
                  src={imgSrc}
                  alt={photo.caption || "Photo"}
                  className="h-full w-full object-cover"
                  onError={() => {
                    if (blobSrc) {
                      setImageLoadErrors((prev) => ({ ...prev, [photo.id]: true }));
                      return;
                    }
                    const id = photo.id;
                    if (!conn || !photo.displayUrl || blobRecoveringRef.current.has(id)) {
                      setImageLoadErrors((prev) => ({ ...prev, [id]: true }));
                      return;
                    }
                    void (async () => {
                      try {
                        if (!resolveRecoveringRef.current.has(id)) {
                          resolveRecoveringRef.current.add(id);
                          try {
                            // Signed URLs can expire; ask HA for a fresh resolved URL once before blob fallback.
                            const refreshed = await resolveMediaUrl(conn, photo.rawUrl);
                            if (refreshed && refreshed !== photo.displayUrl) {
                              setPhotos((prev) =>
                                prev.map((p) => (p.id === id ? { ...p, displayUrl: refreshed } : p))
                              );
                              setImageLoadErrors((prev) => {
                                const next = { ...prev };
                                delete next[id];
                                return next;
                              });
                              return;
                            }
                          } finally {
                            resolveRecoveringRef.current.delete(id);
                          }
                        }
                        blobRecoveringRef.current.add(id);
                        const blobUrl = await loadHaImageAsBlobUrl(photo.displayUrl, conn);
                        if (blobUrl) {
                          setFallbackBlobUrls((prev) => {
                            const old = prev[id];
                            if (old) URL.revokeObjectURL(old);
                            return { ...prev, [id]: blobUrl };
                          });
                          setImageLoadErrors((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          });
                        } else {
                          setImageLoadErrors((prev) => ({ ...prev, [id]: true }));
                        }
                      } finally {
                        blobRecoveringRef.current.delete(id);
                      }
                    })();
                  }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-skydark-border bg-skydark-bg/50 px-2 text-center">
                  <span className="text-[11px] font-medium leading-snug text-skydark-text-secondary">
                    {imageLoadErrors[photo.id] ? "Image could not load" : "Preview unavailable"}
                  </span>
                  {!photo.displayUrl && (
                    <span className="text-[10px] text-skydark-text-secondary/80">Check HA media access</span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(photo.id)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
            );
          })}
        </div>
      )}

      {sleepPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-black"
          onClick={exitSleep}
          role="button"
          tabIndex={0}
        >
          {/* Background photo — cycles every 60 s */}
          {(sleepBlobUrl || sleepPhoto.displayUrl) && !sleepImageError ? (
            <img
              key={sleepPhoto.id}
              src={
                sleepBlobUrl
                  ? sleepBlobUrl
                  : sleepPhoto.displayUrl
                    ? haMediaImgSrc(sleepPhoto.displayUrl)
                    : ""
              }
              alt={sleepPhoto.caption || "Sleep mode photo"}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                if (sleepBlobUrl) { setSleepImageError(true); return; }
                if (!conn || !sleepPhoto.displayUrl || sleepRecoveringRef.current) { setSleepImageError(true); return; }
                sleepRecoveringRef.current = true;
                void (async () => {
                  try {
                    const refreshed = await resolveMediaUrl(conn, sleepPhoto.rawUrl);
                    if (refreshed && refreshed !== sleepPhoto.displayUrl) {
                      setPhotos((prev) => prev.map((p) => (p.id === sleepPhoto.id ? { ...p, displayUrl: refreshed } : p)));
                      setSleepImageError(false);
                      return;
                    }
                    const blobUrl = await loadHaImageAsBlobUrl(sleepPhoto.displayUrl, conn);
                    if (blobUrl) {
                      setSleepBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return blobUrl; });
                    } else { setSleepImageError(true); }
                  } finally { sleepRecoveringRef.current = false; }
                })();
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black" />
          )}

          {/* Scrim — heavier at top/bottom so cards read clearly */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/55" />

          {/* ── Top-left panel row: camera + weather (same card size) ── */}
          <div
            className="absolute top-6 left-6 z-10 flex flex-wrap gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Camera card — matches camera tab card style; non-embedded so CalendarCameraPreview
                 renders its own header + stream at the correct aspect ratio */}
            {sleepCameraIds.length > 0 && (
              <div className="w-[480px] overflow-hidden rounded-[18px] border border-white/15 shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                <CalendarCameraPreview
                  connection={conn}
                  cameraEntityIds={sleepCameraIds}
                  rotateIntervalSec={30}
                />
              </div>
            )}

            {/* Weather card — header on top + aspect-video content to match camera card height */}
            <div className="flex w-[480px] flex-col overflow-hidden rounded-[18px] border border-white/15 bg-gray-950 shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
              {/* Header bar — matches CalendarCameraPreview's header style */}
              <div className="shrink-0 border-b border-gray-800 bg-gray-900/95 px-3 py-2">
                <p className="truncate text-xs font-medium text-gray-100">
                  {weather.locationLabel ?? "Current Weather"}
                </p>
                <p className="truncate text-[10px] text-gray-400">
                  {[
                    weather.weekly[0] ? `${weather.weekly[0].tempMin}° / ${weather.weekly[0].tempMax}°` : null,
                    weather.current?.humidity != null ? `${weather.current.humidity}% hum` : null,
                    weather.current?.windMph != null ? `${weather.current.windMph} mph` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              {/* Stream-area — same 16:9 aspect ratio so total height matches camera card */}
              <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-700/70 via-slate-900 to-gray-950 px-3">
                <span className="text-8xl leading-none drop-shadow-xl" aria-hidden>
                  {weather.current ? getWeatherIcon(weather.current.condition) : "—"}
                </span>
                <p className="mt-2 text-5xl font-light tabular-nums text-white drop-shadow">
                  {weather.current ? `${weather.current.temperature}°` : "—"}
                </p>
                {weather.current?.condition && (
                  <p className="mt-1 text-base capitalize text-white/65">
                    {weather.current.condition.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tap-to-exit hint */}
          <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 select-none text-xs text-white/35">
            Tap anywhere to exit sleep mode
          </p>
        </div>
      )}
    </div>
  );
}
