import type { FamilyMember } from "../../types/calendar";

const DEFAULT_EVENT_COLOR = "#C8E6F5";
const DEFAULT_BORDER_COLOR = "#3B9BBF";

/** Normalize calendar_id from legacy string or array to string[]. */
export function normalizeCalendarIds(
  calendarId: string | string[] | undefined
): string[] {
  if (!calendarId) return [];
  return Array.isArray(calendarId) ? calendarId : [calendarId];
}

/**
 * Resolve profile IDs to an array of hex colors (profile order preserved).
 * Returns [DEFAULT_EVENT_COLOR] if no profiles or IDs not found.
 */
export function getEventProfileColors(
  profileIds: string[],
  familyMembers: FamilyMember[]
): string[] {
  if (!profileIds?.length) return [DEFAULT_EVENT_COLOR];
  const colors: string[] = [];
  const byId = new Map(familyMembers.map((m) => [m.id, m]));
  for (const id of profileIds) {
    const member = byId.get(id);
    if (member?.color) colors.push(member.color);
  }
  if (colors.length === 0) return [DEFAULT_EVENT_COLOR];
  return colors;
}

/** Build equal-width horizontal color bands left-to-right. */
function buildEqualBandsGradient(colors: string[]): string {
  const n = colors.length;
  const stops = colors
    .map((color, i) => {
      const start = (i / n) * 100;
      const end = ((i + 1) / n) * 100;
      return `${color} ${start}%, ${color} ${end}%`;
    })
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
}

export interface EventColorStyleResult {
  style: React.CSSProperties;
  borderColor: string;
}

/**
 * Returns style (and border color) for an event based on assigned profiles.
 * Single profile: solid backgroundColor.
 * Multiple profiles: equal-width color bands (no diagonal slashes).
 */
export function getEventColorStyle(
  profileIds: string[],
  familyMembers: FamilyMember[]
): EventColorStyleResult {
  const colors = getEventProfileColors(profileIds, familyMembers);

  if (colors.length === 1) {
    return {
      style: { backgroundColor: colors[0] },
      borderColor: colors[0],
    };
  }

  const gradient = buildEqualBandsGradient(colors);
  return {
    style: {
      backgroundImage: gradient,
      backgroundSize: "cover",
      backgroundColor: colors[0],
    },
    borderColor: colors[0],
  };
}

export { DEFAULT_EVENT_COLOR, DEFAULT_BORDER_COLOR };
