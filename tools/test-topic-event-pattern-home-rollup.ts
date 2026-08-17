/**
 * Topic Patterns on Home must count Event-linked evidence (same as Topic detail).
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import { buildV2KnowledgeNodes } from "../lib/argus/v2/intelligence-viz";
import { buildV2FocusTagPortfolio, buildV2TagEvidenceMap } from "../lib/argus/v2/loaders";
import { buildV2TopicDetails } from "../lib/argus/v2/topic-loaders";

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

function log(partial: Partial<Log> & Pick<Log, "id" | "body" | "entityIds" | "topics">): Log {
  return {
    kind: "log",
    date: "2026-08-10",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
    ...partial,
  } as Log;
}

const topic = entity({
  id: "t1",
  name: "Latency",
  type: "other",
  notes: "Kind: Topic",
});
const event = entity({
  id: "e1",
  name: "SLB review",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  startDate: "2026-08-10",
  linkedEntityIds: ["t1"],
  linkedTopicIds: ["t1"],
});

const data: ArgusData = {
  version: 3,
  entities: [topic, event],
  logs: [
    log({ id: "l1", body: "one", entityIds: ["e1"], topics: ["latency"], date: "2026-08-01" }),
    log({ id: "l2", body: "two", entityIds: ["e1"], topics: ["latency"], date: "2026-08-05" }),
    log({ id: "l3", body: "three", entityIds: ["e1"], topics: ["latency"], date: "2026-08-10" }),
  ],
  inboxItems: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
  globalTags: [],
  attachments: [],
};

const today = "2026-08-16";

const detail = buildV2TopicDetails(data, [], true, today).find((t) => t.id === "t1");
assert.ok(detail);
assert.equal(detail!.tagPatterns.length, 1, "Topic detail sees Pattern from Event Notes");
assert.equal(detail!.tagPatterns[0]!.tag.toLowerCase(), "latency");

const nodes = buildV2KnowledgeNodes(data, [], true, today);
const topicNode = nodes.find((n) => n.id === "t1");
assert.ok(topicNode);
assert.equal(topicNode!.evidenceCount, 3, "Home Topic evidence includes Event Notes");
assert.equal(
  topicNode!.tagPatternCount,
  1,
  "Home Topic Patterns must include Event-linked evidence Tags"
);

const portfolio = buildV2FocusTagPortfolio(data, [], true, today);
const latency = portfolio.find((r) => r.name.toLowerCase() === "latency");
assert.ok(latency);
assert.equal(latency!.count, 3, "Home Tags evidence counter tracks Event Notes");
assert.equal(latency!.isPattern, true, "Home Tags marks Pattern from Event Notes");

const evidenceMap = buildV2TagEvidenceMap(data, [], true);
const ctx = evidenceMap[latency!.name.toLowerCase()] ?? evidenceMap["latency"];
assert.ok(ctx, "evidence map has latency");
assert.ok(
  ctx!.topics.some((t) => t.id === "t1"),
  "Event Note Tags also surface linked Topic in neighborhood"
);
assert.ok(ctx!.events.some((e) => e.id === "e1"), "Event remains in neighborhood");

console.log("ok: topic-event-pattern-home-rollup");
