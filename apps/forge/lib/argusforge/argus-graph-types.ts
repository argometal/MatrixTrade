/**
 * Argus Engine minimal core — CHANGE 24-08.
 * Evidence · identity · tags · typed relations · recurrence · export.
 * NOT definitive Engine schema. Chaos owns source content.
 */

export type ArgusUnitSource = "chaos" | "demo";

/** Provisional display types from 24-02 — kept for filter compat. */
export type ArgusUnitType =
  | "Note"
  | "Person"
  | "Project"
  | "Topic"
  | "Event"
  | "Source"
  | "Unknown";

export const ARGUS_UNIT_TYPES: ArgusUnitType[] = [
  "Note",
  "Person",
  "Project",
  "Topic",
  "Event",
  "Source",
  "Unknown",
];

/** 24-08 evidence kinds — provisional, not ontology expansion. */
export type ArgusEvidenceType =
  | "evidence"
  | "observation"
  | "decision"
  | "pattern"
  | "source"
  | "unknown";

export const ARGUS_EVIDENCE_TYPES: ArgusEvidenceType[] = [
  "evidence",
  "observation",
  "decision",
  "pattern",
  "source",
  "unknown",
];

export type ArgusUnit = {
  id: string;
  label: string;
  preview: string;
  source: ArgusUnitSource;
  /** Chaos deck id (sourceDeckId) */
  chaosDeckId: string | null;
  /** Chaos item id (sourceItemId) */
  chaosItemId: string | null;
  kind: string;
  position: { x: number; y: number };
  unitType: ArgusUnitType;
  typeManual: boolean;
  evidenceType: ArgusEvidenceType;
  evidenceManual: boolean;
  tags: string[];
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ArgusRelationType =
  | "supports"
  | "contradicts"
  | "repeats"
  | "caused"
  | "resulted_in"
  | "derived_from"
  | "related_to";

export const ARGUS_RELATION_TYPES: ArgusRelationType[] = [
  "supports",
  "contradicts",
  "repeats",
  "caused",
  "resulted_in",
  "derived_from",
  "related_to",
];

export type ArgusRelation = {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: ArgusRelationType;
  confirmed: boolean;
  createdAt: string;
};

export type ArgusGroup = {
  id: string;
  label: string;
  memberIds: string[];
  collapsed: boolean;
};

export type ArgusRecurrenceConfidence = "low" | "medium" | "high";

export type ArgusRecurrenceCandidate = {
  id: string;
  unitIds: string[];
  matchingTags: string[];
  matchingTerms: string[];
  reason: string;
  confidence: ArgusRecurrenceConfidence;
  status: "open" | "confirmed" | "dismissed";
  createdAt: string;
};

export type ArgusGraphState = {
  /** v3: evidenceType, tags, confirmation, recurrence, engine relations. */
  version: 3;
  units: ArgusUnit[];
  relations: ArgusRelation[];
  groups: ArgusGroup[];
  recurrence: ArgusRecurrenceCandidate[];
  updatedAt: string;
};

export const ARGUS_GRAPH_STORAGE_KEY = "argusforge-argus-graph-v1";
export const ARGUS_GRAPH_DEMO_FILL = 24;
export const ARGUS_EXPORT_SCHEMA_VERSION = "argus-export-v1";

export type ArgusGraphFilters = {
  unitType: ArgusUnitType | "all";
  evidenceType: ArgusEvidenceType | "all";
  source: ArgusUnitSource | "all";
  chaosDeckId: string | "all";
  groupId: string | "all";
  tag: string | "all";
  relationPresence: "all" | "with" | "without";
};
