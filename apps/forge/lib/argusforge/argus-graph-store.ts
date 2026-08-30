/**
 * Argus Engine store — CHANGE 24-08 minimal core.
 * Migrates v1/v2 → v3 without clearing user data.
 */

import { emptyOrSeedRepo } from "./af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "./af03-repo-types";
import {
  ARGUS_EXPORT_SCHEMA_VERSION,
  ARGUS_GRAPH_DEMO_FILL,
  ARGUS_GRAPH_STORAGE_KEY,
  type ArgusEvidenceType,
  type ArgusGraphFilters,
  type ArgusGraphState,
  type ArgusGroup,
  type ArgusRecurrenceCandidate,
  type ArgusRelation,
  type ArgusRelationType,
  type ArgusUnit,
  type ArgusUnitSource,
  type ArgusUnitType,
} from "./argus-graph-types";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyGraph(): ArgusGraphState {
  return {
    version: 3,
    units: [],
    relations: [],
    groups: [],
    recurrence: [],
    updatedAt: nowIso(),
  };
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

export function normalizeTag(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return t.length ? t : null;
}

export function inferUnitTypeFromChaos(item: Af03ContentItem): ArgusUnitType {
  if (
    item.kind === "link" ||
    /^https?:\/\//i.test(item.body.trim()) ||
    /^https?:\/\//i.test(item.title)
  ) {
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

export function inferEvidenceTypeFromChaos(item: Af03ContentItem): ArgusEvidenceType {
  if (item.kind === "link" || /^https?:\/\//i.test(item.body.trim())) return "source";
  return "unknown";
}

function migrateRelationType(raw: string): ArgusRelationType {
  if (
    raw === "supports" ||
    raw === "contradicts" ||
    raw === "repeats" ||
    raw === "caused" ||
    raw === "resulted_in" ||
    raw === "derived_from" ||
    raw === "related_to"
  ) {
    return raw;
  }
  // v1 link / v2 belongs_to → related_to
  return "related_to";
}

function migrateEvidenceType(raw: unknown, unitType?: string): ArgusEvidenceType {
  if (
    raw === "evidence" ||
    raw === "observation" ||
    raw === "decision" ||
    raw === "pattern" ||
    raw === "source" ||
    raw === "unknown"
  ) {
    return raw;
  }
  if (unitType === "Source") return "source";
  if (unitType === "Event") return "observation";
  return "unknown";
}

function migrateUnit(raw: Record<string, unknown>, index: number): ArgusUnit {
  const source = raw.source === "demo" ? "demo" : "chaos";
  const unitType =
    typeof raw.unitType === "string" &&
    ["Note", "Person", "Project", "Topic", "Event", "Source", "Unknown"].includes(raw.unitType)
      ? (raw.unitType as ArgusUnitType)
      : "Unknown";
  const pos = raw.position as { x?: number; y?: number } | undefined;
  const t = nowIso();
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = [
    ...new Set(
      tagsRaw
        .map((x) => (typeof x === "string" ? normalizeTag(x) : null))
        .filter((x): x is string => !!x)
    ),
  ];
  return {
    id: typeof raw.id === "string" ? raw.id : newId("unit"),
    chaosItemId:
      typeof raw.chaosItemId === "string"
        ? raw.chaosItemId
        : typeof raw.sourceItemId === "string"
          ? raw.sourceItemId
          : null,
    chaosDeckId:
      typeof raw.chaosDeckId === "string"
        ? raw.chaosDeckId
        : typeof raw.sourceDeckId === "string"
          ? raw.sourceDeckId
          : null,
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
    evidenceType: migrateEvidenceType(raw.evidenceType, unitType),
    evidenceManual: raw.evidenceManual === true,
    tags,
    confirmed: raw.confirmed === true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : t,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : t,
  };
}

/** Safe migration v1/v2 → v3. Never clears user data. */
export function migrateGraphState(raw: unknown): ArgusGraphState {
  if (!raw || typeof raw !== "object") return emptyGraph();
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.units)) return emptyGraph();

  const units = obj.units.map((u, i) => migrateUnit((u ?? {}) as Record<string, unknown>, i));
  const relations: ArgusRelation[] = Array.isArray(obj.relations)
    ? obj.relations
        .map((r) => {
          const rel = (r ?? {}) as Record<string, unknown>;
          if (typeof rel.sourceUnitId !== "string" || typeof rel.targetUnitId !== "string") {
            return null;
          }
          return {
            id: typeof rel.id === "string" ? rel.id : newId("rel"),
            sourceUnitId: rel.sourceUnitId,
            targetUnitId: rel.targetUnitId,
            type: migrateRelationType(typeof rel.type === "string" ? rel.type : "related_to"),
            confirmed: rel.confirmed === true,
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

  const recurrence: ArgusRecurrenceCandidate[] = Array.isArray(obj.recurrence)
    ? obj.recurrence
        .map((c) => {
          const cand = (c ?? {}) as Record<string, unknown>;
          if (!Array.isArray(cand.unitIds)) return null;
          const status =
            cand.status === "confirmed" || cand.status === "dismissed" ? cand.status : "open";
          const confidence =
            cand.confidence === "high" || cand.confidence === "medium" ? cand.confidence : "low";
          return {
            id: typeof cand.id === "string" ? cand.id : newId("rec"),
            unitIds: cand.unitIds.filter((id): id is string => typeof id === "string"),
            matchingTags: Array.isArray(cand.matchingTags)
              ? cand.matchingTags.filter((t): t is string => typeof t === "string")
              : [],
            matchingTerms: Array.isArray(cand.matchingTerms)
              ? cand.matchingTerms.filter((t): t is string => typeof t === "string")
              : [],
            reason: typeof cand.reason === "string" ? cand.reason : "match",
            confidence,
            status,
            createdAt: typeof cand.createdAt === "string" ? cand.createdAt : nowIso(),
          } satisfies ArgusRecurrenceCandidate;
        })
        .filter((c): c is ArgusRecurrenceCandidate => c !== null)
    : [];

  return {
    version: 3,
    units,
    relations,
    groups,
    recurrence,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : nowIso(),
  };
}

export function readArgusGraph(): ArgusGraphState {
  if (typeof window === "undefined") return emptyGraph();
  try {
    const raw = localStorage.getItem(ARGUS_GRAPH_STORAGE_KEY);
    if (!raw) return emptyGraph();
    const migrated = migrateGraphState(JSON.parse(raw));
    if (migrated.units.length || migrated.relations.length || migrated.groups.length) {
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
      JSON.stringify({ ...state, version: 3 as const, updatedAt: nowIso() })
    );
  } catch {
    /* quota */
  }
}

export function syncUnitsFromChaos(graph: ArgusGraphState, repo?: Af03RepoState): ArgusGraphState {
  const state = repo ?? emptyOrSeedRepo();
  const items = [...state.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const byChaos = new Map(
    graph.units.filter((u) => u.chaosItemId).map((u) => [u.chaosItemId!, u])
  );
  const demoUnits = graph.units.filter((u) => u.source === "demo");
  const t = nowIso();

  const chaosUnits: ArgusUnit[] = items.map((item, index) => {
    const prev = byChaos.get(item.id);
    const inferredUnit = inferUnitTypeFromChaos(item);
    const inferredEv = inferEvidenceTypeFromChaos(item);
    if (prev) {
      return {
        ...prev,
        chaosItemId: item.id,
        chaosDeckId: item.deckId,
        label: labelOf(item),
        kind: item.kind,
        preview: previewOf(item),
        source: "chaos",
        unitType: prev.typeManual ? prev.unitType : inferredUnit,
        evidenceType: prev.evidenceManual ? prev.evidenceType : inferredEv,
        updatedAt: t,
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
      unitType: inferredUnit,
      typeManual: false,
      evidenceType: inferredEv,
      evidenceManual: false,
      tags: [],
      confirmed: false,
      createdAt: t,
      updatedAt: t,
    };
  });

  const chaosIds = new Set(chaosUnits.map((u) => u.id));
  const keptDemo = demoUnits.filter((d) => !chaosIds.has(d.id));
  const units = [...chaosUnits, ...keptDemo];
  const unitIds = new Set(units.map((u) => u.id));
  const next: ArgusGraphState = {
    ...graph,
    version: 3,
    units,
    relations: graph.relations.filter(
      (r) => unitIds.has(r.sourceUnitId) && unitIds.has(r.targetUnitId)
    ),
    groups: graph.groups.map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => unitIds.has(id)),
    })),
    recurrence: graph.recurrence,
    updatedAt: t,
  };
  writeArgusGraph(next);
  return next;
}

export function ensureDemoUnits(graph: ArgusGraphState): ArgusGraphState {
  if (graph.units.length >= ARGUS_GRAPH_DEMO_FILL) return graph;
  const units = [...graph.units];
  const t = nowIso();
  let i = units.length;
  while (units.length < ARGUS_GRAPH_DEMO_FILL) {
    units.push({
      id: newId("unit_demo"),
      chaosItemId: null,
      chaosDeckId: null,
      label: `Demo unit ${i + 1}`,
      kind: "demo",
      preview: "Prototype unit — not Chaos source.",
      source: "demo",
      position: gridPosition(i),
      unitType: "Unknown",
      typeManual: false,
      evidenceType: "unknown",
      evidenceManual: false,
      tags: [],
      confirmed: false,
      createdAt: t,
      updatedAt: t,
    });
    i += 1;
  }
  const next = { ...graph, units, updatedAt: t };
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
    units: graph.units.map((u) =>
      u.id === unitId ? { ...u, position, updatedAt: nowIso() } : u
    ),
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
      u.id === unitId ? { ...u, unitType, typeManual: true, updatedAt: nowIso() } : u
    ),
  };
  writeArgusGraph(next);
  return next;
}

export function setEvidenceType(
  graph: ArgusGraphState,
  unitId: string,
  evidenceType: ArgusEvidenceType
): ArgusGraphState {
  const next = {
    ...graph,
    units: graph.units.map((u) =>
      u.id === unitId
        ? { ...u, evidenceType, evidenceManual: true, updatedAt: nowIso() }
        : u
    ),
  };
  writeArgusGraph(next);
  return next;
}

export function setUnitConfirmed(
  graph: ArgusGraphState,
  unitId: string,
  confirmed: boolean
): ArgusGraphState {
  const next = {
    ...graph,
    units: graph.units.map((u) =>
      u.id === unitId ? { ...u, confirmed, updatedAt: nowIso() } : u
    ),
  };
  writeArgusGraph(next);
  return next;
}

export function addTagToUnit(graph: ArgusGraphState, unitId: string, raw: string): ArgusGraphState {
  const tag = normalizeTag(raw);
  if (!tag) return graph;
  const next = {
    ...graph,
    units: graph.units.map((u) => {
      if (u.id !== unitId) return u;
      if (u.tags.includes(tag)) return u;
      return { ...u, tags: [...u.tags, tag], updatedAt: nowIso() };
    }),
  };
  writeArgusGraph(next);
  return next;
}

export function removeTagFromUnit(
  graph: ArgusGraphState,
  unitId: string,
  tag: string
): ArgusGraphState {
  const next = {
    ...graph,
    units: graph.units.map((u) =>
      u.id === unitId
        ? { ...u, tags: u.tags.filter((t) => t !== tag), updatedAt: nowIso() }
        : u
    ),
  };
  writeArgusGraph(next);
  return next;
}

export function addTagToUnits(
  graph: ArgusGraphState,
  unitIds: string[],
  raw: string
): ArgusGraphState {
  const tag = normalizeTag(raw);
  if (!tag) return graph;
  const set = new Set(unitIds);
  const next = {
    ...graph,
    units: graph.units.map((u) => {
      if (!set.has(u.id) || u.tags.includes(tag)) return u;
      return { ...u, tags: [...u.tags, tag], updatedAt: nowIso() };
    }),
  };
  writeArgusGraph(next);
  return next;
}

export function addRelation(
  graph: ArgusGraphState,
  sourceUnitId: string,
  targetUnitId: string,
  type: ArgusRelationType = "related_to",
  confirmed = true
): ArgusGraphState {
  if (sourceUnitId === targetUnitId) return graph;
  const exists = graph.relations.some(
    (r) =>
      r.type === type &&
      r.sourceUnitId === sourceUnitId &&
      r.targetUnitId === targetUnitId
  );
  if (exists) return graph;
  const relation: ArgusRelation = {
    id: newId("rel"),
    sourceUnitId,
    targetUnitId,
    type,
    confirmed,
    createdAt: nowIso(),
  };
  const next = { ...graph, relations: [...graph.relations, relation] };
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
      r.sourceUnitId === current.sourceUnitId &&
      r.targetUnitId === current.targetUnitId
  );
  if (duplicate) return graph;
  const next = {
    ...graph,
    relations: graph.relations.map((r) => (r.id === relationId ? { ...r, type } : r)),
  };
  writeArgusGraph(next);
  return next;
}

