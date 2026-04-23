import { useEffect, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import { makeDisplayableMediaUrl, resolveMediaUrl } from "../lib/skyDarkApi";

const resolvedCache = new Map<string, string>();

/**
 * Fresh photo URL pipeline:
 * - media-source://... -> resolve once via HA websocket
 * - /media or /api paths -> attach access token when needed
 */
export function usePhotoDisplayUrl(rawUrl: string, conn: Connection | null): string {
  const [displayUrl, setDisplayUrl] = useState("");

  useEffect(() => {
    const source = rawUrl.trim();
    if (!source) {
      setDisplayUrl("");
      return;
    }

    if (!source.startsWith("media-source://")) {
      setDisplayUrl(makeDisplayableMediaUrl(source, conn));
      return;
    }

    const cached = resolvedCache.get(source);
    if (cached) {
      setDisplayUrl(cached);
      return;
    }

    if (!conn) {
      setDisplayUrl("");
      return;
    }

    let cancelled = false;
    setDisplayUrl("");
    resolveMediaUrl(conn, source)
      .then((resolved) => {
        if (cancelled || !resolved) return;
        resolvedCache.set(source, resolved);
        setDisplayUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, conn]);

  return displayUrl;
}
