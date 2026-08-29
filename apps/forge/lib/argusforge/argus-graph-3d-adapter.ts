/**
 * Argus → react-force-graph-3d adapter.
 * Hybrid spatial layout: organization regions → project clusters → unit relations.
 * Does not alter persisted graph schema; no position3d.
 */

import { forceCollide } from "d3-force-3d";
import type { Af03RepoState } from "./af03-repo-types";
import { getDeck, getFolder } from "./af03-repo-store";
import type { ArgusRelation, ArgusRelationType, ArgusUnit, ArgusUnitType } from "./argus-graph-types";

export type Argus3DLayoutMode = "molecule" | "organizations" | "projects" | "relations";
export type Argus3DFocusMode = "all" | "organization" | "project" | "unit";

export type ArgusGraph3DNode = {
  id: string;
  unit: ArgusUnit;
  organizationId: string;
  projectId: string;
  organizationLabel: string;
  projectLabel: string;
  groupKey: string;
  relationCount: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

export type ArgusGraph3DLink = {
  id: string;
  source: string;
  target: string;
  relation: ArgusRelation;
  crossProject: boolean;
  crossOrganization: boolean;
};

export type ArgusForceGraph3DData = {
  nodes: ArgusGraph3DNode[];
  links: ArgusGraph3DLink[];
};

export type SpatialCenter = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
};

export type Argus3DSpatialModel = {
  orgCenters: Map<string, SpatialCenter>;
  projectCenters: Map<string, SpatialCenter>;
  orgLabels: Map<string, string>;
  projectLabels: Map<string, string>;
};

export type LayoutForceStrengths = {
  org: number;
  project: number;
  charge: number;
  linkInternal: number;
  linkCrossProject: number;
  linkCrossOrg: number;
  linkDistInternal: number;
  linkDistCrossProject: number;
  linkDistCrossOrg: number;
  collide: number;
};

const UNFILED_ORG = "org_unfiled";
const ORPHAN_PROJECT = "project_orphan";
const DEMO_ORG = "org_demo";
const DEMO_PROJECT = "project_demo";

/** Walk folder parents to the root folder id (organization proxy). */
export function rootFolderId(repo: Af03RepoState, folderId: string | null): string | null {
  if (!folderId) return null;
  let current: string | null = folderId;
  let root = folderId;
  const guard = new Set<string>();
  while (current && !guard.has(current)) {
    guard.add(current);
    const folder = getFolder(repo, current);
    if (!folder) break;
    root = folder.id;
    current = folder.parentId;
  }
  return root;
}

/**
 * Hierarchy source:
 * - project ← Chaos deck (`unit.chaosDeckId`)
 * - organization ← root folder of that deck (`deck.folderId` → top parent)
 * Demo / unsynced units fall into demo or unfiled buckets.
 */
export function resolveUnitHierarchy(
  unit: ArgusUnit,
  repo: Af03RepoState | null
): {
  organizationId: string;
  projectId: string;
  organizationLabel: string;
  projectLabel: string;
  groupKey: string;
} {
  if (unit.source === "demo" && !unit.chaosDeckId) {
    return {
      organizationId: DEMO_ORG,
      projectId: DEMO_PROJECT,
      organizationLabel: "Demo",
      projectLabel: "Demo cluster",
      groupKey: `${DEMO_ORG}::${DEMO_PROJECT}`,
    };
  }

  const deckId = unit.chaosDeckId;
  if (!deckId || !repo) {
    return {
      organizationId: UNFILED_ORG,
      projectId: ORPHAN_PROJECT,
      organizationLabel: "Unfiled",
      projectLabel: "No deck",
      groupKey: `${UNFILED_ORG}::${ORPHAN_PROJECT}`,
    };
  }

  const deck = getDeck(repo, deckId);
  const projectLabel = deck?.title ?? deckId;
  const folderRoot = rootFolderId(repo, deck?.folderId ?? null);
  if (folderRoot) {
    const folder = getFolder(repo, folderRoot);
    return {
      organizationId: folderRoot,
      projectId: deckId,
      organizationLabel: folder?.title ?? folderRoot,
      projectLabel,
      groupKey: `${folderRoot}::${deckId}`,
    };
  }

  return {
    organizationId: UNFILED_ORG,
    projectId: deckId,
    organizationLabel: "Unfiled",
    projectLabel,
    groupKey: `${UNFILED_ORG}::${deckId}`,
  };
}

