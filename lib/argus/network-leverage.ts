/**
 * Network leverage — derived give↔receive metrics (N2/N3).
 * No new schema. Uses Entity.contactValue / myValue + optional outcome Notes.
 */
import type { Entity, Log } from "./types";
import {
  CONTACT_VALUE_KEYS,
  MY_VALUE_KEYS,
  normalizeContactValueKeys,
  normalizeMyValueKeys,
  type ContactValueKey,
  type MyValueKey,
} from "./network-relationship-metrics";

export type NetworkLeverageRow = {
  personId: string;
  personName: string;
  received: ContactValueKey[];
  given: MyValueKey[];
  receivedCount: number;
  givenCount: number;
  /** received − given (positive = they give me more) */
  asymmetry: number;
  /** |asymmetry| + density — higher = more leverage signal */
  leverageScore: number;
  daysSinceLastInteraction: number | null;
};

export function networkLeverageForPerson(input: {
  entity: Entity;
  daysSinceLastInteraction?: number | null;
}): NetworkLeverageRow {
  const received = normalizeContactValueKeys(input.entity.contactValue);
  const given = normalizeMyValueKeys(input.entity.myValue);
  const receivedCount = received.length;
  const givenCount = given.length;
  const asymmetry = receivedCount - givenCount;
  const density = receivedCount + givenCount;
  const leverageScore = Math.abs(asymmetry) * 2 + density;
  return {
    personId: input.entity.id,
    personName: input.entity.name,
    received,
    given,
    receivedCount,
    givenCount,
    asymmetry,
    leverageScore,
    daysSinceLastInteraction: input.daysSinceLastInteraction ?? null,
  };
}

/** N3 attention aid: higher score → contact sooner when asymmetric + stale. */
export function networkAttentionScore(row: NetworkLeverageRow): number {
  const staleBoost =
    row.daysSinceLastInteraction === null
      ? 1
      : row.daysSinceLastInteraction > 60
        ? 3
        : row.daysSinceLastInteraction > 30
          ? 2
          : 0;
  return row.leverageScore + staleBoost * Math.max(1, Math.abs(row.asymmetry));
}

export function sortPeopleByNetworkAttention<T extends { id: string }>(
  people: T[],
  rowById: Map<string, NetworkLeverageRow>
): T[] {
  return [...people].sort((a, b) => {
    const ra = rowById.get(a.id);
    const rb = rowById.get(b.id);
    const sa = ra ? networkAttentionScore(ra) : 0;
    const sb = rb ? networkAttentionScore(rb) : 0;
    if (sb !== sa) return sb - sa;
    return (a as { name?: string }).name?.localeCompare((b as { name?: string }).name ?? "") ?? 0;
  });
}

/** Evidence Tags from an outcome Note that look like value keys. */
export function outcomeValueKeysFromLog(log: Log): {
  gained: ContactValueKey[];
  gave: MyValueKey[];
} {
  const topics = log.topics ?? [];
  const gained = normalizeContactValueKeys(
    topics.filter((t) => (CONTACT_VALUE_KEYS as readonly string[]).includes(t))
  );
  const gave = normalizeMyValueKeys(
    topics.filter((t) => (MY_VALUE_KEYS as readonly string[]).includes(t))
  );
  return { gained, gave };
}

export function isConversationOutcomeLog(log: Log): boolean {
  if (log.deletedAt) return false;
  const title = (log.title ?? "").toLowerCase();
  const body = (log.body ?? "").toLowerCase();
  return title.startsWith("conversation") || body.includes("gained:") || body.includes("gave:");
}
