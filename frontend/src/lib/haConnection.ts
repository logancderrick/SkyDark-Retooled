/**
 * Home Assistant WebSocket connection for the SkyDark panel.
 *
 * Strategy (in order):
 *  1. Reuse the parent HA window's live connection (best for same-origin iframe)
 *  2. Dev only: `VITE_HASS_URL` + `VITE_HASS_ACCESS_TOKEN` → long-lived token (no OAuth)
 *  3. Stored localStorage tokens / OAuth redirect
 */

import {
  createConnection,
  createLongLivedTokenAuth,
  getAuth,
  type Connection,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

const HASS_URL_KEY = "hassUrl";
const HASS_TOKENS_KEY = "hassTokens";
const CUSTOM_HASS_URL_KEY = "skyDarkCustomHassUrl";

/** HA origin for API + OAuth. Checks custom URL (Settings), env var (dev), then current window origin. */
function getHassUrl(): string {
  // 1. Check if user set a custom HA URL in app Settings
  try {
    const customUrl = localStorage.getItem(CUSTOM_HASS_URL_KEY);
    if (typeof customUrl === "string") {
      const trimmed = customUrl.trim().replace(/\/+$/, "");
      if (trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
        return trimmed;
      }
    }
  } catch {
    // localStorage not available, continue to next fallback
  }

  // 2. Dev only: allow overriding HA URL for testing against a different instance
  if (import.meta.env.DEV) {
    const fromEnv = import.meta.env.VITE_HASS_URL;
    if (typeof fromEnv === "string") {
      const trimmed = fromEnv.trim().replace(/\/+$/, "");
      if (trimmed) return trimmed;
    }
  }

  // 3. Production (inside HA): always use current window origin
  return window.location.origin;
}

/**
 * `getAuth()` redirects to `${hassUrl}/auth/authorize`. On `npm run dev`, hassUrl was
 * `http://localhost:5173`, which is not Home Assistant — users see a broken "auth" URL.
 * Block that path when demo mode is off but no real HA URL is configured.
 */
function isBlockedLocalViteOAuth(): boolean {
  if (!import.meta.env.DEV) return false;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;
  const fromEnv = import.meta.env.VITE_HASS_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) return false;
  return true;
}

/** Dev-only: connect with a long-lived token (no OAuth redirect). Requires VITE_HASS_URL + VITE_HASS_ACCESS_TOKEN. */
function useDevLongLivedTokenAuth(): boolean {
  if (!import.meta.env.DEV) return false;
  const url = import.meta.env.VITE_HASS_URL;
  const tok = import.meta.env.VITE_HASS_ACCESS_TOKEN;
  return (
    typeof url === "string" &&
    url.trim() !== "" &&
    typeof tok === "string" &&
    tok.trim() !== ""
  );
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
      // If the HA URL has changed, stale tokens will cause a 400 on /auth/token
      // because the client_id embedded in them no longer matches. Discard them
      // so a fresh OAuth flow starts against the new URL.
      const currentUrl = getHassUrl();
      if (url.replace(/\/+$/, "") !== currentUrl.replace(/\/+$/, "")) {
        console.debug(
          `[SkyDark] Stored HA URL (${url}) differs from current (${currentUrl}); clearing stale tokens.`,
        );
        localStorage.removeItem(HASS_URL_KEY);
        localStorage.removeItem(HASS_TOKENS_KEY);
        return undefined;
      }

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

    // 2. Dev: long-lived token (no OAuth — instant reconnect on every refresh)
    if (useDevLongLivedTokenAuth()) {
      const hassUrl = getHassUrl();
      const token = String(import.meta.env.VITE_HASS_ACCESS_TOKEN).trim();
      if (import.meta.env.DEV && /\.local\b/i.test(hassUrl)) {
        console.warn(
          "[SkyDark] VITE_HASS_URL uses a *.local host. If WebSocket fails (common on Windows), " +
            "set VITE_HASS_URL to your HA LAN IP with the same http/https as in the browser — see frontend/.env.local.example.",
        );
      }
      const auth = createLongLivedTokenAuth(hassUrl, token);
      try {
        const conn = await createConnection({ auth });
        conn.addEventListener("ready", () => {
          console.debug("[SkyDark] HA WebSocket connected (dev long-lived token)");
        });
        conn.addEventListener("disconnected", () => {
          console.debug("[SkyDark] HA WebSocket disconnected");
        });
        return conn;
      } catch (err) {
        const extra =
          /\.local\b/i.test(hassUrl)
            ? " Try VITE_HASS_URL=http(s)://<LAN-IP>:8123 instead of *.local (see .env.local.example)."
            : " Use the exact HA URL from your browser; accept HTTPS cert if self-signed.";
        throw new Error(
          `${err instanceof Error ? err.message : "WebSocket failed"} — Cannot reach HA at ${hassUrl}.${extra}`,
        );
      }
    }

    // 3. Establish own connection via stored tokens / OAuth
    if (isBlockedLocalViteOAuth()) {
      throw new Error(
        "SkyDark: Vite is not Home Assistant — opening /auth/authorize here will not work. " +
          "Use `npm run dev:demo` for local sample data, create `frontend/.env.local` with " +
          "`VITE_HASS_URL` + `VITE_HASS_ACCESS_TOKEN` (HA Profile → Long-lived access tokens), " +
          "or only `VITE_HASS_URL` and complete OAuth once, or open the panel inside Home Assistant.",
      );
    }

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
  })().catch((err) => {
    connectionPromise = null;
    throw err;
  });

  return connectionPromise;
}

export function clearHAConnection(): void {
  connectionPromise = null;
}

/** Update the custom HA URL in localStorage and trigger reconnection. */
export function setCustomHassUrl(url: string | undefined): void {
  try {
    if (url && typeof url === "string") {
      const trimmed = url.trim().replace(/\/+$/, "");
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        localStorage.setItem(CUSTOM_HASS_URL_KEY, trimmed);
      } else {
        console.warn("[SkyDark] Invalid HA URL — must start with http:// or https://");
        localStorage.removeItem(CUSTOM_HASS_URL_KEY);
      }
    } else {
      localStorage.removeItem(CUSTOM_HASS_URL_KEY);
    }
  } catch {
    console.warn("[SkyDark] Could not save custom HA URL to localStorage");
  }
}

/** Get the currently configured custom HA URL, if any. */
export function getCustomHassUrl(): string | null {
  try {
    return localStorage.getItem(CUSTOM_HASS_URL_KEY);
  } catch {
    return null;
  }
}
