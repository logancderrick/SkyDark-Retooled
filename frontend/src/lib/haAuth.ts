import type { Connection } from "home-assistant-js-websocket";

/** Access token from the HA WebSocket connection, when available (OAuth / long-lived token flows). */
export function getHassAccessToken(conn: Connection | null): string | undefined {
  if (!conn) return undefined;
  const auth = (conn as unknown as { options?: { auth?: { accessToken?: string } } }).options?.auth;
  const token = auth?.accessToken?.trim();
  return token || undefined;
}
