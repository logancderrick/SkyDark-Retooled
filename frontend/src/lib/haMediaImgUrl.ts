/**
 * Build `<img src>` for same-origin HA `/media/...` URLs.
 *
 * WebSocket OAuth tokens in `?access_token=` are often rejected for static media (401).
 * The main HA UI loads these with session cookies instead. Strip `access_token` so the
 * browser sends the normal HA login cookie; keep `authSig` / other query params intact.
 */
export function haMediaImgSrc(url: string, pageOrigin: string = window.location.origin): string {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const u = new URL(url, pageOrigin);
    if (u.origin !== pageOrigin || !u.pathname.startsWith("/media/")) {
      return url;
    }
    u.searchParams.delete("access_token");
    const q = u.searchParams.toString();
    return q ? `${u.pathname}?${q}` : u.pathname;
  } catch {
    return url;
  }
}
