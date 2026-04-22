/**
 * Image component that resolves media-source:// URLs for display.
 */

import { useCallback, useState } from "react";
import { useSkydarkDataContext } from "../../contexts/SkydarkDataContext";
import { invalidateResolvedMediaUrlCache, useResolvedMediaUrl } from "../../hooks/useResolvedMediaUrl";

interface MediaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

function MediaImageInner({ src, ...props }: MediaImageProps) {
  const conn = useSkydarkDataContext()?.data?.connection ?? null;
  const resolvedSrc = useResolvedMediaUrl(src, conn);
  return <img src={resolvedSrc} {...props} />;
}

/**
 * Remount when `src` (or retry count) changes so resolver state does not leak across photos.
 * On load error for media-source images, drop the bad cache entry and retry resolve a few times.
 */
export default function MediaImage({ src, onError, ...props }: MediaImageProps) {
  const [retry, setRetry] = useState(0);
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (src.startsWith("media-source://")) {
        invalidateResolvedMediaUrlCache(src);
        setRetry((n) => (n < 4 ? n + 1 : n));
      }
      onError?.(e);
    },
    [src, onError]
  );
  return <MediaImageInner key={`${src}#${retry}`} src={src} {...props} onError={handleError} />;
}
