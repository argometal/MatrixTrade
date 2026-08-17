/**
 * Event Tag ↔ Note Tag dual-write helpers (Event-first tagging without a note body).
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import {
  evidenceTagKeysForEvent,
  mergeBinderTagLists,
  placeholderBodyForEventTags,
  tagsMissingFromEventEvidence,
} from "../lib/argus/v2/event-tag-sync";

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "name" | "type">): Entity {
  return {
    notes: "Kind: Event\nChronicle: v2\n---",
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

assert.equal(placeholderBodyForEventTags(["latency"]), "Tagged: #latency");
assert.equal(placeholderBodyForEventTags([]), "Tagged");

const event = entity({
  id: "e1",
  name: "SLB review",
  type: "other",
  eventTags: ["binder-only"],
});

const data: ArgusData = {
  version: 3,
  entities: [event],
  logs: [
    log({
      id: "l1",
      body: "Tagged: #latency",
      entityIds: ["e1"],
      topics: ["latency"],
    }),
  ],
  inboxItems: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
  globalTags: [],
  attachments: [],
};

const evidenceKeys = evidenceTagKeysForEvent(data, "e1");
assert.ok(evidenceKeys.has("latency"));
assert.equal(evidenceKeys.has("binder-only"), false);

const missing = tagsMissingFromEventEvidence(data, "e1", ["latency", "new-tag", "Latency"]);
assert.deepEqual(missing, ["new-tag"]);

assert.deepEqual(mergeBinderTagLists(["alpha"], ["beta", "alpha"]), ["alpha", "beta"]);

console.log("test-event-tag-note-sync: ok");