export function setRelationConfirmed(
  graph: ArgusGraphState,
  relationId: string,
  confirmed: boolean
): ArgusGraphState {
  const next = {
    ...graph,
    relations: graph.relations.map((r) => (r.id === relationId ? { ...r, confirmed } : r)),
  };
  writeArgusGraph(next);
  return next;
}

export function removeRelation(graph: ArgusGraphState, relationId: string): ArgusGraphState {
  const next = {
    ...graph,
    relations: graph.relations.filter((r) => r.id !== relationId),
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
  const next = { ...graph, groups: [...graph.groups, group] };
  writeArgusGraph(next);
  return next;
}

export function renameGroup(graph: ArgusGraphState, groupId: string, label: string): ArgusGraphState {
  const next = {
    ...graph,
    groups: graph.groups.map((g) =>
      g.id === groupId ? { ...g, label: label.trim() || g.label } : g
    ),
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
  };
  writeArgusGraph(next);
  return next;
}

export function removeGroup(graph: ArgusGraphState, groupId: string): ArgusGraphState {
  const next = { ...graph, groups: graph.groups.filter((g) => g.id !== groupId) };
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
  };
  writeArgusGraph(next);
  return next;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "have",
  "been",
  "were",
  "are",
  "was",
  "not",
  "but",
  "you",
  "your",
  "into",
  "about",
  "unit",
  "demo",
  "chaos",
  "http",
  "https",
  "www",
]);

