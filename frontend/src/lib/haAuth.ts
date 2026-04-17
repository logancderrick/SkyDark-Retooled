import type { Connection } from "home-assistant-js-websocket";

function tokenFromParentHass(): string | undefined {
  try {
    // When SkyDark runs inside HA's iframe, the parent exposes the logged-in session.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ha = (window as any).parent?.document?.querySelector("home-assistant");
    const auth = ha?.hass?.auth;
    const fromData = auth?.data?.access_token;
    if (typeof fromData === "string" && fromData.trim()) return fromData.trim();
    const legacy = auth?.accessToken;
    if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  } catch {
    // cross-origin or no parent
  }
  return undefined;
}

/** Access token for REST calls: WebSocket connection first, then parent HA frontend. */
export function getHassAccessToken(conn: Connection | null): string | undefined {
  if (conn) {
    const auth = (conn as unknown as { options?: { auth?: { accessToken?: string } } }).options?.auth;
    const token = auth?.accessToken?.trim();
    if (token) return token;
  }
  return tokenFromParentHass();
}
