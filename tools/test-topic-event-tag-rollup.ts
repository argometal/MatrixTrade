/**
 * Topic Tags rollup includes Note Tags + Event binder eventTags from linked Events.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
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

const topic = entity({
  id: "t1",
  name: "Vic performance",
  type: "other",
  notes: "Kind: Topic",
});
const event = entity({
  id: "e1",
  name: "Q1 review",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  startDate: "2026-03-15",
  linkedEntityIds: ["t1"],
  eventTags: ["BinderOnly", "latency"],
});
const eventEmpty = entity({
  id: "e2",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  startDate: "2026-02-01",
  linkedEntityIds: ["t1"],
  eventTags: ["KickoffTag"],
});

const note: Log = {
  id: "log1",
  kind: "log",
  date: "2026-03-15",
  title: "Prep",
  body: "notes",
  private: false,
  source: "manual",
  entityIds: ["e1"],
  topics: ["latency", "handoff"],
  classificationStatus: "classified",
  attachmentIds: [],
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
} as Log;

const data: ArgusData = {
  entities: [topic, event, eventEmpty],
  logs: [note],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: ["latency"],
} as unknown as ArgusData;

const detail = buildV2TopicDetails(data, [], true, "2026-08-09").find((d) => d.id === "t1");
assert.ok(detail);
assert.equal(detail!.eventEvidenceTags.length, 2, "every linked Event appears in rollup");
const q1 = detail!.eventEvidenceTags.find((e) => e.id === "e1");
assert.ok(q1);
assert.deepEqual(q1!.tags, ["BinderOnly", "handoff", "latency"]);
assert.ok(q1!.tags.includes("BinderOnly"), "binder Event Tags appear on Topic");
const kickoff = detail!.eventEvidenceTags.find((e) => e.id === "e2");
assert.ok(kickoff);
assert.deepEqual(kickoff!.tags, ["KickoffTag"]);
assert.ok(detail!.evidenceTagCounts.some((row) => row.tag === "BinderOnly"));
assert.ok(detail!.evidenceTagCounts.some((row) => row.tag === "KickoffTag"));
assert.ok(detail!.evidenceTagCounts.some((row) => row.tag === "latency" && row.count === 1));
assert.ok(detail!.evidenceTagCounts.some((row) => row.tag === "handoff" && row.count === 1));
assert.ok(Array.isArray(detail!.tagPatterns));

console.log("ok: topic-event-tag-rollup");
