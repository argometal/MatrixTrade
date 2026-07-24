/**
 * Argus graph prototype — NOT definitive Argus Engine schema (Phase 0).
 * Patterns only: identifiable unit · visible relation · operable selection.
 * Source content stays in Chaos (AF03); this store is the graph layer.
 */

export type ArgusUnitSource = "chaos" | "demo";

export type ArgusUnit = {
  id: string;
  /** Stable link to AF03 Chaos content when source === "chaos" */
  chaosItemId: string | null;
  chaosDeckId: string | null;
  label: string;
  kind: string;
  preview: string;
  source: ArgusUnitSource;
  position: { x: number; y: number };
};

/** Single provisional edge type — not the final relation ontology. */
export type ArgusRelationType = "link";

export type ArgusRelation = {
  id: string;
  sourceUnitId: string;
  targetUnitId: string;
  type: ArgusRelationType;
  createdAt: string;
};

export type ArgusGraphState = {
  version: 1;
  units: ArgusUnit[];
  relations: ArgusRelation[];
  updatedAt: string;
};

export const ARGUS_GRAPH_STORAGE_KEY = "argusforge-argus-graph-v1";
/** Optional demo fill only — not a Chaos/Argus ceiling. */
export const ARGUS_GRAPH_DEMO_FILL = 24;
