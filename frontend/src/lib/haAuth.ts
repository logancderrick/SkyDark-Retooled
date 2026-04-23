import type { Connection } from "home-assistant-js-websocket";

/** Same key `home-assistant-js-websocket` uses when persisting tokens (often shared with HA UI). */
const HASS_TOKENS_STORAGE_KEY = "hassTokens";

function tokenFromParentHass(): string | undefined {
  try {
    // When SkyDark runs inside HA's iframe, the parent exposes the logged-in session.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parent = (window as any).parent;
    const hass =
      parent?.hass ??
      parent?.document?.querySelector("home-assistant")?.hass ??
      parent?.document?.querySelector("home-assistant-main")?.hass;
    const auth = hass?.auth;
    const fromData = auth?.data?.access_token;
    if (typeof fromData === "string" && fromData.trim()) return fromData.trim();
    const fromGetter = auth?.accessToken;
    if (typeof fromGetter === "string" && fromGetter.trim()) return fromGetter.trim();
  } catch {
    // cross-origin or no parent
  }
  return undefined;
}

function tokenFromHassLocalStorage(): string | undefined {
  try {
    const raw = localStorage.getItem(HASS_TOKENS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { access_token?: unknown };
    const t = parsed?.access_token;
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch {
    // ignore
  }
  return undefined;
}

function tokenFromConnection(conn: Connection): string | undefined {
  const auth = conn.options?.auth;
  const t = auth?.accessToken?.trim();
  if (t) return t;
  return undefined;
}

/** Access token for REST / media: WS auth, parent HA session, then persisted hassTokens. */
export function getHassAccessToken(conn: Connection | null): string | undefined {
  if (conn) {
    const fromConn = tokenFromConnection(conn);
    if (fromConn) return fromConn;
  }
  const fromParent = tokenFromParentHass();
  if (fromParent) return fromParent;
  return tokenFromHassLocalStorage();
}
