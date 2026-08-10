/**
 * Topic Chronicle (detail.evidence) must include Notes/emails on linked Events —
 * same portfolio stream as metric pills (Event-first aggregation lens).
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, InboxItem, Log } from "../lib/argus/types";
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
  name: "Look Ahead · 2026-08-01",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedTopicIds: ["t1"],
});

const noteOnEvent: Log = {
  id: "log1",
  title: "Complacent look-ahead",
  body: "Miss recorded on the Event",
  kind: "note",
  date: "2026-08-01",
  entityIds: ["e1"],
  topics: ["look-ahead"],
  attachmentIds: [],
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
} as unknown as Log;

const data: ArgusData = {
  entities: [topic, event],
  logs: [noteOnEvent],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

const details = buildV2TopicDetails(data, [] as InboxItem[], true, "2026-08-09");
const vic = details.find((d) => d.id === "t1");

assert.ok(vic, "topic detail");
assert.equal(vic!.evidence.length, 1, "Event Note appears in Topic Chronicle");
assert.equal(vic!.evidence[0]?.title, "Complacent look-ahead");
assert.match(vic!.evidence[0]?.meta ?? "", /Look Ahead/, "meta annotates source Event");
assert.equal(vic!.journalCount, 1, "pills match Chronicle portfolio");

console.log("ok: topic-chronicle-includes-event-notes");
