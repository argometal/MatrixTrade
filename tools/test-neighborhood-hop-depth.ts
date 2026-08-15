/**
 * Neighborhood hop depth: 2 default, 3 wide, 5 extended — bridges survive trim.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import {
  buildV2EntityNeighborhoodGraph,
  neighborhoodMaxNodesForDepth,
  promoteNeighborhoodBridgeIds,
} from "../lib/argus/v2/intelligence-viz";

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "name" | "type">): Entity {
  return {
    notes: "",
    linkedEntityIds: [],
    linkedPersonIds: [],
    linkedTopicIds: [],
    linkedEventIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } as Entity;
}

function log(partial: Partial<Log> & Pick<Log, "id" | "entityIds">): Log {
  return {
    kind: "log",
    date: "2026-08-01",
    title: "n",
    body: "b",
    private: false,
    source: "manual",
    topics: [],
    classificationStatus: "classified",
    attachmentIds: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial,
  } as Log;
}

const org = entity({ id: "org1", name: "Acme", type: "company" });
const project = entity({
  id: "p1",
  name: "Ops",
  type: "project",
  linkedEntityIds: ["org1"],
  linkedTopicIds: ["t1"],
});
const topic = entity({
  id: "t1",
  name: "Wells",
  type: "other",
  notes: "Kind: Topic",
  linkedEntityIds: ["p1"],
  linkedEventIds: ["e1"],
});
const event = entity({
  id: "e1",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["t1"],
});
const person = entity({
  id: "alice",
  name: "Alice",
  type: "person",
  linkedEntityIds: ["e1", "other-org"],
});
const otherOrg = entity({
  id: "other-org",
  name: "OtherCo",
  type: "company",
  linkedPersonIds: ["alice"],
});
const farProject = entity({
  id: "far-p",
  name: "Far Project",
  type: "project",
  linkedEntityIds: ["other-org"],
});

const data = {
  version: 3,
  signalTags: [],
  entities: [org, project, topic, event, person, otherOrg, farProject],
  logs: [
    log({ id: "l1", entityIds: ["org1"] }),
    log({ id: "l2", entityIds: ["e1"] }),
  ],
  inboxItems: [],
  attachments: [],
  runbooks: [],
} as unknown as ArgusData;

const today = "2026-08-15";

assert.equal(neighborhoodMaxNodesForDepth(2), 16);
assert.equal(neighborhoodMaxNodesForDepth(3), 22);
assert.equal(neighborhoodMaxNodesForDepth(5), 28);

const d2 = buildV2EntityNeighborhoodGraph(data, [], "org1", true, today, {
  maxHops: 2,
});
const d3 = buildV2EntityNeighborhoodGraph(data, [], "org1", true, today, {
  maxHops: 3,
});
const d5 = buildV2EntityNeighborhoodGraph(data, [], "org1", true, today, {
  maxHops: 5,
});

assert.equal(d2.meta?.maxHops, 2);
assert.equal(d3.meta?.maxHops, 3);
assert.equal(d5.meta?.maxHops, 5);

assert.ok(d2.nodes.some((n) => n.id === "p1"), "depth 2 includes project");
assert.ok(d2.nodes.some((n) => n.id === "t1"), "depth 2 includes topic via project");
assert.ok(
  d3.nodes.some((n) => n.id === "e1") || d5.nodes.some((n) => n.id === "e1"),
  "deeper depth can reach Event under Topic"
);
assert.ok(
  d5.meta!.candidateCount >= d3.meta!.candidateCount,
  "depth 5 discovers at least as many candidates as depth 3"
);
assert.ok(
  d3.meta!.candidateCount >= d2.meta!.candidateCount,
  "depth 3 discovers at least as many candidates as depth 2"
);

const trimmed = buildV2EntityNeighborhoodGraph(data, [], "org1", true, today, {
  maxHops: 5,
  maxNodes: 3,
});
assert.equal(trimmed.meta?.trimmed, true, "tiny maxNodes reports trimmed");
// Even under aggressive trim, any kept non-center structural node must stay linked.
for (const node of trimmed.nodes) {
  if (node.id === "org1") continue;
  const linked = trimmed.edges.some(
    (e) => e.kind === "linked" && (e.from === node.id || e.to === node.id)
  );
  assert.ok(linked, `trimmed graph keeps a structural edge for ${node.id}`);
}

const entityMap = new Map(data.entities.map((e) => [e.id, e]));
const promoted = promoteNeighborhoodBridgeIds(
  "org1",
  new Set(["org1", "e1"]),
  new Set(["org1", "p1", "t1", "e1"]),
  entityMap,
  { maxExtra: 0 }
);
assert.ok(promoted.has("p1") && promoted.has("t1"), "bridge promote ignores maxExtra budget");

const panel = readFileSync(
  join(process.cwd(), "app/argus/v2/components/V2EntityNeighborhoodPanel.tsx"),
  "utf8"
);
assert.match(panel, /Neighborhood hop depth/, "UI exposes hop depth controls");
assert.match(panel, /depth: 5/, "UI exposes depth 5");
assert.doesNotMatch(panel, /Universe/, "Universe escape hatch removed");
assert.doesNotMatch(panel, /intel=treemap/, "no Treemap Universe link on neighborhood");
assert.match(panel, /Structural bridges/, "trim note explains bridges are kept");

const actions = readFileSync(join(process.cwd(), "app/argus/actions.ts"), "utf8");
assert.match(actions, /neighborhoodMaxNodesForDepth/, "action uses depth-scaled canvas budget");

console.log("ok: neighborhood-hop-depth");
console.log(
  `candidates d2=${d2.meta?.candidateCount} d3=${d3.meta?.candidateCount} d5=${d5.meta?.candidateCount}`
);
