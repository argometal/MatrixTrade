import type { InboxItem, Log } from "../types";
import {
  TAG_PATTERN_FRESHNESS_DAYS,
  TAG_PATTERN_MIN_COUNT,
} from "../tag-limits";

export type TagPattern = {
  /** Canonical display form */
  tag: string;
  /** Evidence items in scope carrying this tag */
  count: number;
  /** Items tagged within the freshness window */
  recentCount: number;
};

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function tagKey(raw: string): string {
  return normalizeTag(raw).toLowerCase();
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type TagAccumulator = {
  display: string;
  count: number;
  recentCount: number;
};

/**
 * Recurring tag patterns on evidence linked to a scope (org, project, topic, event).
 * Tags on topics/entities do not flag — only tags on individual evidence rows count.
 * Singletons (count < 3) are stored but not returned as patterns.
 */
export function buildTagPatternsForScope(
  logs: Log[],
  inbox: InboxItem[],
  today: string
): TagPattern[] {
  const freshnessCutoff = addDays(today, -TAG_PATTERN_FRESHNESS_DAYS);
  const acc = new Map<string, TagAccumulator>();

  function bump(tagRaw: string, iso: string) {
    const display = normalizeTag(tagRaw);
    if (!display) return;
    const key = tagKey(display);
    const row = acc.get(key) ?? { display, count: 0, recentCount: 0 };
    row.count += 1;
    if (iso.slice(0, 10) >= freshnessCutoff) row.recentCount += 1;
    acc.set(key, row);
  }

  for (const log of logs) {
    const iso = log.updatedAt || log.date;
    for (const raw of log.topics ?? []) bump(raw, iso);
  }

  for (const item of inbox) {
    const iso = item.receivedAt;
    for (const raw of item.topics ?? []) bump(raw, iso);
  }

  return [...acc.values()]
    .filter((row) => row.count >= TAG_PATTERN_MIN_COUNT && row.recentCount >= 1)
    .map((row) => ({
      tag: row.display,
      count: row.count,
      recentCount: row.recentCount,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function tagPatternCount(patterns: TagPattern[]): number {
  return patterns.length;
}
