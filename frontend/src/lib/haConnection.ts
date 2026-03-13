/**
 * Home Assistant WebSocket connection for the SkyDark panel.
 *
 * Strategy (in order):
 *  1. Reuse the parent HA window's live connection (best for same-origin iframe)
 *  2. Fall back to stored localStorage tokens
 *  3. Last resort: redirect-based OAuth (may cause a brief flash)
 */

import {
  createConnection,
  getAuth,
  type Connection,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

const HASS_URL_KEY = "hassUrl";
const HASS_TOKENS_KEY = "hassTokens";

function getHassUrl(): string {
  return window.location.origin;
}

interface AuthDataLike {
  hassUrl: string;
  clientId: string | null;
  expires: number;
  refresh_token: string;
  access_token: string;
  expires_in: number;
}

/**
 * Attempt to grab the live WebSocket connection from the parent HA frontend.
 * Works when loaded inside HA's same-origin iframe panel.
 */
function getParentConnection(): Connection | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ha = (window as any).parent?.document?.querySelector("home-assistant");
    const conn: Connection | undefined = ha?.hass?.connection;
    if (conn) return conn;
  } catch {
    // cross-origin, sandbox, or not in an iframe
  }
  return null;
}

async function loadStoredTokens(): Promise<AuthDataLike | null | undefined> {
  try {
    const url = localStorage.getItem(HASS_URL_KEY);
    const tokens = localStorage.getItem(HASS_TOKENS_KEY);
    if (url && tokens) {
      const parsed = JSON.parse(tokens) as Record<string, unknown>;
      if (parsed && typeof parsed.access_token === "string") {
        return {
          hassUrl: url,
          clientId: (parsed.clientId as string | null | undefined) ?? null,
          expires: typeof parsed.expires === "number" ? parsed.expires : 0,
          refresh_token: (parsed.refresh_token as string | undefined) ?? "",
          access_token: parsed.access_token,
          expires_in: typeof parsed.expires_in === "number" ? parsed.expires_in : 0,
        };
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function saveTokens(data: AuthDataLike | null): void {
  try {
    if (data) {
      localStorage.setItem(HASS_URL_KEY, data.hassUrl);
      localStorage.setItem(HASS_TOKENS_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(HASS_URL_KEY);
      localStorage.removeItem(HASS_TOKENS_KEY);
    }
  } catch {
    // ignore
  }
}

let connectionPromise: Promise<Connection> | null = null;

export async function getHAConnection(): Promise<Connection> {
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    // 1. Reuse parent HA connection (fastest, no extra auth needed)
    const parentConn = getParentConnection();
    if (parentConn) {
      console.debug("[SkyDark] Reusing parent HA WebSocket connection");
      return parentConn;
    }

    // 2. Establish own connection via stored tokens / OAuth
    const hassUrl = getHassUrl();
    const auth = await getAuth({
      hassUrl,
      loadTokens: loadStoredTokens,
      saveTokens,
    }).catch((err) => {
      if (err === ERR_HASS_HOST_REQUIRED || err === ERR_INVALID_AUTH) {
        return getAuth({ hassUrl });
      }
      throw err;
    });

    const conn = await createConnection({ auth });
    conn.addEventListener("ready", () => {
      console.debug("[SkyDark] HA WebSocket connected (own connection)");
    });
    conn.addEventListener("disconnected", () => {
      console.debug("[SkyDark] HA WebSocket disconnected");
    });
    return conn;
  })();

  return connectionPromise;
}

export function clearHAConnection(): void {
  connectionPromise = null;
}
