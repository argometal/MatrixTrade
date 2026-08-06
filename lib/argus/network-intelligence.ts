import type { ArgusData, Entity, Log } from "./types";

export type StrategicValue = 1 | 2 | 3 | 4 | 5;
/** Internal recency band — not a user-facing product vocabulary. */
export type RelationshipHealth = "active" | "cooling" | "dormant" | "neglected";

export interface EntityIntelligence {
  entity: Entity;
  lastMeaningfulInteraction?: string;
  nextFollowUp?: string;
  openFollowUps: number;
  logCount: number;
  evidenceCount: number;
  topics: string[];
  /**
   * @deprecated Always 0 — opaque regex outcome scoring removed (Evidence Engine P4/P5).
   * Kept on the type so call sites compile until fully scrubbed.
   */
  outcomeScore: number;
  /** Sort aid only — derived from evidence dates, follow-ups, and contactValue weight. Not displayed as a KPI. */
  attentionScore: number;
  /** Internal band used to derive browse status — prefer V2NetworkBrowseStatus in UI. */
  relationshipHealth: RelationshipHealth;
  daysSinceLastInteraction: number | null;
  relatedEntityIds: string[];
}

/** Grace days before relationship is considered cooling/dormant/neglected */
const GRACE_DAYS: Record<StrategicValue, number> = {
  1: 120,
  2: 90,
  3: 60,
  4: 45,
  5: 30,
};

function logsForEntity(logs: Log[], entityId: string): Log[] {
  return logs.filter((l) => l.entityIds.includes(entityId));
}

function isMeaningfulInteraction(log: Log): boolean {
  if (log.kind === "event" || log.kind === "follow_up") return true;
  if (log.attachmentIds.length > 0) return true;
  if (log.source === "email" || log.source === "file") return true;
  const text = `${log.title} ${log.body}`.trim();
  if (text.length >= 40) return true;
  if (log.topics.length > 0) return true;
  return false;
}

function lastMeaningfulInteractionDate(logs: Log[]): string | undefined {
  const meaningful = logs.filter(isMeaningfulInteraction).sort((a, b) => b.date.localeCompare(a.date));
  if (meaningful.length > 0) return meaningful[0].date;
  if (logs.length === 0) return undefined;
  return [...logs].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate.slice(0, 10)}T12:00:00Z`);
  const to = Date.parse(`${toDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

function openFollowUpCount(logs: Log[], today: string): number {
  return logs.filter((l) => {
    const touch = l.followUpDate ?? (l.kind === "follow_up" ? l.date : undefined);
    return touch && touch >= today;
  }).length;
}

function nextFollowUpDate(logs: Log[], today: string): string | undefined {
  const dates = logs
    .map((l) => l.followUpDate ?? (l.kind === "follow_up" ? l.date : undefined))
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.find((d) => d >= today) ?? dates[dates.length - 1];
}

function topicsForEntity(logs: Log[]): string[] {
  const set = new Set<string>();
  for (const log of logs) {
    for (const t of log.topics) {
      if (t.trim()) set.add(t.trim());
    }
  }
  return [...set].sort();
}

/**
 * Map selected contact-value outcomes to grace-period weight.
 * Falls back to legacy strategicValue only when contactValue is empty (read fallback).
 */
export function contactValueWeight(entity: Entity): StrategicValue {
  const count = entity.contactValue?.length ?? 0;
  if (count >= 4) return 5;
  if (count === 3) return 4;
  if (count === 2) return 3;
  if (count === 1) return 2;
  const legacy = entity.strategicValue ?? 3;
  return (legacy >= 1 && legacy <= 5 ? legacy : 3) as StrategicValue;
}

export function computeRelationshipHealth(
  valueWeight: StrategicValue,
  daysSince: number | null,
  openFollowUps: number
): RelationshipHealth {
  if (daysSince === null) return openFollowUps > 0 ? "cooling" : "dormant";

  const grace = GRACE_DAYS[valueWeight];
  const activeWindow = Math.floor(grace / 4);
  const coolingWindow = Math.floor(grace / 2);

  if (openFollowUps > 0 && daysSince <= grace) return "active";
  if (daysSince <= activeWindow) return "active";
  if (daysSince <= coolingWindow) return "cooling";
  if (daysSince <= grace) return "dormant";

  if (valueWeight >= 4) return "neglected";
  return daysSince <= grace * 1.5 ? "dormant" : "neglected";
}

/** Sort aid for neglected-first lists — not a user-facing score. */
export function computeAttentionScore(
  valueWeight: StrategicValue,
  daysSince: number | null,
  openFollowUps: number,
  relationshipHealth: RelationshipHealth
): number {
  const silence = daysSince === null ? 60 : Math.min(daysSince, 180);
  const weight = valueWeight / 5;

  let score = valueWeight * 12 + silence * weight * 1.5 + openFollowUps * 18;

  if (relationshipHealth === "neglected") score += 25;
  if (relationshipHealth === "dormant" && valueWeight >= 3) score += 12;

  return Math.round(score);
}

export function buildEntityIntelligence(
  data: ArgusData,
  entity: Entity,
  includePrivate: boolean,
  today: string
): EntityIntelligence {
  const visibleLogs = includePrivate ? data.logs : data.logs.filter((l) => !l.private);
  const linked = logsForEntity(visibleLogs, entity.id);
  const valueWeight = contactValueWeight(entity);
  const lastInteraction = lastMeaningfulInteractionDate(linked);
  const daysSince = lastInteraction ? daysBetween(lastInteraction, today) : null;
  const openFollowUps = openFollowUpCount(linked, today);
  const relationshipHealth = computeRelationshipHealth(valueWeight, daysSince, openFollowUps);
  const attentionScore = computeAttentionScore(valueWeight, daysSince, openFollowUps, relationshipHealth);

  const related = new Set<string>();
  for (const log of linked) {
    for (const id of log.entityIds) {
      if (id !== entity.id) related.add(id);
    }
  }

  return {
    entity,
    lastMeaningfulInteraction: lastInteraction,
    nextFollowUp: nextFollowUpDate(linked, today),
    openFollowUps,
    logCount: linked.length,
    evidenceCount: linked.filter((l) => l.attachmentIds.length > 0).length,
    topics: topicsForEntity(linked),
    outcomeScore: 0,
    attentionScore,
    relationshipHealth,
    daysSinceLastInteraction: daysSince,
    relatedEntityIds: [...related].sort(),
  };
}

export function buildAllEntityIntelligence(
  data: ArgusData,
  includePrivate: boolean,
  entityQuery?: string
): EntityIntelligence[] {
  const today = new Date().toISOString().slice(0, 10);
  const q = entityQuery?.trim().toLowerCase() ?? "";

  let entities = data.entities;
  if (q) {
    entities = entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.alias ?? "").toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }

  return entities.map((entity) => buildEntityIntelligence(data, entity, includePrivate, today));
}