function significantTerms(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñü\s-]/gi, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !STOP.has(w))
    ),
  ];
}

/** Deterministic recurrence scan — no AI, no auto relations. */
export function scanRecurrence(graph: ArgusGraphState): ArgusGraphState {
  const dismissed = new Set(
    graph.recurrence.filter((c) => c.status === "dismissed").map((c) => c.unitIds.slice().sort().join("|"))
  );
  const confirmedKeys = new Set(
    graph.recurrence.filter((c) => c.status === "confirmed").map((c) => c.unitIds.slice().sort().join("|"))
  );
  const kept = graph.recurrence.filter((c) => c.status !== "open");
  const candidates: ArgusRecurrenceCandidate[] = [...kept];
  const seen = new Set([...dismissed, ...confirmedKeys]);

  const byTag = new Map<string, string[]>();
  for (const u of graph.units) {
    for (const tag of u.tags) {
      const list = byTag.get(tag) ?? [];
      list.push(u.id);
      byTag.set(tag, list);
    }
  }
  for (const [tag, ids] of byTag) {
    if (ids.length < 2) continue;
    const key = [...ids].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      id: newId("rec"),
      unitIds: [...ids],
      matchingTags: [tag],
      matchingTerms: [],
      reason: `Shared tag “${tag}”`,
      confidence: ids.length >= 3 ? "high" : "medium",
      status: "open",
      createdAt: nowIso(),
    });
  }

  for (let i = 0; i < graph.units.length; i++) {
    for (let j = i + 1; j < graph.units.length; j++) {
      const a = graph.units[i]!;
      const b = graph.units[j]!;
      const ta = significantTerms(`${a.label} ${a.preview}`);
      const tb = significantTerms(`${b.label} ${b.preview}`);
      const shared = ta.filter((t) => tb.includes(t));
      if (shared.length < 2) continue;
      const key = [a.id, b.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        id: newId("rec"),
        unitIds: [a.id, b.id],
        matchingTags: [],
        matchingTerms: shared.slice(0, 6),
        reason: `Shared terms: ${shared.slice(0, 4).join(", ")}`,
        confidence: shared.length >= 4 ? "high" : shared.length >= 3 ? "medium" : "low",
        status: "open",
        createdAt: nowIso(),
      });
    }
  }

  for (const r of graph.relations.filter((x) => x.type === "repeats")) {
    const key = [r.sourceUnitId, r.targetUnitId].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      id: newId("rec"),
      unitIds: [r.sourceUnitId, r.targetUnitId],
      matchingTags: [],
      matchingTerms: [],
      reason: "Explicit repeats relation",
      confidence: "high",
      status: "open",
      createdAt: nowIso(),
    });
  }

  const next = { ...graph, recurrence: candidates };
  writeArgusGraph(next);
  return next;
}

