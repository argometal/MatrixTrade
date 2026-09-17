/**
 * Event/Topic Tags tab can search the Tag universe (not only local evidence).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import { buildTagBuckets } from "../lib/argus/journal-helpers";

const root = process.cwd();
const eventEditor = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventTagEditor.tsx"),
  "utf8"
);
const topicEditor = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicAliasEditor.tsx"),
  "utf8"
);

assert.match(eventEditor, /TagPickerModal/, "Event Tags wires universe picker");
assert.match(eventEditor, /browseUniverse|Browse \/ search universe/, "Event Tags browse CTA");
assert.match(topicEditor, /TagPickerModal/, "Topic Tags wires universe picker");
assert.match(topicEditor, /browseUniverse|Browse \/ search universe/, "Topic Tags browse CTA");

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

const data: ArgusData = {
  version: 3,
  entities: [
    entity({
      id: "e1",
      name: "Event A",
      type: "other",
      notes: "Kind: Event\nChronicle: v2\n---",
      eventTags: ["binder-only-tag"],
    }),
    entity({
      id: "t1",
      name: "Topic A",
      type: "other",
      notes: "Kind: Topic",
      topicTags: ["topic-binder-tag"],
    }),
  ],
  logs: [
    log({
      id: "l1",
      body: "note",
      entityIds: ["e1"],
      topics: ["evidence-tag"],
    }),
  ],
  inboxItems: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: ["tracker-only"],
  globalTags: ["global-tag"],
  attachments: [],
};

const buckets = buildTagBuckets(data, true);
const allKeys = new Set(buckets.all.map((t) => t.toLowerCase()));
assert.ok(allKeys.has("evidence-tag"), "universe includes evidence");
assert.ok(allKeys.has("binder-only-tag"), "universe includes Event binder Tags");
assert.ok(allKeys.has("topic-binder-tag"), "universe includes Topic binder Tags");
assert.ok(allKeys.has("global-tag"), "universe includes global Tags");
assert.ok(allKeys.has("tracker-only"), "universe includes Trackers");
assert.ok(buckets.recent.length <= 10, "idle recent stays capped");

console.log("test-binder-tag-universe-search: ok");
