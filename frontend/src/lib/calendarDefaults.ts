import type { FamilyMember } from "../types/calendar";

/**
 * Default SkyDark profile for new events: explicit setting, else a profile named "Family",
 * else the first profile.
 */
export function getDefaultFamilyCalendarMemberId(
  members: FamilyMember[],
  preferredId?: string | null
): string {
  if (members.length === 0) return "";
  const trimmed = preferredId?.trim();
  if (trimmed && members.some((m) => m.id === trimmed)) return trimmed;
  const familyNamed = members.find((m) => m.name.trim().toLowerCase() === "family");
  if (familyNamed) return familyNamed.id;
  return members[0].id;
}
