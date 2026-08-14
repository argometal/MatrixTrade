/**
 * Molecule + Radial — high-degree hubs get longer links.
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { V2GraphEdge, V2GraphNode } from "../lib/argus/v2/intelligence-viz";
import {
  degreeLinkLengthExtra,
  layoutNeighborhoodGraphNodes,
  neighborhoodDegreeMap,
} from "../lib/argus/v2/intelligence-viz";
import {
  buildEgoNeighborhoodPreservePositions,
  layoutNeighborhoodMoleculeNodes,
  moleculeLinkDistance,
  moleculeLinkDistanceForDegrees,
  moleculeLinkStrength,
} from "../lib/argus/v2/neighborhood-molecule-layout";

assert.equal(moleculeLinkDistance(2), 14);
assert.equal(moleculeLinkDistance(1), 26);
assert.equal(moleculeLinkDistance(0.5), 42);
assert.ok(moleculeLinkStrength(2) > moleculeLinkStrength(1));
assert.ok(moleculeLinkStrength(1) > moleculeLinkStrength(0.5));

assert.equal(degreeLinkLengthExtra(1, 2), 0);
assert.ok(degreeLinkLengthExtra(8, 1) > degreeLinkLengthExtra(3, 1));
assert.ok(
  moleculeLinkDistanceForDegrees(2, 8, 1) > moleculeLinkDistance(2),
  "hub-linked edges are longer than base weight distance"
);

function denseNeighborhood(): { nodes: V2GraphNode[]; edges: V2GraphEdge[]; centerId: string } {
  const centerId = "xom";
  const defs: Array<{ id: string; name: string; kind: V2GraphNode["kind"]; evidenceCount: number }> = [
    { id: "xom", name: "ExxonMobil", kind: "organization", evidenceCount: 40 },
    { id: "slb", name: "SLB", kind: "organization", evidenceCount: 28 },
    { id: "p-xom", name: "XOM Ops", kind: "project", evidenceCount: 18 },
    { id: "p-slb", name: "SLB Digi", kind: "project", evidenceCount: 14 },
    { id: "t-wells", name: "Wells", kind: "topic", evidenceCount: 12 },
    { id: "t-latency", name: "Latency", kind: "topic", evidenceCount: 9 },
    { id: "t-handoff", name: "Handoff", kind: "topic", evidenceCount: 7 },
    { id: "t-supply", name: "Supply", kind: "topic", evidenceCount: 6 },
    { id: "e1", name: "Q1 Review", kind: "event", evidenceCount: 5 },
    { id: "e2", name: "Kickoff", kind: "event", evidenceCount: 4 },
    { id: "e3", name: "Sync", kind: "event", evidenceCount: 3 },
    { id: "e4", name: "Drill", kind: "event", evidenceCount: 3 },
    { id: "alice", name: "Alice", kind: "person", evidenceCount: 8 },
  ];
  const nodes: V2GraphNode[] = defs.map((d) => ({
    ...d,
    x: 0,
    y: 0,
    href: `#${d.id}`,
  }));

  const edges: V2GraphEdge[] = [
    { from: "xom", to: "p-xom", weight: 2, kind: "linked" },
    { from: "p-xom", to: "t-wells", weight: 2, kind: "linked" },
    { from: "p-xom", to: "t-latency", weight: 2, kind: "linked" },
    { from: "t-wells", to: "e1", weight: 2, kind: "linked" },
    { from: "t-latency", to: "e2", weight: 2, kind: "linked" },
    { from: "xom", to: "alice", weight: 2, kind: "linked" },
    { from: "slb", to: "p-slb", weight: 2, kind: "linked" },
    { from: "p-slb", to: "t-handoff", weight: 2, kind: "linked" },
    { from: "p-slb", to: "t-supply", weight: 2, kind: "linked" },
    { from: "t-handoff", to: "e3", weight: 2, kind: "linked" },
    { from: "t-supply", to: "e4", weight: 2, kind: "linked" },
    { from: "t-latency", to: "t-handoff", weight: 1, kind: "co-mentioned" },
    { from: "xom", to: "slb", weight: 0.5, kind: "focus-affinity" },
    { from: "alice", to: "p-slb", weight: 1, kind: "co-mentioned" },
  ];

  return { nodes, edges, centerId };
}

const KIND_FILL: Record<V2GraphNode["kind"], string> = {
  organization: "rgb(56,189,248)",
  project: "rgb(245,158,11)",
  topic: "rgb(52,211,153)",
  event: "rgb(251,113,133)",
  person: "rgb(139,92,246)",
};

function renderSvg(
  layoutNodes: V2GraphNode[],
  layoutEdges: V2GraphEdge[],
  title: string,
  options: { centerId: string; emphasizeIds?: Set<string> } 
): string {
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="900" height="900">');
  parts.push('<rect width="100" height="100" fill="#09090b"/>');
  parts.push(`<text x="50" y="4" text-anchor="middle" fill="#a1a1aa" font-size="3">${title}</text>`);

  for (const e of layoutEdges) {
    const a = layoutNodes.find((n) => n.id === e.from);
    const b = layoutNodes.find((n) => n.id === e.to);
    if (!a || !b) continue;
    const hot =
      !options.emphasizeIds ||
      (options.emphasizeIds.has(e.from) && options.emphasizeIds.has(e.to));
    const w = e.weight >= 2 ? 1.2 : e.weight >= 1 ? 0.8 : 0.5;
    const color = !hot
      ? "rgba(63,63,70,0.25)"
      : e.kind === "focus-affinity"
        ? "rgba(251,113,133,0.5)"
        : e.weight >= 2
          ? "rgba(139,92,246,0.55)"
          : "rgba(113,113,122,0.45)";
    const dash = e.kind === "focus-affinity" ? ' stroke-dasharray="1.2 1.4"' : "";
    const opacity = hot ? "1" : "0.35";
    parts.push(
      `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${w}" opacity="${opacity}"${dash}/>`
    );
  }

  for (const n of layoutNodes) {
    const hot = !options.emphasizeIds || options.emphasizeIds.has(n.id);
    const r = hot && n.id === options.centerId ? 4 : 3.2;
    const stroke = n.id === options.centerId ? "rgb(251,191,36)" : "rgb(9,9,11)";
    const label = n.name.slice(0, 10);
    parts.push(`<g opacity="${hot ? 1 : 0.22}">`);
    parts.push(
      `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${KIND_FILL[n.kind]}" stroke="${stroke}" stroke-width="0.6"/>`
    );
    parts.push(
      `<text x="${n.x}" y="${n.y + 5.5}" text-anchor="middle" fill="#c8c8d2" font-size="2.4">${label}</text>`
    );
    parts.push("</g>");
  }

  parts.push("</svg>");
  return parts.join("\n");
}

const { nodes, edges, centerId } = denseNeighborhood();
const degrees = neighborhoodDegreeMap(edges);
assert.ok((degrees.get("xom") ?? 0) >= 3, "fixture center is a hub");

const radial = layoutNeighborhoodGraphNodes(nodes, centerId, edges);
const radialFlat = layoutNeighborhoodGraphNodes(nodes, centerId, []);
const molecule = layoutNeighborhoodMoleculeNodes(nodes, edges, centerId);

assert.equal(radial.length, 13);
assert.equal(molecule.length, 13);
assert.ok(molecule.every((n) => n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100));

// Degree-aware radial: mean distance from center should grow vs edges ignored.
function meanRadius(laid: V2GraphNode[], cid: string): number {
  const c = laid.find((n) => n.id === cid)!;
  const others = laid.filter((n) => n.id !== cid);
  const sum = others.reduce((acc, n) => acc + Math.hypot(n.x - c.x, n.y - c.y), 0);
  return sum / Math.max(others.length, 1);
}
assert.ok(
  meanRadius(radial, centerId) > meanRadius(radialFlat, centerId),
  "Radial: high-degree hub gets longer spokes when edges are known"
);

const xs = new Set(molecule.map((n) => Math.round(n.x * 10)));
const ys = new Set(molecule.map((n) => Math.round(n.y * 10)));
assert.ok(xs.size >= 5, "molecule spreads X");
assert.ok(ys.size >= 5, "molecule spreads Y");

const ego = buildEgoNeighborhoodPreservePositions(molecule, edges, "xom");
assert.ok(ego.nodes.some((n) => n.id === "xom"));
assert.ok(ego.nodes.some((n) => n.id === "p-xom"));
const xomMol = molecule.find((n) => n.id === "xom")!;
const xomEgo = ego.nodes.find((n) => n.id === "xom")!;
assert.equal(xomMol.x, xomEgo.x);
assert.equal(xomMol.y, xomEgo.y);

const outDir = join(process.cwd(), "artifacts", "graph-molecule-ab");
mkdirSync(outDir, { recursive: true });
const emphasize = new Set(ego.nodes.map((n) => n.id));

writeFileSync(
  join(outDir, "radial.svg"),
  renderSvg(radial, edges, "Radial (production)", { centerId })
);
writeFileSync(
  join(outDir, "molecule.svg"),
  renderSvg(molecule, edges, "Molecule (weighted-force)", { centerId })
);
writeFileSync(
  join(outDir, "molecule-focus-xom.svg"),
  renderSvg(molecule, edges, "Molecule · select Exxon (positions kept)", {
    centerId: "xom",
    emphasizeIds: emphasize,
  })
);

// Also copy into Cursor artifacts for walkthrough
const art = join("/opt/cursor/artifacts/screenshots");
mkdirSync(art, { recursive: true });
writeFileSync(join(art, "graph-radial.svg"), renderSvg(radial, edges, "Radial (production)", { centerId }));
writeFileSync(
  join(art, "graph-molecule.svg"),
  renderSvg(molecule, edges, "Molecule (weighted-force)", { centerId })
);
writeFileSync(
  join(art, "graph-molecule-focus-xom.svg"),
  renderSvg(molecule, edges, "Molecule · select Exxon (positions kept)", {
    centerId: "xom",
    emphasizeIds: emphasize,
  })
);

console.log("ok: neighborhood-molecule-layout");
console.log(`wrote ${outDir}`);
