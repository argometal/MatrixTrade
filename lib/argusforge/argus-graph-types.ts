/**
 * Argus graph prototype — CHANGE 24-02 typed modular controls.
 * NOT definitive Argus Engine schema.
 * Patterns: unit types · named relations · groups · multi-select · filters.
 */

export type ArgusUnitSource = "chaos" | "demo";

/** Provisional unit types — not ontology. */
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

export type ArgusUnit = {
  id: string;
  chaosItemId: string | null;
  chaosDeckId: string | null;
  label: string;
  /** Chaos content kind (text/link/…) — separate from provisional unitType */
  kind: string;
  preview: string;
  source: ArgusUnitSource;
  position: { x: number; y: number };
  /** Provisional Argus type (24-02) */
  unitType: ArgusUnitType;
  /** If true, sync must not overwrite unitType */
  typeManual: boolean;
};

export type ArgusRelationType =
  | "related_to"
  | "belongs_to"
  | "supports"
  | "contradicts"
  | "derived_from";

export const ARGUS_RELATION_TYPES: ArgusRelationType[] = [
  "related_to",
  "belongs_to",
  "supports",
  "contradicts",
  "derived_from",
];

export type ArgusRelation = {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: ArgusRelationType;
  createdAt: string;
};

export type ArgusGroup = {
  id: string;
  label: string;
  memberIds: string[];
  collapsed: boolean;
};

export type ArgusGraphState = {
  /** v2: unitType, typeManual, named relations, groups. Migrates from v1. */
  version: 2;
  units: ArgusUnit[];
  relations: ArgusRelation[];
  groups: ArgusGroup[];
  updatedAt: string;
};

export const ARGUS_GRAPH_STORAGE_KEY = "argusforge-argus-graph-v1";
/** Optional demo fill only — not a Chaos/Argus ceiling. */
export const ARGUS_GRAPH_DEMO_FILL = 24;

export type ArgusGraphFilters = {
  unitType: ArgusUnitType | "all";
  source: ArgusUnitSource | "all";
  chaosDeckId: string | "all";
  groupId: string | "all";
  relationPresence: "all" | "with" | "without";
};
