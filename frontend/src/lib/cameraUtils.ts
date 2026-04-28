/** Strips noisy suffixes added by some integrations (e.g. Reolink). */
const STRIP_SUFFIXES = [
  /[\s\-–—]+high[\s\-]resolution[\s\-]channel\.?$/i,
  /[\s\-–—]+low[\s\-]resolution[\s\-]channel\.?$/i,
  /[\s\-–—]+sub[\s\-]stream\.?$/i,
  /[\s\-–—]+main[\s\-]stream\.?$/i,
];

/**
 * Friendly-name overrides applied after generic suffix stripping.
 * Key: lowercase post-strip name. Value: display name to use instead.
 */
const CAMERA_NAME_OVERRIDES: Record<string, string> = {};

/** Returns a clean display name for a camera entity. */
export function cleanCameraName(raw: string): string {
  let name = raw.trim();
  for (const re of STRIP_SUFFIXES) {
    name = name.replace(re, "").trim();
  }
  const lower = name.toLowerCase();
  return CAMERA_NAME_OVERRIDES[lower] ?? name;
}
