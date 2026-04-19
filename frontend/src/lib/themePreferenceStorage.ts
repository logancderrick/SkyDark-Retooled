const KEY = "skydark_theme_preference_v1";

export function readStoredThemePreference(): "light" | "dark" | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // ignore
  }
  return null;
}

export function writeStoredThemePreference(value: "light" | "dark"): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // ignore
  }
}
