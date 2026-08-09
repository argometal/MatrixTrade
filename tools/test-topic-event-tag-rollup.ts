/**
 * Topic Tags tab rolls up Note Tags / Patterns from linked Events.
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
  entities: [topic, event],
  logs: [note],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: ["latency"],
} as unknown as ArgusData;

const detail = buildV2TopicDetails(data, [], true, "2026-08-09").find((d) => d.id === "t1");
assert.ok(detail);
assert.equal(detail!.eventEvidenceTags.length, 1);
assert.equal(detail!.eventEvidenceTags[0]?.id, "e1");
assert.deepEqual(detail!.eventEvidenceTags[0]?.tags, ["handoff", "latency"]);
assert.equal(detail!.eventEvidenceTags[0]?.dateLabel, "2026-03-15");
// Patterns need min count — two distinct tags once each → no pattern yet, but rollup list works.
assert.ok(Array.isArray(detail!.tagPatterns));

console.log("ok: topic-event-tag-rollup");
