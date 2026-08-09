/**
 * Event→Topic one-way binders must surface on the Topic (Connections, Events pill, Link seed).
 * Also covers Kind lines that are not at byte 0 (leading newline / whitespace).
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity } from "../lib/argus/types";
import { referenceKindFromNotes, entityNotesForDisplay } from "../lib/argus/reference-types";
import {
  collectNeighborEntityIds,
  countTopicsAndEventsInScope,
  linkModalStructuralIds,
} from "../lib/argus/v2/scope-node-counts";
import { buildV2TopicDetails, buildV2TopicRows } from "../lib/argus/v2/topic-loaders";
import { buildV2TopicBrowseCards } from "../lib/argus/v2/topic-browse-utils";

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

// Kind parsing must survive leading whitespace / blank lines (common after edits).
assert.equal(referenceKindFromNotes("\nKind: Topic"), "topic");
assert.equal(referenceKindFromNotes(" Kind: Event\nChronicle: v2\n---"), "event");
assert.equal(referenceKindFromNotes("\ufeffKind: Topic"), "topic");
assert.equal(referenceKindFromNotes("Blurb\nKind: Event\n---"), "event");
assert.equal(entityNotesForDisplay("\nKind: Topic\nAbout Vic").includes("Kind:"), false);
assert.ok(entityNotesForDisplay("\nKind: Topic\nAbout Vic").includes("About Vic"));

const topic = entity({
  id: "topic-vic",
  name: "Vic performance",
  type: "other",
  notes: "Kind: Topic",
});
const event = entity({
  id: "event-1",
  name: "Q1 review",
  type: "other",
  // Leading newline — previously broke Kind detection and dropped reverse counts.
  notes: "\nKind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["topic-vic"],
});

const data: ArgusData = {
  entities: [topic, event],
  logs: [],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

assert.equal(referenceKindFromNotes(event.notes), "event", "event Kind must parse");

const neighbors = collectNeighborEntityIds(data, topic, []);
assert.ok(neighbors.has("event-1"), "reverse: event.linkedEntityIds → topic neighbor");

const counts = countTopicsAndEventsInScope(data, topic, []);
assert.equal(counts.eventCount, 1, "topic Events count from one-way Event→Topic");

const linkSeed = linkModalStructuralIds(data, topic);
assert.ok(linkSeed.includes("event-1"), "Topic Link modal must seed reverse event binder");

const today = "2026-08-09";
const details = buildV2TopicDetails(data, [], true, today);
const detail = details.find((d) => d.id === "topic-vic");
assert.ok(detail, "topic detail exists");
assert.equal(detail!.eventCount, 1, "detail.eventCount");
assert.equal(detail!.linkedEvents.length, 1, "Connections Events list");
assert.equal(detail!.linkedEvents[0]?.id, "event-1");
assert.ok(
  detail!.linkedEntityIds.includes("event-1"),
  "Link button linkedIds includes reverse event"
);

const rows = buildV2TopicRows(data, [], true, today);
const cards = buildV2TopicBrowseCards(rows, details);
const card = cards.find((c) => c.id === "topic-vic");
assert.ok(card);
assert.equal(card!.metrics.events, 1, "browse card Events pill");
assert.notEqual(card!.status, "Empty", "linked topic is not Empty");

console.log("ok: topic-event-reverse-link");