export function dismissRecurrence(
  graph: ArgusGraphState,
  candidateId: string
): ArgusGraphState {
  const next = {
    ...graph,
    recurrence: graph.recurrence.map((c) =>
      c.id === candidateId ? { ...c, status: "dismissed" as const } : c
    ),
  };
  writeArgusGraph(next);
  return next;
}

/** Confirm candidate and create repeats relations between first and others (user action). */
export function confirmRecurrence(
  graph: ArgusGraphState,
  candidateId: string
): ArgusGraphState {
  const cand = graph.recurrence.find((c) => c.id === candidateId);
  if (!cand || cand.unitIds.length < 2) return graph;
  let next: ArgusGraphState = {
    ...graph,
    recurrence: graph.recurrence.map((c) =>
      c.id === candidateId ? { ...c, status: "confirmed" as const } : c
    ),
  };
  const [first, ...rest] = cand.unitIds;
  for (const other of rest) {
    next = addRelation(next, first!, other, "repeats", true);
  }
  writeArgusGraph(next);
  return next;
}

export function createRepeatsFromCandidate(
  graph: ArgusGraphState,
  candidateId: string
): ArgusGraphState {
  return confirmRecurrence(graph, candidateId);
}

export function bootstrapArgusGraph(): ArgusGraphState {
  let g = readArgusGraph();
  if (g.units.length === 0) {
    g = syncUnitsFromChaos(g);
    g = ensureDemoUnits(g);
  }
  return g;
}

