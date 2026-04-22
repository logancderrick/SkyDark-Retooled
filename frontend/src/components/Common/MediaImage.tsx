/**
 * Image component that resolves media-source:// URLs for display.
 */

import { useSkydarkDataContext } from "../../contexts/SkydarkDataContext";
import { useResolvedMediaUrl } from "../../hooks/useResolvedMediaUrl";

interface MediaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

function MediaImageInner({ src, ...props }: MediaImageProps) {
  const conn = useSkydarkDataContext()?.data?.connection ?? null;
  const resolvedSrc = useResolvedMediaUrl(src, conn);
  return <img src={resolvedSrc} {...props} />;
}

/** Remount when `src` changes so resolved URL state never leaks across different photos. */
export default function MediaImage({ src, ...props }: MediaImageProps) {
  return <MediaImageInner key={src} src={src} {...props} />;
}
