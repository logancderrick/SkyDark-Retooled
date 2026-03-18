/**
 * Image component that resolves media-source:// URLs for display.
 */

import { useSkydarkDataContext } from "../../contexts/SkydarkDataContext";
import { useResolvedMediaUrl } from "../../hooks/useResolvedMediaUrl";

interface MediaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function MediaImage({ src, ...props }: MediaImageProps) {
  const conn = useSkydarkDataContext()?.data?.connection ?? null;
  const resolvedSrc = useResolvedMediaUrl(src, conn);
  return <img src={resolvedSrc} {...props} />;
}
