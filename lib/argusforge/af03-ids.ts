/**
 * Stable persistent IDs for Chaos builder (CHANGE 24-1C).
 * Not derived from array index, title, route, or creation order alone.
 */

export function newStableId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random()
          .toString(36)
          .slice(2)}`;
  return `${prefix}_${uuid}`;
}
