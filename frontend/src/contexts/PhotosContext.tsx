import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { addPhotoWS, deletePhotoWS } from "../lib/skyDarkApi";
import { useSkydarkDataContext } from "./SkydarkDataContext";

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
}

const STORAGE_KEY = "skydark_photos";
const IMAGE_EXT_RE = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)(?:$|[?#])/i;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function looksLikeImagePath(pathOrUrl: string): boolean {
  const normalized = safeDecode(pathOrUrl.trim());
  if (!normalized) return false;
  if (IMAGE_EXT_RE.test(normalized)) return true;
  // HA media endpoints for local files, often with encoded spaces and query params.
  if (normalized.includes("/media/local/Calendar Images/")) return true;
  if (normalized.includes("/media/local/Calendar%20Images/")) return true;
  return false;
}

function normalizePhotoUrl(rawUrl: string): string {
  const raw = rawUrl.trim();
  if (!raw) return "";
  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("media-source://")) {
    return looksLikeImagePath(raw) ? raw : "";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return looksLikeImagePath(raw) ? raw : "";
  }
  if (raw.startsWith("/") || raw.startsWith("./")) {
    if (looksLikeImagePath(raw)) return raw;
    return "";
  }
  // Back-compat: tolerate missing leading slash for HA media paths.
  if (raw.startsWith("media/local/") || raw.startsWith("api/") || raw.startsWith("local/")) {
    const normalized = `/${raw}`;
    if (!looksLikeImagePath(normalized)) return "";
    return normalized;
  }
  // Reject non-image identifiers (e.g. entity IDs) that create blank tiles.
  return "";
}

function loadStoredPhotos(): PhotoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PhotoItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function savePhotos(photos: PhotoItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch {
    // ignore quota or disabled localStorage
  }
}

interface PhotosContextValue {
  photos: PhotoItem[];
  addPhoto: (url: string, caption?: string, filename?: string) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

const PhotosContext = createContext<PhotosContextValue | null>(null);

export function PhotosProvider({ children }: { children: ReactNode }) {
  const skydark = useSkydarkDataContext();
  const conn = skydark?.data?.connection;
  const [photos, setPhotos] = useState<PhotoItem[]>(loadStoredPhotos);
  const migratedLocalPhotosRef = useRef(false);
  /** Last non-empty HA album; used when `conn` drops briefly so we do not flash local /skydark defaults. */
  const lastHaAlbumRef = useRef<PhotoItem[]>([]);

  useEffect(() => {
    if (!conn) savePhotos(photos);
  }, [photos, conn]);

  /** Always derive from last loaded HA payload — do not clear when `conn` flickers null. */
  const serverPhotos: PhotoItem[] = useMemo(() => {
    return (skydark?.data?.photos ?? [])
      .map((p) => ({
        id: String(p.id),
        url: normalizePhotoUrl(String(p.file_path ?? "")),
        caption: String(p.caption ?? ""),
      }))
      .filter((p) => p.url.length > 0);
  }, [skydark?.data?.photos]);

  const displayPhotos = useMemo(() => {
    if (serverPhotos.length > 0) {
      lastHaAlbumRef.current = serverPhotos;
      return serverPhotos;
    }
    if (lastHaAlbumRef.current.length > 0) {
      return lastHaAlbumRef.current;
    }
    return [];
  }, [serverPhotos]);

  // Legacy cleanup: clear stale local fallback entries so they cannot reappear after refresh.
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!conn || migratedLocalPhotosRef.current) return;
    migratedLocalPhotosRef.current = true;
    const local = loadStoredPhotos();
    const hasCustomLocal = local.some(
      (p) => p.id.startsWith("upload-") || p.url.startsWith("data:")
    );
    if (!hasCustomLocal || serverPhotos.length > 0) return;
    void Promise.all(
      local.map((p) => addPhotoWS(conn, { url: p.url, caption: p.caption ?? "" }))
    )
      .then(() => skydark?.refetch())
      .catch(() => {
        // Ignore migration failures; user can retry import.
      });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [conn, serverPhotos.length, skydark?.refetch]);

  const addPhoto = useCallback(
    async (url: string, caption: string = "", filename?: string) => {
      if (conn) {
        await addPhotoWS(conn, { url, caption, filename });
        await skydark?.refetch();
        return;
      }
      const id = `upload-${Date.now()}`;
      setPhotos((prev) => [{ id, url, caption }, ...prev]);
    },
    [conn, skydark]
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      if (conn) {
        await deletePhotoWS(conn, id);
        await skydark?.refetch();
        return;
      }
      setPhotos((prev) => {
        const item = prev.find((p) => p.id === id);
        if (item && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
        return prev.filter((p) => p.id !== id);
      });
    },
    [conn, skydark]
  );

  const value: PhotosContextValue = useMemo(
    () => ({
      photos: displayPhotos,
      addPhoto,
      deletePhoto,
    }),
    [displayPhotos, addPhoto, deletePhoto],
  );
  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotosContext(): PhotosContextValue {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error("usePhotosContext must be used within PhotosProvider");
  return ctx;
}
