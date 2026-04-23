import type { Connection } from "home-assistant-js-websocket";
import { getHassAccessToken } from "./haAuth";

/**
 * Load a same-origin HA image using Bearer auth (img tags cannot send headers).
 * Returns an object URL the caller must revoke with URL.revokeObjectURL when done.
 */
export async function loadHaImageAsBlobUrl(
  displayUrl: string,
  conn: Connection | null
): Promise<string | null> {
  const token = getHassAccessToken(conn);
  if (!token?.trim()) return null;

  let parsed: URL;
  try {
    parsed = new URL(displayUrl, window.location.origin);
  } catch {
    return null;
  }

  if (parsed.origin !== window.location.origin) {
    return null;
  }

  const path = parsed.pathname;
  const search = parsed.search;
  const origin = window.location.origin;
  const attempts: string[] = [
    parsed.toString(),
    `${origin}${path}${search}`,
    `${origin}${path}?access_token=${encodeURIComponent(token)}`,
  ];

  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  for (const abs of attempts) {
    try {
      const res = await fetch(abs, { credentials: "same-origin", headers });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size === 0) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.startsWith("image/") || ct === "application/octet-stream" || ct === "") {
        return URL.createObjectURL(blob);
      }
    } catch {
      /* try next */
    }
  }

  return null;
}
