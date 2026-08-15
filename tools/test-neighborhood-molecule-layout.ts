/**
 * Molecule + Radial — chem-lite: shared UNIT, hop rings, 1–3 → 1x, 4+ → 1.4x.
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { V2GraphEdge, V2GraphNode } from "../lib/argus/v2/intelligence-viz";
import {
  CHEM_NEIGHBORHOOD_LINK_UNIT,
  chemNeighborhoodLinkDistance,
  degreeDistanceMultiplier,
  degreeLinkLengthExtra,
  layoutNeighborhoodGraphNodes,
  neighborhoodDegreeMap,
  neighborhoodHopMap,
} from "../lib/argus/v2/intelligence-viz";
import {
  buildEgoNeighborhoodPreservePositions,
  layoutNeighborhoodMoleculeNodes,
  moleculeLinkDistance,
  moleculeLinkDistanceForDegrees,
  moleculeLinkStrength,
} from "../lib/argus/v2/neighborhood-molecule-layout";

assert.equal(CHEM_NEIGHBORHOOD_LINK_UNIT, 15);
assert.equal(moleculeLinkDistance(2), 15);
assert.equal(moleculeLinkDistance(1), 18);
assert.equal(moleculeLinkDistance(0.5), 21);
assert.ok(moleculeLinkStrength(2) > moleculeLinkStrength(1));
assert.ok(moleculeLinkStrength(1) > moleculeLinkStrength(0.5));

assert.equal(degreeDistanceMultiplier(1), 1);
assert.equal(degreeDistanceMultiplier(2), 1);
assert.equal(degreeDistanceMultiplier(3), 1, "degree 3 stays 1× (chem-lite)");
assert.equal(degreeDistanceMultiplier(4), 1.4);
assert.equal(degreeDistanceMultiplier(12), 1.4);
assert.equal(degreeLinkLengthExtra(1, 1), 0);
assert.equal(degreeLinkLengthExtra(3, 1), 0);
assert.equal(degreeLinkLengthExtra(4, 1), (1.4 - 1) * CHEM_NEIGHBORHOOD_LINK_UNIT);

assert.equal(chemNeighborhoodLinkDistance(1, 1), 15);
assert.equal(chemNeighborhoodLinkDistance(4, 1), 15 * 1.4);
assert.equal(moleculeLinkDistanceForDegrees(2, 1, 1), 15, "Radial + Molecule share 1× bond");
assert.equal(moleculeLinkDistanceForDegrees(2, 3, 1), 15, "3 links → still single (chem-lite)");
assert.equal(moleculeLinkDistanceForDegrees(2, 4, 1), 15 * 1.4, "4+ links → mild 1.4×");
assert.ok(
  moleculeLinkDistanceForDegrees(2, 4, 1) > moleculeLinkDistanceForDegrees(2, 3, 1),
  "only 4+ stretches preferred distance"
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
    // Fourth spoke — chem-lite only bumps length at degree ≥4
    { from: "xom", to: "t-wells", weight: 2, kind: "linked" },
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
const hops = neighborhoodHopMap(centerId, edges);
assert.ok((degrees.get("xom") ?? 0) >= 4, "fixture center is a 4+ hub (chem-lite bump)");
assert.equal(hops.get("xom"), 0);
assert.equal(hops.get("p-xom"), 1);
assert.ok((hops.get("e1") ?? 0) >= 2, "events sit on outer hop ring");

const radial = layoutNeighborhoodGraphNodes(nodes, centerId, edges);
const radialFlat = layoutNeighborhoodGraphNodes(nodes, centerId, []);
const molecule = layoutNeighborhoodMoleculeNodes(nodes, edges, centerId);

assert.equal(radial.length, 13);
assert.equal(molecule.length, 13);
assert.ok(molecule.every((n) => n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100));

function distFromCenter(laid: V2GraphNode[], cid: string, id: string): number {
  const c = laid.find((n) => n.id === cid)!;
  const n = laid.find((row) => row.id === id)!;
  return Math.hypot(n.x - c.x, n.y - c.y);
}

// Hop rings: 2-hop nodes farther from center than 1-hop (chem path length).
assert.ok(
  distFromCenter(radial, centerId, "e1") > distFromCenter(radial, centerId, "p-xom"),
  "Radial: hop-2 farther than hop-1"
);

function meanRadius(laid: V2GraphNode[], cid: string): number {
  const c = laid.find((n) => n.id === cid)!;
  const others = laid.filter((n) => n.id !== cid);
  const sum = others.reduce((acc, n) => acc + Math.hypot(n.x - c.x, n.y - c.y), 0);
  return sum / Math.max(others.length, 1);
}
assert.ok(
  meanRadius(radial, centerId) > meanRadius(radialFlat, centerId),
  "Radial: hop+degree layout spreads more than flat ring"
);

// Molecule stays near Radial chem scale (no fill-to-fit blow-up).
const radialMean = meanRadius(radial, centerId);
const moleculeMean = meanRadius(molecule, centerId);
assert.ok(
  moleculeMean < radialMean * 1.85,
  `Molecule must stay chem-coherent vs Radial (mol=${moleculeMean.toFixed(1)} radial=${radialMean.toFixed(1)})`
);

function meanEdgeLen(laid: V2GraphNode[], edgeList: V2GraphEdge[], predicate: (e: V2GraphEdge) => boolean): number {
  const byId = new Map(laid.map((n) => [n.id, n]));
  const picked = edgeList.filter(predicate);
  assert.ok(picked.length > 0);
  let sum = 0;
  for (const e of picked) {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    sum += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return sum / picked.length;
}
const hubEdgeLen = meanEdgeLen(molecule, edges, (e) => e.from === centerId || e.to === centerId);
const leafEdgeLen = meanEdgeLen(
  molecule,
  edges,
  (e) =>
    e.from !== centerId &&
    e.to !== centerId &&
    (degrees.get(e.from) ?? 0) <= 2 &&
    (degrees.get(e.to) ?? 0) <= 2 &&
    e.kind === "linked"
);
assert.ok(
  hubEdgeLen > leafEdgeLen * 0.75,
  `Molecule hub edges should not collapse vs leaf bonds (hub=${hubEdgeLen.toFixed(1)} leaf=${leafEdgeLen.toFixed(1)})`
);

const xs = new Set(molecule.map((n) => Math.round(n.x * 10)));
const ys = new Set(molecule.map((n) => Math.round(n.y * 10)));
assert.ok(xs.size >= 5, "molecule spreads X");
assert.ok(ys.size >= 5, "molecule spreads Y");

const graphUi = readFileSync(join(process.cwd(), "app/argus/v2/components/V2KnowledgeGraph.tsx"), "utf8");
assert.match(graphUi, /chem-lite/, "UI names chem-lite spacing");
assert.match(graphUi, /1–3 links · near/, "legend: uniform near bonds");
assert.match(graphUi, /4\+ links · slight outer/, "legend: mild outer only at 4+");
assert.match(graphUi, /HOVER_SCALE = 1\.55/, "icons enlarge on hover");
assert.match(graphUi, /Large view/, "expand is a large local view, not giant icons");
assert.match(graphUi, /nodeBase: 2\.[0-9]/, "default icons stay small");
assert.doesNotMatch(graphUi, /nodeBase: 7\.5/, "expanded view no longer uses huge nodeBase");
assert.match(graphUi, /aria-label="Zoom in"/, "graph exposes + zoom control");
assert.match(graphUi, /aria-label="Zoom out"/, "graph exposes − zoom control");
assert.match(graphUi, /aria-label="Turn left"/, "graph exposes turn left");
assert.match(graphUi, /aria-label="Toggle 3D turn"/, "graph exposes optional 3D tilt");
assert.match(graphUi, /rotateLayoutPoint/, "turn rotates layout around center");
assert.doesNotMatch(graphUi, /ForceGraph3D|react-force-graph-3d/, "ARGUS neighborhood stays SVG — no Forge 3D port");
assert.doesNotMatch(graphUi, /3 links · mid/, "old mid-band legend removed");

const orgShell = readFileSync(join(process.cwd(), "app/argus/v2/components/V2OrgShell.tsx"), "utf8");
assert.match(orgShell, /directEvidenceTags/, "Org Tags Slice 1 landed");
assert.match(orgShell, /watchedHere/, "Org Tags watched intersection landed");

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

writeFileSync(join(outDir, "radial.svg"), renderSvg(radial, edges, "Radial chem-lite (hop rings)", { centerId }));
writeFileSync(
  join(outDir, "molecule.svg"),
  renderSvg(molecule, edges, "Molecule chem-lite (shared UNIT)", { centerId })
);
writeFileSync(
  join(outDir, "molecule-focus-xom.svg"),
  renderSvg(molecule, edges, "Molecule · select Exxon (positions kept)", {
    centerId: "xom",
    emphasizeIds: emphasize,
  })
);

const art = join("/opt/cursor/artifacts/screenshots");
mkdirSync(art, { recursive: true });
writeFileSync(join(art, "graph-radial.svg"), renderSvg(radial, edges, "Radial chem-lite (hop rings)", { centerId }));
writeFileSync(
  join(art, "graph-molecule.svg"),
  renderSvg(molecule, edges, "Molecule chem-lite (shared UNIT)", { centerId })
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
