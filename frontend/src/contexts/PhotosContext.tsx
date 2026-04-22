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

const BASE = "/skydark/default-photos/";
const DEFAULT_PHOTOS: PhotoItem[] = [
  { id: "1", url: `${BASE}1.png`, caption: "Family" },
  { id: "2", url: `${BASE}2.png`, caption: "Trip" },
  { id: "3", url: `${BASE}3.png`, caption: "" },
  { id: "4", url: `${BASE}4.png`, caption: "" },
  { id: "5", url: `${BASE}5.png`, caption: "" },
  { id: "6", url: `${BASE}6.png`, caption: "" },
  { id: "7", url: `${BASE}7.png`, caption: "" },
  { id: "8", url: `${BASE}8.png`, caption: "" },
];

function normalizePhotoUrl(rawUrl: string): string {
  const raw = rawUrl.trim();
  if (!raw) return "";
  if (
    raw.startsWith("media-source://") ||
    raw.startsWith("data:image/") ||
    raw.startsWith("blob:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("./")
  ) {
    return raw;
  }
  // Back-compat: tolerate missing leading slash for HA media paths.
  if (raw.startsWith("media/local/") || raw.startsWith("api/") || raw.startsWith("local/")) {
    return `/${raw}`;
  }
  // Reject non-image identifiers (e.g. entity IDs) that create blank tiles.
  return "";
}

function loadStoredPhotos(): PhotoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PHOTOS;
    const parsed = JSON.parse(raw) as PhotoItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PHOTOS;
    return parsed;
  } catch {
    return DEFAULT_PHOTOS;
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
    if (!conn && lastHaAlbumRef.current.length > 0) {
      return lastHaAlbumRef.current;
    }
    if (conn) return serverPhotos;
    return photos;
  }, [conn, serverPhotos, photos]);

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
