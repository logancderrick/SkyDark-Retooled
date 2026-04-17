/** Human-readable fallback when no custom label is set (matches calendar toggle chips). */
export function defaultCalendarEntityShortLabel(entityId: string): string {
  const last = entityId.includes(".") ? entityId.split(".").pop() : entityId;
  return (last ?? entityId).replace(/_/g, " ");
}

/** Display name for a merged HA calendar entity (custom label or shortened entity id). */
export function calendarEntityLabel(
  entityId: string,
  labels?: Record<string, string> | null
): string {
  const custom = labels?.[entityId]?.trim();
  if (custom) return custom;
  return defaultCalendarEntityShortLabel(entityId);
}
