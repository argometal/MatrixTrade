/**
 * Treemap knowledge nodes must include every non-archived org/project/topic —
 * including zero-evidence projects (e.g. Exxon) and without a hard top-24 cut.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity } from "../lib/argus/types";
import {
  buildV2KnowledgeNodes,
  layoutTreemap,
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

const entities: Entity[] = [
  entity({ id: "org1", name: "Exxon", type: "company" }),
  entity({
    id: "proj-exxon",
    name: "Exxon Project",
    type: "project",
    linkedEntityIds: ["org1"],
  }),
  entity({ id: "t1", name: "Topic A", type: "other", notes: "Kind: Topic" }),
];

// Pad with many empty projects so a top-24 cut would drop Exxon Project if sorting
// put it last — proves we no longer slice.
for (let i = 0; i < 30; i += 1) {
  entities.push(
    entity({
      id: `p${i}`,
      name: `Filler ${i}`,
      type: "project",
    })
  );
}

const data = {
  entities,
  logs: [],
  inboxItems: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
  version: 3 as const,
} satisfies ArgusData;

const nodes = buildV2KnowledgeNodes(data, [], true, "2026-08-08");
const ids = new Set(nodes.map((n) => n.id));

assert.ok(ids.has("proj-exxon"), "Exxon Project must appear even with zero evidence");
assert.ok(ids.has("org1"), "Exxon org must appear");
assert.ok(ids.has("t1"), "empty topic must appear");
assert.equal(
  nodes.filter((n) => n.kind === "project").length,
  31,
  "all 31 projects included (no top-24 cut)"
);

const rects = layoutTreemap(nodes, 100, 72);
assert.ok(
  rects.some((r) => r.id === "proj-exxon"),
  "layoutTreemap draws Exxon Project tile"
);
assert.equal(rects.length, nodes.length, "every node gets a tile");

console.log("ok: treemap-full-entities");
