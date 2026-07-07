import type { ArgusData, Entity, Log } from "./types";

export type StrategicValue = 1 | 2 | 3 | 4 | 5;
export type RelationshipHealth = "active" | "cooling" | "dormant" | "neglected";

export interface EntityIntelligence {
  entity: Entity;
  lastMeaningfulInteraction?: string;
  nextFollowUp?: string;
  openFollowUps: number;
  logCount: number;
  evidenceCount: number;
  topics: string[];
  outcomeScore: number;
  attentionScore: number;
  relationshipHealth: RelationshipHealth;
  daysSinceLastInteraction: number | null;
  relatedEntityIds: string[];
}

const OUTCOME_SIGNALS: { pattern: RegExp; points: number }[] = [
  { pattern: /\bopportunit/i, points: 3 },
  { pattern: /\breferr/i, points: 4 },
  { pattern: /\brecommend/i, points: 3 },
  { pattern: /\bsolved\b|\bresolved\b|\bfixed\b/i, points: 3 },
  { pattern: /\bknowledge shared\b|\bshared knowledge\b|\btaught\b|\btraining\b/i, points: 2 },
  { pattern: /\bintroduc(ed|ing|tion)\b|\bconnected (me|us) with\b/i, points: 4 },
  { pattern: /\bbusiness generated\b|\brevenue\b|\bdeal\b|\bcontract\b/i, points: 5 },
  { pattern: /\bhelp received\b|\bsupport(ed)? me\b|\bassisted\b/i, points: 2 },
  { pattern: /\bsupport provided\b|\bhelped (them|him|her)\b/i, points: 2 },
  { pattern: /\bmeeting\b|\bconversation\b|\bcall\b|\bdiscussion\b/i, points: 1 },
  { pattern: /\bdecision\b|\bagreed\b|\bapproved\b/i, points: 2 },
];

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

function computeOutcomeScore(logs: Log[]): number {
  let score = 0;
  for (const log of logs) {
    const haystack = `${log.title} ${log.body} ${log.topics.join(" ")}`;
    for (const { pattern, points } of OUTCOME_SIGNALS) {
      if (pattern.test(haystack)) score += points;
    }
    if (log.attachmentIds.length > 0) score += 1;
  }
  return score;
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

/** Map selected contact-value outcomes to grace-period weight (replaces manual 1–5). */
function contactValueWeight(entity: Entity): StrategicValue {
  const count = entity.contactValue?.length ?? 0;
  if (count >= 4) return 5;
  if (count === 3) return 4;
  if (count === 2) return 3;
  if (count === 1) return 2;
  const legacy = entity.strategicValue ?? 3;
  return (legacy >= 1 && legacy <= 5 ? legacy : 3) as StrategicValue;
}

export function computeRelationshipHealth(
  strategicValue: StrategicValue,
  daysSince: number | null,
  openFollowUps: number
): RelationshipHealth {
  if (daysSince === null) return openFollowUps > 0 ? "cooling" : "dormant";

  const grace = GRACE_DAYS[strategicValue];
  const activeWindow = Math.floor(grace / 4);
  const coolingWindow = Math.floor(grace / 2);

  if (openFollowUps > 0 && daysSince <= grace) return "active";
  if (daysSince <= activeWindow) return "active";
  if (daysSince <= coolingWindow) return "cooling";
  if (daysSince <= grace) return "dormant";

  if (strategicValue >= 4) return "neglected";
  return daysSince <= grace * 1.5 ? "dormant" : "neglected";
}

export function computeAttentionScore(
  strategicValue: StrategicValue,
  daysSince: number | null,
  openFollowUps: number,
  outcomeScore: number,
  relationshipHealth: RelationshipHealth
): number {
  const silence =
    daysSince === null ? 60 : Math.min(daysSince, 180);
  const valueWeight = strategicValue / 5;

  let score =
    strategicValue * 12 +
    silence * valueWeight * 1.5 +
    openFollowUps * 18 +
    Math.min(outcomeScore, 40) * 0.8;

  if (relationshipHealth === "neglected") score += 25;
  if (relationshipHealth === "dormant" && strategicValue >= 3) score += 12;

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
  const strategicValue = contactValueWeight(entity);
  const lastInteraction = lastMeaningfulInteractionDate(linked);
  const daysSince = lastInteraction ? daysBetween(lastInteraction, today) : null;
  const openFollowUps = openFollowUpCount(linked, today);
  const outcomeScore = computeOutcomeScore(linked);
  const relationshipHealth = computeRelationshipHealth(strategicValue, daysSince, openFollowUps);
  const attentionScore = computeAttentionScore(
    strategicValue,
    daysSince,
    openFollowUps,
    outcomeScore,
    relationshipHealth
  );

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
    outcomeScore,
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

export interface NetworkHomeSections {
  needsAttention: EntityIntelligence[];
  topStrategic: EntityIntelligence[];
  recentlyActive: EntityIntelligence[];
  dormant: EntityIntelligence[];
  recentlyUpdated: EntityIntelligence[];
}

export function buildNetworkHomeSections(
  intelligence: EntityIntelligence[]
): NetworkHomeSections {
  const withHistory = intelligence.filter((i) => i.logCount > 0 || i.openFollowUps > 0);
  const all = intelligence;

  const needsAttention = [...withHistory]
    .filter(
      (i) =>
        i.relationshipHealth === "neglected" ||
        i.relationshipHealth === "dormant" ||
        i.openFollowUps > 0 ||
        (i.entity.strategicValue ?? 3) >= 4 && i.relationshipHealth !== "active"
    )
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 8);

  const topStrategic = [...all]
    .filter((i) => (i.entity.strategicValue ?? 3) >= 4)
    .sort(
      (a, b) =>
        (b.entity.strategicValue ?? 3) - (a.entity.strategicValue ?? 3) ||
        b.outcomeScore - a.outcomeScore
    )
    .slice(0, 8);

  const recentlyActive = [...withHistory]
    .filter((i) => i.relationshipHealth === "active")
    .sort((a, b) => (b.lastMeaningfulInteraction ?? "").localeCompare(a.lastMeaningfulInteraction ?? ""))
    .slice(0, 8);

  const dormant = [...withHistory]
    .filter((i) => i.relationshipHealth === "dormant" || i.relationshipHealth === "neglected")
    .sort((a, b) => (b.daysSinceLastInteraction ?? 0) - (a.daysSinceLastInteraction ?? 0))
    .slice(0, 8);

  const recentlyUpdated = [...all]
    .sort((a, b) => b.entity.updatedAt.localeCompare(a.entity.updatedAt))
    .slice(0, 8);

  return { needsAttention, topStrategic, recentlyActive, dormant, recentlyUpdated };
}