/** Fibonacci-sphere points for organization region centers. */
export function fibonacciSphere(count: number, radius: number): Array<{ x: number; y: number; z: number }> {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, z: 0 }];
  const points: Array<{ x: number; y: number; z: number }> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return points;
}

function projectRingOffset(index: number, total: number, radius: number): { x: number; y: number; z: number } {
  if (total <= 1) return { x: 0, y: 0, z: 0 };
  const angle = (index / total) * Math.PI * 2;
  const elev = ((index % 3) - 1) * (radius * 0.22);
  return {
    x: Math.cos(angle) * radius,
    y: elev,
    z: Math.sin(angle) * radius,
  };
}

export function buildSpatialModel(
  nodes: ArgusGraph3DNode[],
  layout: Argus3DLayoutMode
): Argus3DSpatialModel {
  const orgIds = [...new Set(nodes.map((n) => n.organizationId))].sort();
  const orgRadius =
    layout === "organizations" ? 220 : layout === "relations" ? 90 : layout === "projects" ? 160 : 140;
  const projectRadius =
    layout === "projects" ? 55 : layout === "organizations" ? 28 : layout === "relations" ? 22 : 36;

  const sphere = fibonacciSphere(orgIds.length, orgRadius);
  const orgCenters = new Map<string, SpatialCenter>();
  const orgLabels = new Map<string, string>();

  orgIds.forEach((orgId, index) => {
    const sample = nodes.find((n) => n.organizationId === orgId);
    const label = sample?.organizationLabel ?? orgId;
    orgLabels.set(orgId, label);
    const p = sphere[index] ?? { x: 0, y: 0, z: 0 };
    orgCenters.set(orgId, { id: orgId, label, ...p });
  });

  const projectCenters = new Map<string, SpatialCenter>();
  const projectLabels = new Map<string, string>();
  const projectsByOrg = new Map<string, string[]>();

  for (const node of nodes) {
    projectLabels.set(node.projectId, node.projectLabel);
    const list = projectsByOrg.get(node.organizationId) ?? [];
    if (!list.includes(node.projectId)) list.push(node.projectId);
    projectsByOrg.set(node.organizationId, list);
  }

  for (const [orgId, projectIds] of projectsByOrg) {
    const sorted = [...projectIds].sort();
    const org = orgCenters.get(orgId) ?? { id: orgId, label: orgId, x: 0, y: 0, z: 0 };
    sorted.forEach((projectId, index) => {
      const offset = projectRingOffset(index, sorted.length, projectRadius);
      projectCenters.set(projectId, {
        id: projectId,
        label: projectLabels.get(projectId) ?? projectId,
        x: org.x + offset.x,
        y: org.y + offset.y,
        z: org.z + offset.z,
      });
    });
  }

  return { orgCenters, projectCenters, orgLabels, projectLabels };
}

export function layoutForceStrengths(layout: Argus3DLayoutMode): LayoutForceStrengths {
  switch (layout) {
    case "organizations":
      return {
        org: 0.28,
        project: 0.1,
        charge: -28,
        linkInternal: 0.55,
        linkCrossProject: 0.08,
        linkCrossOrg: 0.03,
        linkDistInternal: 22,
        linkDistCrossProject: 90,
        linkDistCrossOrg: 160,
        collide: 7,
      };
    case "projects":
      return {
        org: 0.12,
        project: 0.26,
        charge: -36,
        linkInternal: 0.5,
        linkCrossProject: 0.1,
        linkCrossOrg: 0.05,
        linkDistInternal: 20,
        linkDistCrossProject: 75,
        linkDistCrossOrg: 130,
        collide: 7,
      };
    case "relations":
      return {
        org: 0.03,
        project: 0.05,
        charge: -48,
        linkInternal: 0.7,
        linkCrossProject: 0.45,
        linkCrossOrg: 0.35,
        linkDistInternal: 28,
        linkDistCrossProject: 40,
        linkDistCrossOrg: 55,
        collide: 6,
      };
    case "molecule":
    default:
      return {
        org: 0.14,
        project: 0.16,
        charge: -34,
        linkInternal: 0.58,
        linkCrossProject: 0.14,
        linkCrossOrg: 0.06,
        linkDistInternal: 24,
        linkDistCrossProject: 70,
        linkDistCrossOrg: 120,
        collide: 7,
      };
  }
}

