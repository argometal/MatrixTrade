/**
 * Topic Empty status must respect event binders stored in any outbound bag
 * (linkedEntityIds, linkedTopicIds, linkedEventIds) and reverse links.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity } from "../lib/argus/types";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  outboundStructuralIds,
} from "../lib/argus/v2/scope-node-counts";
import {
  buildV2TopicBrowseCards,
  topicRowIsEmpty,
  type V2TopicDetail,
  type V2TopicRow,
} from "../lib/argus/v2/topic-browse-utils";

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
const eventViaLegacyBag = entity({
  id: "e1",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedTopicIds: ["t1"],
});
const eventViaEntityIds = entity({
  id: "e2",
  name: "Sync",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["t1"],
});
const lonelyTopic = entity({
  id: "t2",
  name: "Lonely",
  type: "other",
  notes: "Kind: Topic",
});

const data: ArgusData = {
  entities: [topic, eventViaLegacyBag, eventViaEntityIds, lonelyTopic],
  logs: [],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

assert.deepEqual(
  outboundStructuralIds(eventViaLegacyBag).sort(),
  ["t1"],
  "legacy linkedTopicIds must count as outbound"
);

const neighbors = collectNeighborEntityIds(data, topic, []);
assert.ok(neighbors.has("e1"), "reverse: event.linkedTopicIds → topic neighbor");
assert.ok(neighbors.has("e2"), "reverse: event.linkedEntityIds → topic neighbor");

const counts = countTopicsAndEventsInScope(data, topic, []);
assert.equal(counts.eventCount, 2, "topic should see both linked events");

const linkedRow: V2TopicRow = {
  id: "t1",
  name: "Alpha Topic",
  lastActivity: "—",
  lastSort: "",
  journalCount: 0,
  emailCount: 0,
  fileCount: 0,
  evidenceCount: 0,
  eventCount: 2,
  aliases: [],
  evidenceTags: [],
  patternCount: 0,
  linkedOrgIds: [],
  linkedProjectIds: [],
  linkedEntityIds: ["e1", "e2"],
  searchText: "",
};
assert.equal(topicRowIsEmpty(linkedRow), false, "linked topic is not Empty");

const emptyRow: V2TopicRow = {
  ...linkedRow,
  id: "t2",
  name: "Lonely",
  eventCount: 0,
  linkedEntityIds: [],
};
assert.equal(topicRowIsEmpty(emptyRow), true, "lonely topic is Empty");

const detail: V2TopicDetail = {
  id: "t1",
  name: "Alpha Topic",
  category: "Topic",
  description: "",
  orgCount: 0,
  projectCount: 0,
  peopleCount: 0,
  eventCount: 2,
  journalCount: 0,
  emailCount: 0,
  fileCount: 0,
  photoCount: 0,
  evidenceCount: 0,
  linkedEntityIds: [],
  neighborEntityIds: ["e1", "e2"],
  linkedEntities: [],
  linkedEvents: [
    { id: "e1", name: "Kickoff", href: "#" },
    { id: "e2", name: "Sync", href: "#" },
  ],
  aliases: [],
  hasPrivateEvidence: false,
  deleteRequiresAuthenticator: false,
  evidence: [],
  tagPatterns: [],
  evidenceTagCounts: [],
  eventEvidenceTags: [],
};

const cards = buildV2TopicBrowseCards([linkedRow, emptyRow], [detail]);
assert.equal(cards.find((c) => c.id === "t1")?.status, "Quiet");
assert.equal(cards.find((c) => c.id === "t2")?.status, "Empty");

console.log("ok: topic-event-link-empty");
