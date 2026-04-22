/**
 * Resolve media-source URLs for display in img src.
 * Caches resolved URLs to avoid repeated WebSocket calls.
 */

import { useEffect, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import { resolveMediaUrl } from "../lib/skyDarkApi";

const resolvedCache = new Map<string, string>();

export function useResolvedMediaUrl(
  url: string,
  conn: Connection | null
): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!url) return "";
    if (!url.startsWith("media-source://")) return url;
    return resolvedCache.get(url) ?? "";
  });

  useEffect(() => {
    if (!url || !conn) {
      setResolved(url ?? "");
      return;
    }
    if (!url.startsWith("media-source://")) {
      setResolved(url);
      return;
    }
    const cached = resolvedCache.get(url);
    if (cached) {
      setResolved(cached);
      return;
    }
    // Avoid showing a resolved URL from a previous `url` until this one resolves.
    setResolved("");
    let cancelled = false;
    resolveMediaUrl(conn, url)
      .then((result) => {
        if (!cancelled && result) {
          resolvedCache.set(url, result);
          setResolved(result);
        }
      })
      .catch(() => {
        if (!cancelled) setResolved(url);
      });
    return () => {
      cancelled = true;
    };
  }, [url, conn]);

  return resolved || url;
}