/** Pull nodes toward a target map (org or project centers). */
export function forceTowardCenters(
  getCenter: (node: ArgusGraph3DNode) => SpatialCenter | undefined,
  strength: number
) {
  let nodes: ArgusGraph3DNode[] = [];
  function force(alpha: number) {
    const k = strength * alpha;
    for (const node of nodes) {
      const target = getCenter(node);
      if (!target) continue;
      node.vx = (node.vx ?? 0) + (target.x - (node.x ?? 0)) * k;
      node.vy = (node.vy ?? 0) + (target.y - (node.y ?? 0)) * k;
      node.vz = (node.vz ?? 0) + (target.z - (node.z ?? 0)) * k;
    }
  }
  force.initialize = (input: ArgusGraph3DNode[]) => {
    nodes = input;
  };
  return force;
}

export function createCollisionForce(radius: number) {
  return forceCollide(radius);
}

export function toForceGraph3DData(
  visibleUnits: ArgusUnit[],
  relations: ArgusRelation[],
  repo: Af03RepoState | null
): ArgusForceGraph3DData {
  const visibleIds = new Set(visibleUnits.map((unit) => unit.id));
  const relationCount = new Map<string, number>();
  for (const relation of relations) {
    if (!visibleIds.has(relation.sourceUnitId) || !visibleIds.has(relation.targetUnitId)) continue;
    relationCount.set(relation.sourceUnitId, (relationCount.get(relation.sourceUnitId) ?? 0) + 1);
    relationCount.set(relation.targetUnitId, (relationCount.get(relation.targetUnitId) ?? 0) + 1);
  }

  const nodes: ArgusGraph3DNode[] = visibleUnits.map((unit) => {
    const hierarchy = resolveUnitHierarchy(unit, repo);
    return {
      id: unit.id,
      unit,
      ...hierarchy,
      relationCount: relationCount.get(unit.id) ?? 0,
    };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links: ArgusGraph3DLink[] = relations
    .filter((relation) => visibleIds.has(relation.sourceUnitId) && visibleIds.has(relation.targetUnitId))
    .map((relation) => {
      const source = byId.get(relation.sourceUnitId);
      const target = byId.get(relation.targetUnitId);
      const crossOrganization = !!source && !!target && source.organizationId !== target.organizationId;
      const crossProject =
        !!source && !!target && (crossOrganization || source.projectId !== target.projectId);
      return {
        id: relation.id,
        source: relation.sourceUnitId,
        target: relation.targetUnitId,
        relation,
        crossProject,
        crossOrganization,
      };
    });

  return { nodes, links };
}

const UNIT_TYPE_COLORS: Record<ArgusUnitType, string> = {
  Note: "#a1a1aa",
  Person: "#818cf8",
  Project: "#34d399",
  Topic: "#fbbf24",
  Event: "#fb7185",
  Source: "#38bdf8",
  Unknown: "#71717a",
};

export function unitTypeColor(type: ArgusUnitType): string {
  return UNIT_TYPE_COLORS[type] ?? UNIT_TYPE_COLORS.Unknown;
}

export function dimHex(hex: string, amount = 0.55): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel * (1 - amount) + 24 * amount);
  const to = (channel: number) => mix(channel).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const DIRECTED_RELATION_TYPES: ReadonlySet<ArgusRelationType> = new Set([
  "supports",
  "contradicts",
  "caused",
  "resulted_in",
  "derived_from",
]);

export function relationIsDirected(type: ArgusRelationType): boolean {
  return DIRECTED_RELATION_TYPES.has(type);
}

export function buildNeighborSets(
  selectedId: string | null,
  relations: ArgusRelation[]
): {
  neighborIds: Set<string>;
  connectedLinkIds: Set<string>;
} {
  const neighborIds = new Set<string>();
  const connectedLinkIds = new Set<string>();
  if (!selectedId) return { neighborIds, connectedLinkIds };

  for (const relation of relations) {
    if (relation.sourceUnitId === selectedId) {
      neighborIds.add(relation.targetUnitId);
      connectedLinkIds.add(relation.id);
    } else if (relation.targetUnitId === selectedId) {
      neighborIds.add(relation.sourceUnitId);
      connectedLinkIds.add(relation.id);
    }
  }
  return { neighborIds, connectedLinkIds };
}

export function buildFocusSets(
  focusMode: Argus3DFocusMode,
  selectedId: string | null,
  nodes: ArgusGraph3DNode[],
  links: ArgusGraph3DLink[],
  focusOrganizationId: string | null,
  focusProjectId: string | null
): {
  highlightNodeIds: Set<string>;
  highlightLinkIds: Set<string>;
} {
  const highlightNodeIds = new Set<string>();
  const highlightLinkIds = new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  if (focusMode === "all" || (!selectedId && !focusOrganizationId && !focusProjectId)) {
    return { highlightNodeIds, highlightLinkIds };
  }

  let orgId = focusOrganizationId;
  let projectId = focusProjectId;
  if (selectedId) {
    const selected = byId.get(selectedId);
    if (selected) {
      if (focusMode === "organization") orgId = selected.organizationId;
      if (focusMode === "project") projectId = selected.projectId;
    }
  }

  if (focusMode === "unit" && selectedId) {
    highlightNodeIds.add(selectedId);
    const { neighborIds, connectedLinkIds } = buildNeighborSets(
      selectedId,
      links.map((l) => l.relation)
    );
    for (const id of neighborIds) highlightNodeIds.add(id);
    for (const id of connectedLinkIds) highlightLinkIds.add(id);
    return { highlightNodeIds, highlightLinkIds };
  }

  if (focusMode === "project" && projectId) {
    for (const node of nodes) {
      if (node.projectId === projectId) highlightNodeIds.add(node.id);
    }
  } else if (focusMode === "organization" && orgId) {
    for (const node of nodes) {
      if (node.organizationId === orgId) highlightNodeIds.add(node.id);
    }
  }

  for (const link of links) {
    const sourceId = typeof link.source === "object" ? (link.source as ArgusGraph3DNode).id : link.source;
    const targetId = typeof link.target === "object" ? (link.target as ArgusGraph3DNode).id : link.target;
    const sourceIn = highlightNodeIds.has(String(sourceId));
    const targetIn = highlightNodeIds.has(String(targetId));
    if (sourceIn && targetIn) {
      highlightLinkIds.add(link.id);
    } else if (sourceIn || targetIn) {
      // Keep cross bridges visible when either end is in focus cluster.
      highlightLinkIds.add(link.id);
      highlightNodeIds.add(String(sourceId));
      highlightNodeIds.add(String(targetId));
    }
  }

  return { highlightNodeIds, highlightLinkIds };
}

export function nodeHasCoords(node: { x?: number; y?: number; z?: number } | null | undefined): boolean {
  if (!node) return false;
  return Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z);
}

export function centroidOfNodes(nodes: ArgusGraph3DNode[]): { x: number; y: number; z: number } | null {
  const withCoords = nodes.filter(nodeHasCoords);
  if (withCoords.length === 0) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const node of withCoords) {
    x += node.x as number;
    y += node.y as number;
    z += node.z as number;
  }
  const n = withCoords.length;
  return { x: x / n, y: y / n, z: z / n };
}
