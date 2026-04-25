/**
 * Hides the Home Assistant sidebar and panel header from within the Skydark
 * iframe panel — without breaking voice satellite or other HA-level dialogs.
 *
 * browser_mod achieves the same visual result but can interfere with voice
 * satellite because it may prevent HA from rendering its top-level dialogs.
 * This module uses targeted CSS manipulation on shadow-DOM elements so HA
 * keeps rendering normally; we're only collapsing width/height, not removing
 * nodes or disconnecting event listeners.
 */

type Restore = () => void;

// ── Module-level singleton state ──────────────────────────────────────────────
let _restore: Restore = () => {};
let _hidden = false;
const _listeners = new Set<(hidden: boolean) => void>();

function notify() {
  for (const fn of _listeners) fn(_hidden);
}

/** Subscribe to hidden-state changes. Returns an unsubscribe function. */
export function onHaChromeStateChange(fn: (hidden: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isHaChromeHidden(): boolean {
  return _hidden;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

/** Walk a chain of selectors through nested shadow roots. */
function shadowQuery(
  root: Document | Element | ShadowRoot,
  ...selectors: string[]
): Element | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = root;
  for (const sel of selectors) {
    node = (node.shadowRoot ?? node).querySelector(sel);
    if (!node) return null;
  }
  return node as Element;
}

function applyStyles(
  el: HTMLElement | null,
  styles: Record<string, string>,
): Record<string, string> {
  if (!el) return {};
  const prev: Record<string, string> = {};
  for (const [prop, val] of Object.entries(styles)) {
    prev[prop] = el.style.getPropertyValue(prop);
    el.style.setProperty(prop, val, "important");
  }
  return prev;
}

function restoreStyles(el: HTMLElement | null, prev: Record<string, string>) {
  if (!el) return;
  for (const [prop, val] of Object.entries(prev)) {
    if (val) {
      el.style.setProperty(prop, val);
    } else {
      el.style.removeProperty(prop);
    }
  }
}

// ── Core apply / restore ──────────────────────────────────────────────────────

function applyHide(): Restore {
  if (window.parent === window) return () => {};

  try {
    const parentDoc = window.parent.document;

    /* 1. Sidebar — collapse width so listeners stay attached */
    const sidebar = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
      "ha-sidebar",
    ) as HTMLElement | null;

    const sidebarPrev = applyStyles(sidebar, {
      width: "0",
      "min-width": "0",
      overflow: "hidden",
      visibility: "hidden",
    });

    /* 2. Drawer margin — zero out so content fills full width */
    const drawer = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
    ) as HTMLElement | null;

    const drawerPrev = applyStyles(drawer, { "--mdc-drawer-width": "0px" });

    /* 3. Panel toolbar (the HA-level app-header above our iframe) */
    const panelIframe = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
      "partial-panel-resolver",
      "ha-panel-iframe",
    ) as HTMLElement | null;

    const toolbar = (
      panelIframe?.shadowRoot?.querySelector("app-header") ??
      panelIframe?.shadowRoot?.querySelector("ha-app-layout app-header")
    ) as HTMLElement | null;

    const toolbarPrev = applyStyles(toolbar, { display: "none" });

    const iframeContainer = (
      panelIframe?.shadowRoot?.querySelector("#contentContainer") ??
      panelIframe?.shadowRoot?.querySelector(".content")
    ) as HTMLElement | null;

    const containerPrev = applyStyles(iframeContainer, { "padding-top": "0" });

    return () => {
      restoreStyles(sidebar, sidebarPrev);
      restoreStyles(drawer, drawerPrev);
      restoreStyles(toolbar, toolbarPrev);
      restoreStyles(iframeContainer, containerPrev);
    };
  } catch {
    return () => {};
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function hideHaChrome() {
  _restore();
  _restore = applyHide();
  _hidden = true;
  notify();
}

export function showHaChrome() {
  _restore();
  _restore = () => {};
  _hidden = false;
  notify();
}

export function toggleHaChrome() {
  if (_hidden) {
    showHaChrome();
  } else {
    hideHaChrome();
  }
}

/**
 * Attempts hideHaChrome() with retries until the HA shadow DOM is ready.
 * Returns a cleanup that stops the interval and restores chrome.
 */
export function hideHaChromeWhenReady(
  maxAttempts = 20,
  intervalMs = 300,
): () => void {
  if (window.parent === window) return () => {}; // not in an iframe

  let attempts = 0;

  const id = window.setInterval(() => {
    attempts++;
    try {
      const parentDoc = window.parent.document;
      const ha = parentDoc.querySelector("home-assistant") as Element | null;
      const haMain = ha?.shadowRoot?.querySelector(
        "home-assistant-main",
      ) as Element | null;

      if (!haMain?.shadowRoot) {
        if (attempts >= maxAttempts) window.clearInterval(id);
        return;
      }

      window.clearInterval(id);
      hideHaChrome();
    } catch {
      if (attempts >= maxAttempts) window.clearInterval(id);
    }
  }, intervalMs);

  return () => {
    window.clearInterval(id);
    showHaChrome();
  };
}
