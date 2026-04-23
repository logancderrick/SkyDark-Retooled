import { useCallback, useEffect, useMemo, useState } from "react";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import {
  addPhotoWS,
  deletePhotoWS,
  fetchPhotos,
  makeDisplayableMediaUrl,
  resolveMediaUrl,
  type SkydarkPhoto,
} from "../lib/skyDarkApi";
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

  const loadPhotos = useCallback(async () => {
    if (!conn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPhotos(conn);
      setPhotos(normalizePhotos(res.photos ?? []));
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
    if (!conn || photos.length === 0) return;
    let cancelled = false;
    const resolveAll = async () => {
      const next = await Promise.all(
        photos.map(async (photo) => {
          try {
            if (photo.rawUrl.startsWith("media-source://")) {
              const resolved = await resolveMediaUrl(conn, photo.rawUrl);
              return { ...photo, displayUrl: resolved };
            }
            return { ...photo, displayUrl: makeDisplayableMediaUrl(photo.rawUrl, conn) };
          } catch {
            return { ...photo, displayUrl: "" };
          }
        })
      );
      if (!cancelled) setPhotos(next);
    };
    void resolveAll();
    return () => {
      cancelled = true;
    };
  }, [conn, photos.length]);

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
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-[3/2] overflow-hidden rounded-card bg-skydark-surface-muted">
              {photo.displayUrl ? (
                <img src={photo.displayUrl} alt={photo.caption || "Photo"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full animate-pulse bg-skydark-surface-muted" />
              )}
              <button
                type="button"
                onClick={() => void handleDelete(photo.id)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {sleepPhoto && (
        <div className="fixed inset-0 z-[200] bg-black" onClick={() => setSleepPhotoId(null)} role="button" tabIndex={0}>
          {sleepPhoto.displayUrl ? (
            <img
              src={sleepPhoto.displayUrl}
              alt={sleepPhoto.caption || "Sleep mode photo"}
              className="absolute inset-0 h-full w-full object-cover"
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
