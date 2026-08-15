/**
 * Neighborhood: if an Event (or any binder) is kept on canvas after maxNodes
 * trim, its structural path/edge to the center must remain drawable.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import {
  buildV2EntityNeighborhoodGraph,
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
const topic = entity({
  id: "t1",
  name: "Bridge Topic",
  type: "other",
  notes: "Kind: Topic",
  linkedEntityIds: ["org1"],
  linkedEventIds: ["e1"],
});
const event = entity({
  id: "e1",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  // Event does not mirror the Topic link — one-way bag (common).
  linkedEntityIds: [],
});
const noise = Array.from({ length: 12 }, (_, i) =>
  entity({
    id: `p${i}`,
    name: `Noise ${i}`,
    type: "project",
    linkedEntityIds: ["org1"],
  })
);

const data = {
  version: 3,
  signalTags: [],
  entities: [org, topic, event, ...noise],
  // Heavy evidence on Event so trim prefers Event over the Topic bridge.
  logs: [
    log({ id: "l-event", entityIds: ["e1"] }),
    log({ id: "l-event-2", entityIds: ["e1"] }),
    log({ id: "l-event-3", entityIds: ["e1"] }),
    log({ id: "l-event-4", entityIds: ["e1"] }),
    log({ id: "l-event-5", entityIds: ["e1"] }),
    log({ id: "l-org", entityIds: ["org1"] }),
    ...noise.map((p, i) => log({ id: `l-p${i}`, entityIds: [p.id] })),
  ],
  inboxItems: [],
  attachments: [],
  runbooks: [],
} as unknown as ArgusData;

const today = "2026-08-15";
const graph = buildV2EntityNeighborhoodGraph(data, [], "org1", true, today, { maxNodes: 8 });

assert.ok(
  graph.nodes.some((n) => n.id === "e1"),
  "Event survives on the neighborhood canvas"
);

const eventEdges = graph.edges.filter(
  (e) => (e.from === "e1" || e.to === "e1") && e.kind === "linked"
);
assert.ok(
  eventEdges.length > 0,
  "visible Event must keep at least one structural relation drawn"
);

assert.ok(
  graph.nodes.some((n) => n.id === "t1"),
  "Topic bridge is promoted so the Event relation can render"
);

assert.ok(
  graph.edges.some(
    (e) =>
      e.kind === "linked" &&
      ((e.from === "t1" && e.to === "e1") || (e.from === "e1" && e.to === "t1"))
  ),
  "Topic→Event structural link is drawn even when only Topic bag stores it"
);

const entityMap = new Map(data.entities.map((e) => [e.id, e]));
const promoted = promoteNeighborhoodBridgeIds(
  "org1",
  new Set(["org1", "e1"]),
  new Set(["org1", "t1", "e1", ...noise.map((p) => p.id)]),
  entityMap
);
assert.ok(promoted.has("t1"), "promoteNeighborhoodBridgeIds restores Topic hop");

const ui = readFileSync(join(process.cwd(), "app/argus/v2/components/V2KnowledgeGraph.tsx"), "utf8");
assert.match(
  ui,
  /emphasizeIds\.has\(edge\.from\) \|\|[\s\S]*emphasizeIds\.has\(edge\.to\)/,
  "focus highlight keeps bonds that touch the ego (Event relation stays visible)"
);

console.log("ok: neighborhood-event-edges");
