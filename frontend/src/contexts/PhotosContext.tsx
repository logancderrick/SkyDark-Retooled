import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { addPhotoWS, deletePhotoWS } from "../lib/skyDarkApi";
import { useSkydarkDataContext } from "./SkydarkDataContext";

export interface PhotoItem {
  id: string;
  url: string;
  caption: string;
}

function normalizePhotoUrl(rawUrl: string): string {
  return rawUrl.trim();
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

  const photos: PhotoItem[] = useMemo(
    () =>
      (skydark?.data?.photos ?? [])
        .map((p) => ({
          id: String(p.id),
          url: normalizePhotoUrl(String(p.file_path ?? "")),
          caption: String(p.caption ?? ""),
        }))
        .filter((p) => p.url.length > 0),
    [skydark?.data?.photos],
  );

  const addPhoto = useCallback(
    async (url: string, caption: string = "", filename?: string) => {
      if (!conn) throw new Error("No Home Assistant connection");
      await addPhotoWS(conn, { url, caption, filename });
      await skydark?.refetch();
    },
    [conn, skydark]
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      if (!conn) throw new Error("No Home Assistant connection");
      await deletePhotoWS(conn, id);
      await skydark?.refetch();
    },
    [conn, skydark]
  );

  const value: PhotosContextValue = useMemo(
    () => ({
      photos,
      addPhoto,
      deletePhoto,
    }),
    [photos, addPhoto, deletePhoto],
  );
  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotosContext(): PhotosContextValue {
  const ctx = useContext(PhotosContext);
  if (!ctx) throw new Error("usePhotosContext must be used within PhotosProvider");
  return ctx;
}
