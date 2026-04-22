/**
 * Resolve media-source URLs for display in img src.
 * Caches resolved URLs to avoid repeated WebSocket calls.
 */

import { useEffect, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import {
  isDisplayableMediaResolveUrl,
  mediaSourceHaToHttpPath,
  resolveMediaUrl,
} from "../lib/skyDarkApi";

const resolvedCache = new Map<string, string>();

/** Drop a cached resolve (e.g. after img onError / expired signed URL). */
export function invalidateResolvedMediaUrlCache(mediaSourceUrl: string): void {
  resolvedCache.delete(mediaSourceUrl);
}

type ResolveState = { resolved: string; boundUrl: string | null };

function initialState(url: string): ResolveState {
  if (!url) return { resolved: "", boundUrl: null };
  if (!url.startsWith("media-source://")) {
    return { resolved: url, boundUrl: url };
  }
  const direct = mediaSourceHaToHttpPath(url);
  if (direct && isDisplayableMediaResolveUrl(direct, url)) {
    return { resolved: direct, boundUrl: url };
  }
  const cached = resolvedCache.get(url);
  if (cached && isDisplayableMediaResolveUrl(cached, url)) {
    return { resolved: cached, boundUrl: url };
  }
  return { resolved: "", boundUrl: null };
}

export function useResolvedMediaUrl(url: string, conn: Connection | null): string {
  const [{ resolved, boundUrl }, setState] = useState<ResolveState>(() => initialState(url));

  useEffect(() => {
    if (!url) {
      setState({ resolved: "", boundUrl: null });
      return;
    }
    if (!url.startsWith("media-source://")) {
      setState({ resolved: url, boundUrl: url });
      return;
    }
    const direct = mediaSourceHaToHttpPath(url);
    if (direct && isDisplayableMediaResolveUrl(direct, url)) {
      resolvedCache.set(url, direct);
      setState({ resolved: direct, boundUrl: url });
      return;
    }
    const cached = resolvedCache.get(url);
    if (cached && isDisplayableMediaResolveUrl(cached, url)) {
      setState({ resolved: cached, boundUrl: url });
      return;
    }
    if (cached && !isDisplayableMediaResolveUrl(cached, url)) {
      resolvedCache.delete(url);
    }
    if (!conn) {
      setState({ resolved: url, boundUrl: url || null });
      return;
    }
    setState({ resolved: "", boundUrl: null });
    let cancelled = false;
    resolveMediaUrl(conn, url)
      .then((result) => {
        if (cancelled || !result || !isDisplayableMediaResolveUrl(result, url)) return;
        resolvedCache.set(url, result);
        setState({ resolved: result, boundUrl: url });
      })
      .catch(() => {
        if (!cancelled) setState({ resolved: "", boundUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [url, conn]);

  if (!url) return "";
  if (boundUrl === url && resolved) return resolved;
  return url;
}
