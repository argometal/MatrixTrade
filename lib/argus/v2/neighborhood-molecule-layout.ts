/**
 * Experimental Molecule layout for ARGUS neighborhood graphs.
 *
 * Same nodes + edges as Radial — only positions change.
 * Uses existing edge weights: linked=2, co-mentioned=1, focus-affinity=0.5.
 * Inspired by Forge forceTowardCenters / unequal link strengths (ideas only).
 */
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force-3d";
import type { V2GraphEdge, V2GraphNode } from "./intelligence-viz";
import {
  degreeLinkLengthExtra,
  layoutNeighborhoodGraphNodes,
  neighborhoodDegreeMap,
} from "./intelligence-viz";

export type NeighborhoodLayoutMode = "radial" | "molecule";

type SimNode = V2GraphNode & {
  vx?: number;
  vy?: number;
  vz?: number;
  z?: number;
};

type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  weight: number;
  kind?: V2GraphEdge["kind"];
};

/** Preferred link distance from existing evidence edge weight (base). */
export function moleculeLinkDistance(weight: number): number {
  if (weight >= 2) return 14; // linked — tight molecule bond
  if (weight >= 1) return 26; // co-mentioned
  return 42; // focus-affinity — weak / longer
}

/** Weight base + extra length when either endpoint is a high-degree hub. */
export function moleculeLinkDistanceForDegrees(
  weight: number,
  degreeA: number,
  degreeB: number
): number {
  return moleculeLinkDistance(weight) + degreeLinkLengthExtra(degreeA, degreeB);
}

/** Link spring strength from weight (stronger in-community pull). */
export function moleculeLinkStrength(weight: number): number {
  if (weight >= 2) return 0.85;
  if (weight >= 1) return 0.4;
  return 0.12;
}

/**
 * Short cooled 2D force layout (z pinned). Deterministic enough for A/B review.
 * Does not mutate the input arrays.
 */
export function layoutNeighborhoodMoleculeNodes(
  nodes: V2GraphNode[],
  edges: V2GraphEdge[],
  centerId: string,
  options: { iterations?: number } = {}
): V2GraphNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return nodes.map((n) => ({ ...n, x: 50, y: 50 }));
  }

  const iterations = options.iterations ?? 280;
  const degrees = neighborhoodDegreeMap(edges);

  // Seed from radial (degree-aware) so the sim starts from a stable ARGUS arrangement.
  const seeded = layoutNeighborhoodGraphNodes(nodes, centerId, edges);
  const simNodes: SimNode[] = seeded.map((n) => ({
    ...n,
    z: 0,
    vz: 0,
    vx: 0,
    vy: 0,
  }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));

  const simLinks: SimLink[] = edges
    .filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to)
    .map((e) => ({
      source: e.from,
      target: e.to,
      weight: e.weight,
      kind: e.kind,
    }));

  const linkForce = forceLink<SimNode, SimLink>(simLinks)
    .id((d) => d.id)
    .distance((d) => {
      const sourceId = typeof d.source === "string" ? d.source : d.source.id;
      const targetId = typeof d.target === "string" ? d.target : d.target.id;
      return moleculeLinkDistanceForDegrees(
        d.weight,
        degrees.get(sourceId) ?? 1,
        degrees.get(targetId) ?? 1
      );
    })
    .strength((d) => moleculeLinkStrength(d.weight));

  const simulation = forceSimulation<SimNode>(simNodes)
    .force("link", linkForce)
    .force("charge", forceManyBody<SimNode>().strength(-48).distanceMax(70))
    .force("collide", forceCollide<SimNode>().radius(5.5).strength(0.85))
    .force("center", forceCenter(50, 50, 0).strength(0.06))
    .force("x", forceX(50).strength(0.02))
    .force("y", forceY(50).strength(0.02))
    .stop();

  // Weak structural parent pulls: Orgs / Projects act as soft community anchors
  // for nodes they already have a `linked` edge to — no new ontology.
  const orgIds = new Set(simNodes.filter((n) => n.kind === "organization").map((n) => n.id));
  const projectIds = new Set(simNodes.filter((n) => n.kind === "project").map((n) => n.id));
  const linkedPairs = edges.filter((e) => e.kind === "linked" || e.weight >= 2);

  function forceTowardParents(alpha: number) {
    const kOrg = 0.08 * alpha;
    const kProj = 0.06 * alpha;
    for (const edge of linkedPairs) {
      const a = byId.get(edge.from);
      const b = byId.get(edge.to);
      if (!a || !b) continue;
      const pull = (child: SimNode, parent: SimNode, k: number) => {
        child.vx = (child.vx ?? 0) + (parent.x - child.x) * k;
        child.vy = (child.vy ?? 0) + (parent.y - child.y) * k;
      };
      if (orgIds.has(a.id) && !orgIds.has(b.id)) pull(b, a, kOrg);
      if (orgIds.has(b.id) && !orgIds.has(a.id)) pull(a, b, kOrg);
      if (projectIds.has(a.id) && !projectIds.has(b.id) && !orgIds.has(b.id)) pull(b, a, kProj);
      if (projectIds.has(b.id) && !projectIds.has(a.id) && !orgIds.has(a.id)) pull(a, b, kProj);
    }
  }
  (forceTowardParents as { initialize?: (nodes: SimNode[]) => void }).initialize = () => {
    /* nodes already closed over via byId */
  };

  simulation.force("parents", forceTowardParents);

  // Pin simulation to 2D (existing dep is 3d-capable).
  simulation.numDimensions(2);

  for (let i = 0; i < iterations; i++) {
    simulation.tick();
    for (const n of simNodes) {
      n.z = 0;
      n.vz = 0;
    }
  }

  // Fit into viewBox with padding (keep nodes readable in 0–100 space).
  return fitNodesToViewBox(simNodes, 8, 92);
}

function fitNodesToViewBox(nodes: SimNode[], min: number, max: number): V2GraphNode[] {
  if (nodes.length === 0) return [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const span = Math.max(spanX, spanY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const targetSpan = max - min;
  const scale = targetSpan / span;
  const cx = (min + max) / 2;
  const cy = (min + max) / 2;

  return nodes.map((n) => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    evidenceCount: n.evidenceCount,
    href: n.href,
    focusCritical: n.focusCritical,
    focusTags: n.focusTags,
    x: cx + (n.x - midX) * scale,
    y: cy + (n.y - midY) * scale,
  }));
}

/**
 * Ego subset that keeps Molecule world coordinates (map → microscope).
 * Does not re-run force layout.
 */
export function buildEgoNeighborhoodPreservePositions(
  nodes: V2GraphNode[],
  edges: V2GraphEdge[],
  focusId: string
): { nodes: V2GraphNode[]; edges: V2GraphEdge[] } {
  const neighborIds = new Set<string>([focusId]);
  for (const edge of edges) {
    if (edge.from === focusId) neighborIds.add(edge.to);
    if (edge.to === focusId) neighborIds.add(edge.from);
  }
  return {
    nodes: nodes.filter((n) => neighborIds.has(n.id)),
    edges: edges.filter((e) => neighborIds.has(e.from) && neighborIds.has(e.to)),
  };
}
