import type { Connection } from "home-assistant-js-websocket";
import { getHassAccessToken } from "./haAuth";

/**
 * Camera entities expose `entity_picture` like `/api/camera_proxy/camera.x?token=...`.
 * That short-lived `token` is what HA expects on `camera_proxy_stream` when cookies are not sent (e.g. iframe).
 */
export function parseCameraTokenFromEntityPicture(entityPicture: string | undefined | null): string | undefined {
  if (!entityPicture || typeof entityPicture !== "string") return undefined;
  if (!entityPicture.includes("token=")) return undefined;
  try {
    const abs = entityPicture.startsWith("http")
      ? entityPicture
      : `${window.location.origin}${entityPicture.startsWith("/") ? entityPicture : `/${entityPicture}`}`;
    const u = new URL(abs, window.location.origin);
    const t = u.searchParams.get("token");
    return t?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Build MJPEG stream URL with best-available auth for same-origin iframe loads. */
export function buildCameraProxyStreamUrl(
  entityId: string,
  connection: Connection,
  entityPicture?: string | null
): string {
  const origin = window.location.origin;
  const path = `/api/camera_proxy_stream/${encodeURIComponent(entityId)}`;
  const camToken = parseCameraTokenFromEntityPicture(entityPicture ?? undefined);
  const bearer = getHassAccessToken(connection);
  const params = new URLSearchParams();
  if (camToken) params.set("token", camToken);
  else if (bearer) params.set("access_token", bearer);
  const qs = params.toString();
  return qs ? `${origin}${path}?${qs}` : `${origin}${path}`;
}
