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
  const sleepCameraRotateSec = settings.calendarPreviewRotateSeconds ?? 20;

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
      if (e.key === "Escape") setSleepPhotoId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
          onClick={() => setSleepPhotoId(null)}
          role="button"
          tabIndex={0}
        >
          {/* Background photo */}
          {(sleepBlobUrl || sleepPhoto.displayUrl) && !sleepImageError ? (
            <img
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

          {/* Gradient dim — stronger at edges, lighter in center */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/50" />

          {/* Weather card — bottom left */}
          <div
            className="absolute bottom-8 left-8 z-10 w-[min(76vw,300px)] rounded-3xl border border-white/10 bg-black/55 p-5 text-white shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
              {weather.locationLabel ? weather.locationLabel : "Current Conditions"}
            </p>

            <div className="mt-3 flex items-start gap-4">
              <span className="text-6xl leading-none" aria-hidden>
                {weather.current ? getWeatherIcon(weather.current.condition) : "—"}
              </span>
              <div>
                <p className="text-5xl font-extralight tabular-nums leading-none">
                  {weather.current ? `${weather.current.temperature}°` : "—"}
                </p>
                {weather.current?.condition && (
                  <p className="mt-1 text-sm capitalize text-white/60">
                    {weather.current.condition.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>

            {(weather.weekly[0] || weather.current?.humidity != null || weather.current?.windMph != null) && (
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1.5 border-t border-white/10 pt-4 text-sm">
                {weather.weekly[0] && (
                  <>
                    <dt className="text-white/45">Today</dt>
                    <dd className="tabular-nums">{weather.weekly[0].tempMin}° / {weather.weekly[0].tempMax}°</dd>
                    <dt className="text-white/45">Precip</dt>
                    <dd className="tabular-nums">{weather.weekly[0].precipitation}%</dd>
                  </>
                )}
                {weather.current?.humidity != null && (
                  <>
                    <dt className="text-white/45">Humidity</dt>
                    <dd className="tabular-nums">{weather.current.humidity}%</dd>
                  </>
                )}
                {weather.current?.windMph != null && (
                  <>
                    <dt className="text-white/45">Wind</dt>
                    <dd className="tabular-nums">{weather.current.windMph} mph</dd>
                  </>
                )}
              </dl>
            )}
          </div>

          {/* Camera preview — bottom right; only when cameras configured and connected */}
          {conn && sleepCameraIds.length > 0 && (
            <div
              className="absolute bottom-8 right-8 z-10 w-[min(72vw,320px)] overflow-hidden rounded-2xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarCameraPreview
                connection={conn}
                cameraEntityIds={sleepCameraIds}
                rotateIntervalSec={sleepCameraRotateSec}
              />
            </div>
          )}

          {/* Tap-to-exit hint */}
          <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 select-none text-xs text-white/35">
            Tap anywhere to exit sleep mode
          </p>
        </div>
      )}
    </div>
  );
}
