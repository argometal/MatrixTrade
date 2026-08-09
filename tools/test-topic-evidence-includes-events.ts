/**
 * Topic browse evidenceCount must include notes/emails on linked Events
 * (same binder volume as Tags rollup / Home treemap) — not topic-direct only.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, InboxItem, Log } from "../lib/argus/types";
import { buildV2TopicRows } from "../lib/argus/v2/topic-loaders";

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
  name: "Alpha Topic",
  type: "other",
  notes: "Kind: Topic",
});
const event = entity({
  id: "e1",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedTopicIds: ["t1"],
});
const lonely = entity({
  id: "t2",
  name: "Lonely",
  type: "other",
  notes: "Kind: Topic",
});

const noteOnEvent: Log = {
  id: "log1",
  title: "Kickoff notes",
  body: "Evidence lives on the Event binder",
  kind: "note",
  date: "2026-08-01",
  entityIds: ["e1"],
  topics: ["alpha"],
  attachmentIds: [],
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
} as unknown as Log;

const emailOnEvent = {
  id: "inbox1",
  subject: "Kickoff thread",
  from: "a@example.com",
  receivedAt: "2026-08-02T12:00:00.000Z",
  linkedEntityIds: ["e1"],
  topics: ["alpha"],
  attachmentIds: [],
  triageStatus: "linked",
} as unknown as InboxItem;

const data: ArgusData = {
  entities: [topic, event, lonely],
  logs: [noteOnEvent],
  inbox: [emailOnEvent],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

const rows = buildV2TopicRows(data, [emailOnEvent], true, "2026-08-09");
const alpha = rows.find((r) => r.id === "t1");
const lonelyRow = rows.find((r) => r.id === "t2");

assert.ok(alpha, "alpha topic row");
assert.equal(alpha!.journalCount, 1, "note on linked Event counts as Topic journal");
assert.equal(alpha!.emailCount, 1, "email on linked Event counts as Topic email");
assert.equal(alpha!.evidenceCount, 2, "evidence = journals + emails across Topic ∪ Events");
assert.notEqual(alpha!.lastActivity, "—", "last activity follows Event evidence");

assert.ok(lonelyRow, "lonely topic row");
assert.equal(lonelyRow!.evidenceCount, 0, "unlinked empty topic stays 0");

console.log("ok: topic-evidence-includes-events");
