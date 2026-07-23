/**
 * Argus Engine — relations / discovery / enrichment / semantic navigation.
 * Answers: “What is related to what?”
 * Never depends on folders. Never implements temporal/recurrence behavior (MTA Engine).
 */

export const ARGUS_RELATION_TYPES = [
  "related_to",
  "derived_from",
  "contradicts",
  "evidence_for",
  "expands",
  "summarizes",
  "references",
] as const;

export type ArgusRelationType = (typeof ARGUS_RELATION_TYPES)[number];

export type ArgusRelation = {
  id: string;
  type: ArgusRelationType;
  /** Memory Registry entry id (or future product-scoped id via pointer). */
  fromEntryId: string;
  toEntryId: string;
  createdAt: string;
  /** Optional note; not a folder path. */
  note?: string;
  /** Who asserted the edge. */
  assertedBy: "human" | "ai-proposal" | "system";
  /** If from AI, must stay pending until user acceptance (see ai-proposals). */
  status: "accepted" | "pending" | "rejected";
};

export type EntityHint = {
  label: string;
  kind?: string;
  confidence?: number;
};

export type LinkSuggestion = {
  type: ArgusRelationType;
  fromEntryId: string;
  toEntryId: string;
  rationale?: string;
};

export type PlacementHint = {
  /** Product or context suggestion — not a folder path. */
  target: "mta" | "argus" | "chaos" | "vault" | "other";
  rationale?: string;
};

/**
 * Contract surface — Phase 1: types only.
 * Later: adapters over lib/argus/* without moving ARGUS product code.
 */
export type ArgusEngine = {
  suggestRelations(entryId: string): Promise<LinkSuggestion[]>;
  suggestEntities(text: string): Promise<EntityHint[]>;
  suggestPlacement(entryId: string): Promise<PlacementHint | null>;
};

/** Marker — Argus must not implement MTA temporal responsibilities. */
export const ARGUS_ENGINE_FORBIDDEN = [
  "recurrence",
  "spaced_repetition",
  "attention_scoring",
  "priority_scoring",
  "reminders",
  "longitudinal_stats",
] as const;
