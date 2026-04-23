import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import {
  addPhotoWS,
  deletePhotoWS,
  fetchPhotos,
  makeDisplayableMediaUrl,
  resolveMediaUrl,
  type SkydarkPhoto,
} from "../lib/skyDarkApi";
import { loadHaImageAsBlobUrl } from "../lib/loadHaImageBlob";
import { getWeatherIcon, useWeatherData } from "../hooks/useWeeklyWeather";

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

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sleepPhotoId, setSleepPhotoId] = useState<string | null>(null);
  /** Set when <img> fires onError (bad URL, 401, missing file). */
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  /** When query-token img fails, same-origin fetch with Bearer often still works — use blob: URLs. */
  const [fallbackBlobUrls, setFallbackBlobUrls] = useState<Record<string, string>>({});
  const blobRecoveringRef = useRef(new Set<string>());
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
            if (photo.rawUrl.startsWith("media-source://")) {
              const displayUrl = await resolveMediaUrl(conn, photo.rawUrl);
              return { ...photo, displayUrl };
            }
            return { ...photo, displayUrl: makeDisplayableMediaUrl(photo.rawUrl, conn) };
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
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
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
            const imgSrc = blobSrc ?? photo.displayUrl;
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
                    blobRecoveringRef.current.add(id);
                    void (async () => {
                      try {
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
        <div className="fixed inset-0 z-[200] bg-black" onClick={() => setSleepPhotoId(null)} role="button" tabIndex={0}>
          {(sleepBlobUrl || sleepPhoto.displayUrl) && !sleepImageError ? (
            <img
              src={sleepBlobUrl ?? sleepPhoto.displayUrl}
              alt={sleepPhoto.caption || "Sleep mode photo"}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                if (sleepBlobUrl) {
                  setSleepImageError(true);
                  return;
                }
                if (!conn || !sleepPhoto.displayUrl || sleepRecoveringRef.current) {
                  setSleepImageError(true);
                  return;
                }
                sleepRecoveringRef.current = true;
                void (async () => {
                  try {
                    const blobUrl = await loadHaImageAsBlobUrl(sleepPhoto.displayUrl, conn);
                    if (blobUrl) {
                      setSleepBlobUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return blobUrl;
                      });
                    } else {
                      setSleepImageError(true);
                    }
                  } finally {
                    sleepRecoveringRef.current = false;
                  }
                })();
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black" />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-1/2 top-1/2 z-10 w-[min(88vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-black/50 p-5 text-center text-white backdrop-blur-md">
            <p className="text-xs uppercase tracking-wide text-white/80">Weather</p>
            <p className="mt-2 text-4xl font-semibold">
              {weather.current ? `${getWeatherIcon(weather.current.condition)} ${weather.current.temperature}°` : "--"}
            </p>
            {weather.weekly[0] && (
              <p className="mt-2 text-sm text-white/85">
                {weather.weekly[0].tempMin}° / {weather.weekly[0].tempMax}° - {weather.weekly[0].precipitation}% precipitation
              </p>
            )}
            <p className="mt-4 text-xs text-white/75">Tap anywhere to exit sleep mode</p>
          </div>
        </div>
      )}
    </div>
  );
}