export function filterUnits(graph: ArgusGraphState, filters: ArgusGraphFilters): ArgusUnit[] {
  const relatedIds = new Set<string>();
  for (const r of graph.relations) {
    relatedIds.add(r.sourceUnitId);
    relatedIds.add(r.targetUnitId);
  }
  return graph.units.filter((u) => {
    if (filters.unitType !== "all" && u.unitType !== filters.unitType) return false;
    if (filters.evidenceType !== "all" && u.evidenceType !== filters.evidenceType) return false;
    if (filters.source !== "all" && u.source !== filters.source) return false;
    if (filters.chaosDeckId !== "all" && u.chaosDeckId !== filters.chaosDeckId) return false;
    if (filters.groupId !== "all") {
      const g = graph.groups.find((x) => x.id === filters.groupId);
      if (!g || !g.memberIds.includes(u.id)) return false;
    }
    if (filters.tag !== "all" && !u.tags.includes(filters.tag)) return false;
    if (filters.relationPresence === "with" && !relatedIds.has(u.id)) return false;
    if (filters.relationPresence === "without" && relatedIds.has(u.id)) return false;
    return true;
  });
}

export function collapsedHiddenUnitIds(graph: ArgusGraphState): Set<string> {
  const hidden = new Set<string>();
  for (const g of graph.groups) {
    if (g.collapsed) for (const id of g.memberIds) hidden.add(id);
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

export function allTags(graph: ArgusGraphState): string[] {
  return [...new Set(graph.units.flatMap((u) => u.tags))].sort();
}

export type ArgusExportPayload = {
  schemaVersion: string;
  exportedAt: string;
  units: Array<{
    id: string;
    label: string;
    preview: string;
    tags: string[];
    evidenceType: ArgusEvidenceType;
    confirmed: boolean;
    source: ArgusUnitSource;
    sourceDeckId: string | null;
    sourceItemId: string | null;
  }>;
  relations: Array<{
    id: string;
    sourceUnitId: string;
    targetUnitId: string;
    type: ArgusRelationType;
    confirmed: boolean;
  }>;
  recurrenceConfirmations: ArgusRecurrenceCandidate[];
};

export function buildExportPayload(
  graph: ArgusGraphState,
  unitIds?: string[] | null
): ArgusExportPayload {
  const set = unitIds && unitIds.length ? new Set(unitIds) : null;
  const units = graph.units.filter((u) => !set || set.has(u.id));
  const ids = new Set(units.map((u) => u.id));
  const relations = graph.relations.filter(
    (r) => ids.has(r.sourceUnitId) && ids.has(r.targetUnitId)
  );
  const recurrenceConfirmations = graph.recurrence.filter(
    (c) =>
      c.status === "confirmed" &&
      c.unitIds.every((id) => ids.has(id))
  );
  return {
    schemaVersion: ARGUS_EXPORT_SCHEMA_VERSION,
    exportedAt: nowIso(),
    units: units.map((u) => ({
      id: u.id,
      label: u.label,
      preview: u.preview,
      tags: u.tags,
      evidenceType: u.evidenceType,
      confirmed: u.confirmed,
      source: u.source,
      sourceDeckId: u.chaosDeckId,
      sourceItemId: u.chaosItemId,
    })),
    relations: relations.map((r) => ({
      id: r.id,
      sourceUnitId: r.sourceUnitId,
      targetUnitId: r.targetUnitId,
      type: r.type,
      confirmed: r.confirmed,
    })),
    recurrenceConfirmations,
  };
}

export function exportJsonString(graph: ArgusGraphState, unitIds?: string[] | null): string {
  return JSON.stringify(buildExportPayload(graph, unitIds), null, 2);
}

export function exportMarkdownString(
  graph: ArgusGraphState,
  unitIds?: string[] | null
): string {
  const payload = buildExportPayload(graph, unitIds);
  const byId = new Map(payload.units.map((u) => [u.id, u]));
  const lines: string[] = [
    `# Argus export`,
    ``,
    `- schema: ${payload.schemaVersion}`,
    `- exported: ${payload.exportedAt}`,
    `- units: ${payload.units.length}`,
    `- relations: ${payload.relations.length}`,
    ``,
    `## Evidence`,
    ``,
  ];
  for (const u of payload.units) {
    lines.push(`### ${u.label}`);
    lines.push(`- evidenceType: ${u.evidenceType}`);
    lines.push(`- confirmed: ${u.confirmed ? "yes" : "provisional"}`);
    lines.push(`- tags: ${u.tags.length ? u.tags.join(", ") : "(none)"}`);
    lines.push(`- preview: ${u.preview || "(empty)"}`);
    lines.push(
      `- source: ${u.source}` +
        (u.sourceItemId ? ` · item ${u.sourceItemId}` : "") +
        (u.sourceDeckId ? ` · deck ${u.sourceDeckId}` : "")
    );
    if (u.evidenceType === "decision" || u.evidenceType === "pattern") {
      lines.push(`- note: confirmed ${u.evidenceType}`);
    }
    lines.push(``);
  }
  lines.push(`## Relations`, ``);
  for (const r of payload.relations) {
    const a = byId.get(r.sourceUnitId)?.label ?? r.sourceUnitId;
    const b = byId.get(r.targetUnitId)?.label ?? r.targetUnitId;
    lines.push(`- ${a} —${r.type}${r.confirmed ? "" : " (provisional)"}→ ${b}`);
  }
  lines.push(``, `## Recurrence`, ``);
  if (payload.recurrenceConfirmations.length === 0) {
    lines.push(`(none confirmed)`);
  } else {
    for (const c of payload.recurrenceConfirmations) {
      const names = c.unitIds.map((id) => byId.get(id)?.label ?? id).join(", ");
      lines.push(`- ${c.confidence}: ${c.reason} · ${names}`);
    }
  }
  lines.push(``);
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
