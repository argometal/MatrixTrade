/**
 * Event Tag ↔ Note Tag sync helpers.
 * Binder `eventTags` and evidence `Log.topics` stay dual-written so Patterns
 * (evidence-only) and the Event Tags tab stay aligned for Event-first workflows.
 */
import type { ArgusData } from "../types";
import { normalizeTagDisplay, normalizeTagList, tagKey } from "../tag-ontology";

export function placeholderBodyForEventTags(tags: string[]): string {
  const list = normalizeTagList(tags);
  if (list.length === 0) return "Tagged";
  return `Tagged: ${list.map((tag) => `#${tag}`).join(" ")}`;
}

/** Canonical keys already present on this Event’s Notes / linked emails. */
export function evidenceTagKeysForEvent(data: ArgusData, eventId: string): Set<string> {
  const keys = new Set<string>();
  for (const log of data.logs ?? []) {
    if (log.deletedAt || !(log.entityIds ?? []).includes(eventId)) continue;
    for (const raw of log.topics ?? []) {
      const key = tagKey(raw);
      if (key) keys.add(key);
    }
  }
  for (const item of data.inboxItems ?? []) {
    if (item.deletedAt || !(item.linkedEntityIds ?? []).includes(eventId)) continue;
    for (const raw of item.topics ?? []) {
      const key = tagKey(raw);
      if (key) keys.add(key);
    }
  }
  return keys;
}

/** Tags from `candidates` not yet on any Event evidence row. */
export function tagsMissingFromEventEvidence(
  data: ArgusData,
  eventId: string,
  candidates: string[]
): string[] {
  const existing = evidenceTagKeysForEvent(data, eventId);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const display = normalizeTagDisplay(raw);
    if (!display) continue;
    const key = tagKey(display);
    if (!key || seen.has(key) || existing.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

export function mergeBinderTagLists(current: string[] | undefined, incoming: string[]): string[] {
  return normalizeTagList([...(current ?? []), ...incoming]);
}
