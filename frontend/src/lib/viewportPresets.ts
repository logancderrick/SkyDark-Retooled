export type Orientation = "portrait" | "landscape";

export interface ViewportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: "primary" | "edge";
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: "7in", label: "7\" (legacy)", width: 600, height: 1024, category: "edge" },
  { id: "8in", label: "8\" class", width: 768, height: 1024, category: "primary" },
  { id: "10in", label: "10\" class", width: 800, height: 1280, category: "primary" },
  { id: "11in", label: "11\" class", width: 834, height: 1194, category: "primary" },
  { id: "12.9in", label: "12.9\" class", width: 1024, height: 1366, category: "primary" },
  { id: "ultrawide", label: "Ultra-wide (1920×1080)", width: 1920, height: 1080, category: "edge" },
];

export function getPresetDimensions(
  presetId: string,
  orientation: Orientation
): { width: number; height: number } {
  const p = VIEWPORT_PRESETS.find((x) => x.id === presetId);
  if (!p) return { width: 0, height: 0 };
  return orientation === "portrait"
    ? { width: p.width, height: p.height }
    : { width: p.height, height: p.width };
}
