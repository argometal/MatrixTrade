import { referenceKindFromNotes } from "./reference-types";
import type { ArgusData } from "./types";

/** Canonical tag form — same rules as evidence Tags / linkedTags. */
export function normalizeSignalTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  return normalized.sort((a, b) => a.localeCompare(b));
}

export function signalTagKey(tag: string): string {
  return tag.trim().replace(/\s+/g, " ").toLowerCase();
}

export function signalTagKeySet(tags: string[] | undefined): Set<string> {
  return new Set(normalizeSignalTags(tags).map(signalTagKey));
}

export function isSignalTag(tag: string, signalTags: string[] | undefined): boolean {
  const key = signalTagKey(tag);
  if (!key) return false;
  return signalTagKeySet(signalTags).has(key);
}

/** Raw journal still has Event binder Signals (pre–focus Tags) or missing signalTags field. */
export function journalNeedsSignalTagsMigration(raw: ArgusData): boolean {
  if (raw.signalTags === undefined) return true;
  return (raw.entities ?? []).some(
    (entity) =>
      referenceKindFromNotes(entity.notes ?? "") === "event" && (entity.linkedTags?.length ?? 0) > 0
  );
}

/**
 * Move Event entity `linkedTags` (legacy Signals) → journal `signalTags` (flagged focus Tags).
 * Topic Aliases on Topic `linkedTags` are untouched.
 */
export function migrateEventSignalsToSignalTags(data: ArgusData): {
  data: ArgusData;
  changed: boolean;
} {
  const signalMap = new Map<string, string>();
  for (const tag of normalizeSignalTags(data.signalTags)) {
    signalMap.set(signalTagKey(tag), tag);
  }

  let cleared = false;
  const entities = (data.entities ?? []).map((entity) => {
    if (referenceKindFromNotes(entity.notes ?? "") !== "event") return entity;
    const tags = entity.linkedTags ?? [];
    if (tags.length === 0) return entity;
    cleared = true;
    for (const raw of tags) {
      const tag = raw.trim().replace(/\s+/g, " ");
      if (!tag) continue;
      const key = signalTagKey(tag);
      if (!signalMap.has(key)) signalMap.set(key, tag);
    }
    return { ...entity, linkedTags: [] };
  });

  const signalTags = [...signalMap.values()].sort((a, b) => a.localeCompare(b));
  const changed = cleared || data.signalTags === undefined;

  return {
    data: {
      ...data,
      entities,
      signalTags,
    },
    changed,
  };
}
