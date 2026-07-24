/**
 * Browser-local Argus graph store (prototype) — CHANGE 24-02.
 * Chaos remains source of content; graph holds units + relations + groups.
 */

import { emptyOrSeedRepo } from "./af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "./af03-repo-types";
import {
  ARGUS_GRAPH_DEMO_FILL,
  ARGUS_GRAPH_STORAGE_KEY,
  type ArgusGraphFilters,
  type ArgusGraphState,
  type ArgusGroup,
  type ArgusRelation,
  type ArgusRelationType,
  type ArgusUnit,
  type ArgusUnitType,
} from "./argus-graph-types";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyGraph(): ArgusGraphState {
  return { version: 2, units: [], relations: [], groups: [], updatedAt: nowIso() };
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

/** Deterministic provisional type from Chaos item — no AI. */
export function inferUnitTypeFromChaos(item: Af03ContentItem): ArgusUnitType {
  if (item.kind === "link" || /^https?:\/\//i.test(item.body.trim()) || /^https?:\/\//i.test(item.title)) {
    return "Source";
  }
  const blob = `${item.title}\n${item.body}`.toLowerCase();
  if (
    /\b(event|meeting|calendar|deadline|due date|appointment|schedule|fecha|reunión|reunion)\b/i.test(
      blob
    ) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(blob) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(blob)
  ) {
    return "Event";
  }
  return "Unknown";
}

function migrateRelationType(raw: string): ArgusRelationType {
  if (
    raw === "related_to" ||
    raw === "belongs_to" ||
    raw === "supports" ||
    raw === "contradicts" ||
    raw === "derived_from"
  ) {
    return raw;
  }
  // v1 generic "link" → related_to
  return "related_to";
}

function migrateUnit(raw: Record<string, unknown>, index: number): ArgusUnit {
  const source = raw.source === "demo" ? "demo" : "chaos";
  const unitType =
    typeof raw.unitType === "string" &&
    ["Note", "Person", "Project", "Topic", "Event", "Source", "Unknown"].includes(raw.unitType)
      ? (raw.unitType as ArgusUnitType)
      : "Unknown";
  const pos = raw.position as { x?: number; y?: number } | undefined;
  return {
    id: typeof raw.id === "string" ? raw.id : newId("unit"),
    chaosItemId: typeof raw.chaosItemId === "string" ? raw.chaosItemId : null,
    chaosDeckId: typeof raw.chaosDeckId === "string" ? raw.chaosDeckId : null,
    label: typeof raw.label === "string" ? raw.label : "Unit",
    kind: typeof raw.kind === "string" ? raw.kind : "unknown",
    preview: typeof raw.preview === "string" ? raw.preview : "",
    source,
    position: {
      x: typeof pos?.x === "number" ? pos.x : gridPosition(index).x,
      y: typeof pos?.y === "number" ? pos.y : gridPosition(index).y,
    },
    unitType,
    typeManual: raw.typeManual === true,
  };
}

/**
 * Migration: v1 → v2
 * - default unitType Unknown, typeManual false
 * - relation type "link" → related_to
 * - groups: []
 * Never clears user data.
 */
export function migrateGraphState(raw: unknown): ArgusGraphState {
  if (!raw || typeof raw !== "object") return emptyGraph();
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.units)) return emptyGraph();

  const units = obj.units.map((u, i) => migrateUnit((u ?? {}) as Record<string, unknown>, i));
  const relations: ArgusRelation[] = Array.isArray(obj.relations)
    ? obj.relations
        .map((r) => {
          const rel = (r ?? {}) as Record<string, unknown>;
          if (typeof rel.sourceUnitId !== "string" || typeof rel.targetUnitId !== "string") return null;
          return {
            id: typeof rel.id === "string" ? rel.id : newId("rel"),
            sourceUnitId: rel.sourceUnitId,
            targetUnitId: rel.targetUnitId,
            type: migrateRelationType(typeof rel.type === "string" ? rel.type : "related_to"),
            createdAt: typeof rel.createdAt === "string" ? rel.createdAt : nowIso(),
          } satisfies ArgusRelation;
        })
        .filter((r): r is ArgusRelation => r !== null)
    : [];

  const groups: ArgusGroup[] = Array.isArray(obj.groups)
    ? obj.groups
        .map((g) => {
          const grp = (g ?? {}) as Record<string, unknown>;
          if (!Array.isArray(grp.memberIds)) return null;
          return {
            id: typeof grp.id === "string" ? grp.id : newId("grp"),
            label: typeof grp.label === "string" ? grp.label : "New group",
            memberIds: grp.memberIds.filter((id): id is string => typeof id === "string"),
            collapsed: grp.collapsed === true,
          } satisfies ArgusGroup;
        })
        .filter((g): g is ArgusGroup => g !== null)
    : [];

  return {
    version: 2,
    units,
    relations,
    groups,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : nowIso(),
  };
}

