/**
 * Browser-local Argus graph store (prototype).
 * Chaos remains source of content; graph holds units + relations + positions.
 */

import { emptyOrSeedRepo } from "./af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "./af03-repo-types";
import {
  ARGUS_GRAPH_DEMO_FILL,
  ARGUS_GRAPH_STORAGE_KEY,
  type ArgusGraphState,
  type ArgusRelation,
  type ArgusUnit,
} from "./argus-graph-types";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyGraph(): ArgusGraphState {
  return { version: 1, units: [], relations: [], updatedAt: nowIso() };
}

function gridPosition(index: number): { x: number; y: number } {
  const cols = 6;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 40 + col * 180, y: 40 + row * 110 };
}

function previewOf(item: Af03ContentItem): string {
  const raw = (item.title || item.body || item.kind).replace(/\s+/g, " ").trim();
  return raw.slice(0, 96);
}

function labelOf(item: Af03ContentItem): string {
  const t = item.title.trim();
  if (t) return t.slice(0, 48);
  const b = item.body.trim().split("\n")[0] || item.kind;
  return b.slice(0, 48);
}

export function readArgusGraph(): ArgusGraphState {
  if (typeof window === "undefined") return emptyGraph();
  try {
    const raw = localStorage.getItem(ARGUS_GRAPH_STORAGE_KEY);
    if (!raw) return emptyGraph();
    const parsed = JSON.parse(raw) as ArgusGraphState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.units)) return emptyGraph();
    return parsed;
  } catch {
    return emptyGraph();
  }
}

export function writeArgusGraph(state: ArgusGraphState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ARGUS_GRAPH_STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: nowIso() })
    );
  } catch {
    /* quota */
  }
}

/** Pull all Chaos items into units. Keeps positions/relations for existing chaos ids. No design ceiling. */
export function syncUnitsFromChaos(graph: ArgusGraphState, repo?: Af03RepoState): ArgusGraphState {
  const state = repo ?? emptyOrSeedRepo();
  const items = [...state.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const byChaos = new Map(
    graph.units.filter((u) => u.chaosItemId).map((u) => [u.chaosItemId!, u])
  );
  const demoUnits = graph.units.filter((u) => u.source === "demo");

  const chaosUnits: ArgusUnit[] = items.map((item, index) => {
    const prev = byChaos.get(item.id);
    return {
      id: prev?.id ?? `unit_chaos_${item.id}`,
      chaosItemId: item.id,
      chaosDeckId: item.deckId,
      label: labelOf(item),
      kind: item.kind,
      preview: previewOf(item),
      source: "chaos",
      position: prev?.position ?? gridPosition(index),
    };
  });

  const chaosIds = new Set(chaosUnits.map((u) => u.id));
  const keptDemo = demoUnits.filter((d) => !chaosIds.has(d.id));
  const units = [...chaosUnits, ...keptDemo];
  const unitIds = new Set(units.map((u) => u.id));
  const relations = graph.relations.filter(
    (r) => unitIds.has(r.sourceUnitId) && unitIds.has(r.targetUnitId)
  );

  const next = { version: 1 as const, units, relations, updatedAt: nowIso() };
  writeArgusGraph(next);
  return next;
}

/** Optional demo units for field practice when Chaos is empty — not a product ceiling. */
export function ensureDemoUnits(graph: ArgusGraphState): ArgusGraphState {
  if (graph.units.length >= ARGUS_GRAPH_DEMO_FILL) return graph;
  const units = [...graph.units];
  let i = units.length;
  while (units.length < ARGUS_GRAPH_DEMO_FILL) {
    units.push({
      id: newId("unit_demo"),
      chaosItemId: null,
      chaosDeckId: null,
      label: `Demo unit ${i + 1}`,
      kind: "demo",
      preview: "Prototype unit — not Chaos source. For selection/relation practice only.",
      source: "demo",
      position: gridPosition(i),
    });
    i += 1;
  }
  const next = { ...graph, units, updatedAt: nowIso() };
  writeArgusGraph(next);
  return next;
}

export function updateUnitPosition(
  graph: ArgusGraphState,
  unitId: string,
  position: { x: number; y: number }
): ArgusGraphState {
  const next = {
    ...graph,
    units: graph.units.map((u) => (u.id === unitId ? { ...u, position } : u)),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function addRelation(
  graph: ArgusGraphState,
  sourceUnitId: string,
  targetUnitId: string
): ArgusGraphState {
  if (sourceUnitId === targetUnitId) return graph;
  const exists = graph.relations.some(
    (r) =>
      (r.sourceUnitId === sourceUnitId && r.targetUnitId === targetUnitId) ||
      (r.sourceUnitId === targetUnitId && r.targetUnitId === sourceUnitId)
  );
  if (exists) return graph;
  const relation: ArgusRelation = {
    id: newId("rel"),
    sourceUnitId,
    targetUnitId,
    type: "link",
    createdAt: nowIso(),
  };
  const next = {
    ...graph,
    relations: [...graph.relations, relation],
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function removeRelation(graph: ArgusGraphState, relationId: string): ArgusGraphState {
  const next = {
    ...graph,
    relations: graph.relations.filter((r) => r.id !== relationId),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function clearDemoUnits(graph: ArgusGraphState): ArgusGraphState {
  const units = graph.units.filter((u) => u.source !== "demo");
  const ids = new Set(units.map((u) => u.id));
  const next = {
    ...graph,
    units,
    relations: graph.relations.filter(
      (r) => ids.has(r.sourceUnitId) && ids.has(r.targetUnitId)
    ),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function bootstrapArgusGraph(): ArgusGraphState {
  let g = readArgusGraph();
  if (g.units.length === 0) {
    g = syncUnitsFromChaos(g);
    g = ensureDemoUnits(g);
  }
  return g;
}
