import type { Connection } from "home-assistant-js-websocket";
import { getHassAccessToken } from "./haAuth";
import { haMediaImgSrc } from "./haMediaImgUrl";

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
  /** Same as `<img src>`: strip WS `access_token`, keep `authSig` / other HA query params. */
  const cookiePreferAbs = new URL(haMediaImgSrc(displayUrl, origin), origin).toString();
  const sameOriginPath = `${origin}${path}${search}`;
  const attempts: string[] = [cookiePreferAbs, sameOriginPath, parsed.toString()];
  const hasQueryAuth =
    search.includes("access_token=") || search.includes("authSig") || search.includes("auth_sig");
  if (!hasQueryAuth) {
    attempts.push(`${origin}${path}?access_token=${encodeURIComponent(token)}`);
  }
  const uniqueAttempts = [...new Set(attempts)];

  const authModes: (HeadersInit | null)[] = [
    null,
    { Authorization: `Bearer ${token}` },
  ];

  for (const abs of uniqueAttempts) {
    for (const headers of authModes) {
      try {
        const res = await fetch(abs, {
          credentials: "same-origin",
          ...(headers ? { headers } : {}),
        });
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
  }

  return null;
}
