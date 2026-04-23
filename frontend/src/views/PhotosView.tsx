import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePhotosContext } from "../contexts/PhotosContext";
import { useAppContext } from "../contexts/AppContext";
import { useSkydarkDataContext } from "../contexts/SkydarkDataContext";
import PinPrompt from "../components/Common/PinPrompt";
import CloseIcon from "../components/Common/CloseIcon";
import { usePhotoDisplayUrl } from "../hooks/usePhotoDisplayUrl";

function PhotoImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const conn = useSkydarkDataContext()?.data?.connection ?? null;
  const resolvedSrc = usePhotoDisplayUrl(src, conn);
  if (!resolvedSrc) {
    return <div className={`h-full w-full bg-skydark-surface-muted ${className ?? ""}`} />;
  }
  return <img src={resolvedSrc} alt={alt} className={className} />;
}

export default function PhotosView() {
  const { photos, addPhoto, deletePhoto } = usePhotosContext();
  const { setScreensaverTriggered, isFeatureLocked, verifyPin } = useAppContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadError(null);
    const maxSizeBytes = 1.5 * 1024 * 1024; // Keep uploads reasonably small for HA media storage.
    files.forEach((file) => {
      if (file.size > maxSizeBytes) {
        setUploadError(`"${file.name}" is too large. Max size is 1.5 MB per photo.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        void addPhoto(dataUrl, "", file.name).catch((err) => {
          const message = err instanceof Error ? err.message : "Upload failed";
          setUploadError(`Could not upload "${file.name}": ${message}`);
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleImportClick = () => {
    if (isFeatureLocked("importPhotos")) {
      setShowPinPrompt(true);
      return;
    }
    uploadRef.current?.click();
  };

  const handlePinVerify = (pin: string): boolean => {
    if (!verifyPin(pin)) return false;
    setShowPinPrompt(false);
    uploadRef.current?.click();
    return true;
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    void deletePhoto(id);
    if (selectedId === id) setSelectedId(null);
  };

  const closeLightbox = useCallback(() => setSelectedId(null), []);

  const selectedPhoto = useMemo(
    () => (selectedId ? photos.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, photos]
  );

  useEffect(() => {
    if (selectedId && !photos.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, photos]);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedId, closeLightbox]);

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-skydark-text">Photos</h2>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="btn-secondary shrink-0 whitespace-nowrap"
          >
            Import photos
          </button>
          <button
            type="button"
            onClick={() => setScreensaverTriggered(true)}
            disabled={photos.length === 0}
            title={
              photos.length === 0
                ? "Add at least one photo to start sleep mode (photo slideshow)."
                : "Start sleep mode now (full-screen photo slideshow)."
            }
            aria-label={
              photos.length === 0
                ? "Sleep mode: add photos first"
                : "Start sleep mode slideshow"
            }
            className="btn-primary shrink-0 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Sleep
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-[3/2] rounded-card overflow-hidden shadow-skydark"
          >
            <button
              type="button"
              onClick={() => setSelectedId(photo.id)}
              className="absolute inset-0 w-full h-full focus:ring-2 focus:ring-skydark-accent focus:ring-inset"
            >
              <PhotoImage
                src={photo.url}
                alt={photo.caption || "Photo"}
                className="w-full h-full object-cover hover:shadow-skydark-hover transition-shadow"
              />
            </button>
            <button
              type="button"
              onClick={(e) => handleDelete(e, photo.id)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Delete photo"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {uploadError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      )}

      {selectedPhoto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <div
              className="flex shrink-0 items-center justify-end gap-3 border-b border-white/10 px-4 py-3"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
            >
              <button
                type="button"
                onClick={closeLightbox}
                className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-skydark-accent"
              >
                Close
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <button
                type="button"
                className="absolute inset-0 z-0"
                onClick={closeLightbox}
                aria-label="Close photo viewer"
              />
              <div className="relative z-10 flex h-full min-h-0 items-center justify-center p-4">
                <PhotoImage
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Photo"}
                  className="max-h-[min(90dvh,100%)] max-w-[min(95vw,100%)] w-auto h-auto object-contain shadow-2xl"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      <PinPrompt
        open={showPinPrompt}
        onClose={() => setShowPinPrompt(false)}
        onVerify={handlePinVerify}
        title="Enter PIN to import photos"
      />
    </div>
  );
}
