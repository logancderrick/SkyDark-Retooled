/**
 * Hides the Home Assistant sidebar and panel header from within the Skydark
 * iframe panel — without breaking voice satellite or other HA-level dialogs.
 *
 * browser_mod achieves the same visual result but can interfere with voice
 * satellite because it may prevent HA from rendering its top-level dialogs.
 * This module uses targeted CSS manipulation on shadow-DOM elements so HA
 * keeps rendering normally; we're only collapsing width/height, not removing
 * nodes or disconnecting event listeners.
 *
 * Must be called after the parent HA document has finished rendering
 * (typically a few hundred ms after our iframe loads).  Returns a cleanup
 * function that restores the original styles.
 */

type Restore = () => void;

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

function applyStyle(el: HTMLElement | null, styles: Record<string, string>): Record<string, string> {
  if (!el) return {};
  const prev: Record<string, string> = {};
  for (const [prop, val] of Object.entries(styles)) {
    prev[prop] = el.style.getPropertyValue(prop);
    el.style.setProperty(prop, val, "important");
  }
  return prev;
}

function restoreStyle(el: HTMLElement | null, prev: Record<string, string>) {
  if (!el) return;
  for (const [prop, val] of Object.entries(prev)) {
    if (val) {
      el.style.setProperty(prop, val);
    } else {
      el.style.removeProperty(prop);
    }
  }
}

export function hideHaChrome(): Restore {
  // Only runs when loaded inside a same-origin HA iframe
  if (window.parent === window) return () => {};

  try {
    const parentDoc = window.parent.document;

    /* ── 1. Sidebar ──────────────────────────────────────────────────────── */
    // HA renders: home-assistant → (shadow) → home-assistant-main → (shadow)
    //   → ha-drawer → ha-sidebar
    const sidebar = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
      "ha-sidebar",
    ) as HTMLElement | null;

    // Collapse width rather than display:none so DOM listeners stay attached
    const sidebarPrev = applyStyle(sidebar, {
      width: "0",
      "min-width": "0",
      overflow: "hidden",
      visibility: "hidden",
    });

    // The drawer's content slot adds a left margin equal to sidebar width —
    // zero it out so our panel fills the full viewport width.
    const drawerContent = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
    ) as HTMLElement | null;
    // ha-drawer uses --mdc-drawer-width custom property for the margin
    const drawerPrev = applyStyle(drawerContent, { "--mdc-drawer-width": "0px" });

    /* ── 2. Panel toolbar (the HA-level header above our iframe) ─────────── */
    // home-assistant → (shadow) → home-assistant-main → (shadow) → ha-drawer
    //   → (content slot) → partial-panel-resolver → ha-panel-iframe → (shadow)
    //   → ha-app-layout / app-header
    const panelIframe = shadowQuery(
      parentDoc,
      "home-assistant",
      "home-assistant-main",
      "ha-drawer",
      "partial-panel-resolver",
      "ha-panel-iframe",
    ) as HTMLElement | null;

    // The toolbar lives inside ha-panel-iframe's own shadow root
    const toolbar = panelIframe?.shadowRoot?.querySelector("app-header") as HTMLElement | null
      ?? panelIframe?.shadowRoot?.querySelector("ha-app-layout app-header") as HTMLElement | null;

    const toolbarPrev = applyStyle(toolbar, {
      display: "none",
    });

    // ha-panel-iframe also adds padding-top for the header — remove it
    const iframeContainer = panelIframe?.shadowRoot?.querySelector(
      "#contentContainer",
    ) as HTMLElement | null
      ?? panelIframe?.shadowRoot?.querySelector(".content") as HTMLElement | null;
    const containerPrev = applyStyle(iframeContainer, { "padding-top": "0" });

    return () => {
      restoreStyle(sidebar, sidebarPrev);
      restoreStyle(drawerContent, drawerPrev);
      restoreStyle(toolbar, toolbarPrev);
      restoreStyle(iframeContainer, containerPrev);
    };
  } catch {
    // Cross-origin or sandboxed — silently skip
    return () => {};
  }
}

/**
 * Attempts hideHaChrome() with retries until the HA shadow DOM is ready.
 * Calls back with the restore function once applied.
 */
export function hideHaChromeWhenReady(
  onApplied?: (restore: Restore) => void,
  maxAttempts = 20,
  intervalMs = 300,
): () => void {
  let attempts = 0;
  let restore: Restore = () => {};
  let applied = false;

  const id = window.setInterval(() => {
    attempts++;
    try {
      const parentDoc = window.parent.document;
      // Check that the HA shadow DOM is available before applying
      const ha = parentDoc.querySelector("home-assistant") as Element | null;
      const haMain = ha?.shadowRoot?.querySelector("home-assistant-main") as Element | null;
      if (!haMain?.shadowRoot) {
        if (attempts >= maxAttempts) window.clearInterval(id);
        return;
      }

      window.clearInterval(id);
      restore = hideHaChrome();
      applied = true;
      onApplied?.(restore);
    } catch {
      if (attempts >= maxAttempts) window.clearInterval(id);
    }
  }, intervalMs);

  return () => {
    window.clearInterval(id);
    if (applied) restore();
  };
}
