/**
 * Hides the Home Assistant sidebar and panel header from within the Skydark
 * iframe panel — without breaking voice satellite or other HA-level dialogs.
 *
 * Uses injected <style> tags inside shadow roots rather than fragile inline
 * style snapshots, so toggling survives HA component re-renders.  A
 * MutationObserver re-injects the styles if HA's renderer removes them.
 */

// ── Module state ──────────────────────────────────────────────────────────────
let _hidden = false;
let _observer: MutationObserver | null = null;
const _listeners = new Set<(hidden: boolean) => void>();

const MAIN_STYLE_ID = "skydark-hide-main-chrome";
const PANEL_STYLE_ID = "skydark-hide-panel-chrome";

const HIDE_MAIN_CSS = `
  ha-sidebar {
    width: 0 !important;
    min-width: 0 !important;
    overflow: hidden !important;
    visibility: hidden !important;
  }
  ha-drawer {
    --mdc-drawer-width: 0px !important;
  }
`;

const HIDE_PANEL_CSS = `
  app-header {
    display: none !important;
  }
  #contentContainer, .content {
    padding-top: 0 !important;
  }
`;

// ── Subscription ──────────────────────────────────────────────────────────────

/** Subscribe to hidden-state changes. Returns an unsubscribe function. */
export function onHaChromeStateChange(fn: (hidden: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isHaChromeHidden(): boolean {
  return _hidden;
}

// ── Shadow root helpers ───────────────────────────────────────────────────────

function getHaMainShadow(): ShadowRoot | null {
  try {
    const ha = window.parent.document.querySelector("home-assistant");
    const haMain = ha?.shadowRoot?.querySelector("home-assistant-main");
    return (haMain as Element | undefined)?.shadowRoot ?? null;
  } catch {
    return null;
  }
}

function getPanelShadow(): ShadowRoot | null {
  try {
    const mainShadow = getHaMainShadow();
    if (!mainShadow) return null;
    const drawer = mainShadow.querySelector("ha-drawer");
    const resolver = drawer?.querySelector("partial-panel-resolver");
    const panel = resolver?.querySelector("ha-panel-iframe");
    return (panel as Element | undefined)?.shadowRoot ?? null;
  } catch {
    return null;
  }
}

function upsertStyle(shadowRoot: ShadowRoot | null, id: string, css: string) {
  if (!shadowRoot) return;
  let el = shadowRoot.querySelector(`#${id}`) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style") as HTMLStyleElement;
    el.id = id;
    shadowRoot.appendChild(el);
  }
  el.textContent = css;
}

function removeStyle(shadowRoot: ShadowRoot | null, id: string) {
  shadowRoot?.querySelector(`#${id}`)?.remove();
}

// ── Apply / remove ────────────────────────────────────────────────────────────

function applyHideStyles() {
  upsertStyle(getHaMainShadow(), MAIN_STYLE_ID, HIDE_MAIN_CSS);
  upsertStyle(getPanelShadow(), PANEL_STYLE_ID, HIDE_PANEL_CSS);
}

function removeHideStyles() {
  removeStyle(getHaMainShadow(), MAIN_STYLE_ID);
  removeStyle(getPanelShadow(), PANEL_STYLE_ID);
}

// ── MutationObserver — re-injects styles if HA removes them ──────────────────

function startObserver() {
  if (_observer || window.parent === window) return;
  const mainShadow = getHaMainShadow();
  if (!mainShadow) return;

  _observer = new MutationObserver(() => {
    if (_hidden && !mainShadow.querySelector(`#${MAIN_STYLE_ID}`)) {
      applyHideStyles();
    }
  });
  _observer.observe(mainShadow, { childList: true });
}

function stopObserver() {
  _observer?.disconnect();
  _observer = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function hideHaChrome() {
  applyHideStyles();
  startObserver();
  _hidden = true;
  for (const fn of _listeners) fn(_hidden);
}

export function showHaChrome() {
  removeHideStyles();
  stopObserver();
  _hidden = false;
  for (const fn of _listeners) fn(_hidden);
}

export function toggleHaChrome() {
  if (_hidden) {
    showHaChrome();
  } else {
    hideHaChrome();
  }
}

/**
 * Retries hideHaChrome() until the HA shadow DOM is ready.
 * Returns a cleanup function.
 */
export function hideHaChromeWhenReady(
  maxAttempts = 20,
  intervalMs = 300,
): () => void {
  if (window.parent === window) return () => {};

  let attempts = 0;

  const id = window.setInterval(() => {
    attempts++;
    const mainShadow = getHaMainShadow();
    if (mainShadow) {
      window.clearInterval(id);
      hideHaChrome();
      return;
    }
    if (attempts >= maxAttempts) window.clearInterval(id);
  }, intervalMs);

  return () => {
    window.clearInterval(id);
    showHaChrome();
  };
}
