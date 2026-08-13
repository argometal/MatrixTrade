/**
 * Definition D — entity Watched = binder ∪ direct evidence ∩ signalTags.
 * Branch pools do not count. Topic Trackers section excludes Event-owned Tags.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import {
  entityHasTracker,
  ownershipTagsForEntity,
  topicLocalOwnershipTags,
  watchedTrackerTagsOnEntity,
} from "../lib/argus/v2/entity-watched";
import { buildV2KnowledgeNodes } from "../lib/argus/v2/intelligence-viz";

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
  name: "Vic",
  type: "other",
  notes: "Kind: Topic",
  topicTags: ["TopicBinder"],
});
const event = entity({
  id: "e1",
  name: "Q1",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["t1"],
  eventTags: ["BinderOnly"],
});
const eventNote: Log = {
  id: "log1",
  kind: "log",
  date: "2026-03-15",
  title: "Prep",
  body: "n",
  private: false,
  source: "manual",
  entityIds: ["e1"],
  topics: ["latency"],
  classificationStatus: "classified",
  attachmentIds: [],
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
} as Log;
const topicNote: Log = {
  id: "log2",
  kind: "log",
  date: "2026-03-10",
  title: "Direct",
  body: "n",
  private: false,
  source: "manual",
  entityIds: ["t1"],
  topics: ["directOnly"],
  classificationStatus: "classified",
  attachmentIds: [],
  createdAt: "2026-03-10T12:00:00.000Z",
  updatedAt: "2026-03-10T12:00:00.000Z",
} as Log;

const data: ArgusData = {
  entities: [topic, event],
  logs: [eventNote, topicNote],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: ["latency", "BinderOnly", "directOnly", "TopicBinder", "NearbyOnly"],
} as unknown as ArgusData;

// Event Watched: binder ∪ note Tags only
const eventOwned = ownershipTagsForEntity(data, [], "e1", true);
assert.ok(eventOwned.some((t) => t.toLowerCase() === "binderonly"));
assert.ok(eventOwned.some((t) => t.toLowerCase() === "latency"));
assert.ok(!eventOwned.some((t) => t.toLowerCase() === "directonly"));

assert.ok(entityHasTracker(data, [], "e1", true));
const eventWatched = watchedTrackerTagsOnEntity(data, [], "e1", true);
assert.ok(eventWatched.some((t) => /binderonly/i.test(t)));
assert.ok(eventWatched.some((t) => /latency/i.test(t)));

// Topic ownership vocabulary for Watched includes linked Event tags
const topicOwned = ownershipTagsForEntity(data, [], "t1", true);
assert.ok(topicOwned.some((t) => /topicbinder/i.test(t)));
assert.ok(topicOwned.some((t) => /directonly/i.test(t)));
assert.ok(topicOwned.some((t) => /binderonly/i.test(t)), "Topic Watched includes Event binder");
assert.ok(topicOwned.some((t) => /latency/i.test(t)), "Topic Watched includes Event notes");

// Topic Trackers-section local ownership excludes Event tags
const topicLocal = topicLocalOwnershipTags(data, [], "t1", true);
assert.ok(topicLocal.some((t) => /topicbinder/i.test(t)));
assert.ok(topicLocal.some((t) => /directonly/i.test(t)));
assert.ok(!topicLocal.some((t) => /binderonly/i.test(t)));
assert.ok(!topicLocal.some((t) => /latency/i.test(t)));

// Home Treemap hasTracker uses definition D (binder counts)
const nodes = buildV2KnowledgeNodes(data, [], true, "2026-08-13");
const topicNode = nodes.find((n) => n.id === "t1");
assert.ok(topicNode);
assert.equal(topicNode!.hasTracker, true, "Topic hasTracker when Flagged binder/evidence present");

// Binder-only Flag on Event-linked Topic still Watches Topic via rollup
const binderOnlyData = {
  ...data,
  signalTags: ["BinderOnly"],
  logs: [eventNote],
} as unknown as ArgusData;
assert.ok(entityHasTracker(binderOnlyData, [], "t1", true));
assert.ok(entityHasTracker(binderOnlyData, [], "e1", true));

// Nearby-only Flag does not Watch Event (not on binder or notes)
const nearbyData = {
  ...data,
  signalTags: ["NearbyOnly"],
} as unknown as ArgusData;
assert.equal(entityHasTracker(nearbyData, [], "e1", true), false);
assert.equal(entityHasTracker(nearbyData, [], "t1", true), false);

console.log("ok: entity-watched-definition-d");