export function readArgusGraph(): ArgusGraphState {
  if (typeof window === "undefined") return emptyGraph();
  try {
    const raw = localStorage.getItem(ARGUS_GRAPH_STORAGE_KEY);
    if (!raw) return emptyGraph();
    const migrated = migrateGraphState(JSON.parse(raw));
    // Persist upgraded shape so later reads stay on v2
    if (migrated.units.length > 0 || migrated.relations.length > 0 || migrated.groups.length > 0) {
      writeArgusGraph(migrated);
    }
    return migrated;
  } catch {
    return emptyGraph();
  }
}

export function writeArgusGraph(state: ArgusGraphState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ARGUS_GRAPH_STORAGE_KEY,
      JSON.stringify({ ...state, version: 2 as const, updatedAt: nowIso() })
    );
  } catch {
    /* quota */
  }
}

/** Pull all Chaos items into units. No design ceiling. Preserves manual types. */
export function syncUnitsFromChaos(graph: ArgusGraphState, repo?: Af03RepoState): ArgusGraphState {
  const state = repo ?? emptyOrSeedRepo();
  const items = [...state.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const byChaos = new Map(
    graph.units.filter((u) => u.chaosItemId).map((u) => [u.chaosItemId!, u])
  );
  const demoUnits = graph.units.filter((u) => u.source === "demo");

  const chaosUnitsClean: ArgusUnit[] = items.map((item, index) => {
    const prev = byChaos.get(item.id);
    const inferred = inferUnitTypeFromChaos(item);
    if (prev) {
      return {
        id: prev.id,
        chaosItemId: item.id,
        chaosDeckId: item.deckId,
        label: labelOf(item),
        kind: item.kind,
        preview: previewOf(item),
        source: "chaos",
        position: prev.position,
        unitType: prev.typeManual ? prev.unitType : inferred,
        typeManual: prev.typeManual,
      };
    }
    return {
      id: `unit_chaos_${item.id}`,
      chaosItemId: item.id,
      chaosDeckId: item.deckId,
      label: labelOf(item),
      kind: item.kind,
      preview: previewOf(item),
      source: "chaos",
      position: gridPosition(index),
      unitType: inferred,
      typeManual: false,
    };
  });

  const chaosIds = new Set(chaosUnitsClean.map((u) => u.id));
  const keptDemo = demoUnits.filter((d) => !chaosIds.has(d.id));
  const units = [...chaosUnitsClean, ...keptDemo];
  const unitIds = new Set(units.map((u) => u.id));
  const relations = graph.relations.filter(
    (r) => unitIds.has(r.sourceUnitId) && unitIds.has(r.targetUnitId)
  );
  const groups = graph.groups.map((g) => ({
    ...g,
    memberIds: g.memberIds.filter((id) => unitIds.has(id)),
  }));

  const next: ArgusGraphState = {
    version: 2,
    units,
    relations,
    groups,
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

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
      unitType: "Unknown",
      typeManual: false,
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

export function setUnitType(
  graph: ArgusGraphState,
  unitId: string,
  unitType: ArgusUnitType
): ArgusGraphState {
  const next = {
    ...graph,
    units: graph.units.map((u) =>
      u.id === unitId ? { ...u, unitType, typeManual: true } : u
    ),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function addRelation(
  graph: ArgusGraphState,
  sourceUnitId: string,
  targetUnitId: string,
  type: ArgusRelationType = "related_to"
): ArgusGraphState {
  if (sourceUnitId === targetUnitId) return graph;
  const exists = graph.relations.some(
    (r) =>
      r.type === type &&
      ((r.sourceUnitId === sourceUnitId && r.targetUnitId === targetUnitId) ||
        (r.sourceUnitId === targetUnitId && r.targetUnitId === sourceUnitId))
  );
  if (exists) return graph;
  const relation: ArgusRelation = {
    id: newId("rel"),
    sourceUnitId,
    targetUnitId,
    type,
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

export function setRelationType(
  graph: ArgusGraphState,
  relationId: string,
  type: ArgusRelationType
): ArgusGraphState {
  const current = graph.relations.find((r) => r.id === relationId);
  if (!current) return graph;
  const duplicate = graph.relations.some(
    (r) =>
      r.id !== relationId &&
      r.type === type &&
      ((r.sourceUnitId === current.sourceUnitId && r.targetUnitId === current.targetUnitId) ||
        (r.sourceUnitId === current.targetUnitId && r.targetUnitId === current.sourceUnitId))
  );
  if (duplicate) return graph;
  const next = {
    ...graph,
    relations: graph.relations.map((r) => (r.id === relationId ? { ...r, type } : r)),
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

export function createGroupFromMembers(
  graph: ArgusGraphState,
  memberIds: string[],
  label = "New group"
): ArgusGraphState {
  const unique = [...new Set(memberIds)].filter((id) => graph.units.some((u) => u.id === id));
  if (unique.length < 2) return graph;
  const group: ArgusGroup = {
    id: newId("grp"),
    label: label.trim() || "New group",
    memberIds: unique,
    collapsed: false,
  };
  const next = {
    ...graph,
    groups: [...graph.groups, group],
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function renameGroup(graph: ArgusGraphState, groupId: string, label: string): ArgusGraphState {
  const next = {
    ...graph,
    groups: graph.groups.map((g) =>
      g.id === groupId ? { ...g, label: label.trim() || g.label } : g
    ),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function setGroupCollapsed(
  graph: ArgusGraphState,
  groupId: string,
  collapsed: boolean
): ArgusGraphState {
  const next = {
    ...graph,
    groups: graph.groups.map((g) => (g.id === groupId ? { ...g, collapsed } : g)),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

/** Removes group only — units remain. */
export function removeGroup(graph: ArgusGraphState, groupId: string): ArgusGraphState {
  const next = {
    ...graph,
    groups: graph.groups.filter((g) => g.id !== groupId),
    updatedAt: nowIso(),
  };
  writeArgusGraph(next);
  return next;
}

export function clearDemoUnits(graph: ArgusGraphState): ArgusGraphState {
  const units = graph.units.filter((u) => u.source !== "demo");
  const ids = new Set(units.map((u) => u.id));
  const next: ArgusGraphState = {
    ...graph,
    units,
    relations: graph.relations.filter(
      (r) => ids.has(r.sourceUnitId) && ids.has(r.targetUnitId)
    ),
    groups: graph.groups.map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => ids.has(id)),
    })),
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

export function filterUnits(
  graph: ArgusGraphState,
  filters: ArgusGraphFilters
): ArgusUnit[] {
  const relatedIds = new Set<string>();
  for (const r of graph.relations) {
    relatedIds.add(r.sourceUnitId);
    relatedIds.add(r.targetUnitId);
  }

  return graph.units.filter((u) => {
    if (filters.unitType !== "all" && u.unitType !== filters.unitType) return false;
    if (filters.source !== "all" && u.source !== filters.source) return false;
    if (filters.chaosDeckId !== "all" && u.chaosDeckId !== filters.chaosDeckId) return false;
    if (filters.groupId !== "all") {
      const g = graph.groups.find((x) => x.id === filters.groupId);
      if (!g || !g.memberIds.includes(u.id)) return false;
    }
    if (filters.relationPresence === "with" && !relatedIds.has(u.id)) return false;
    if (filters.relationPresence === "without" && relatedIds.has(u.id)) return false;
    return true;
  });
}

/** Units hidden because their group is collapsed (still exist in store). */
export function collapsedHiddenUnitIds(graph: ArgusGraphState): Set<string> {
  const hidden = new Set<string>();
  for (const g of graph.groups) {
    if (g.collapsed) {
      for (const id of g.memberIds) hidden.add(id);
    }
  }
  return hidden;
}

export function groupCentroid(
  graph: ArgusGraphState,
  group: ArgusGroup
): { x: number; y: number } {
  const members = graph.units.filter((u) => group.memberIds.includes(u.id));
  if (members.length === 0) return { x: 80, y: 80 };
  const x = members.reduce((s, u) => s + u.position.x, 0) / members.length;
  const y = members.reduce((s, u) => s + u.position.y, 0) / members.length;
  return { x, y };
}
