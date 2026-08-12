/**
 * Project / Org Timeline must include linked Topic + Event anchors and their Notes.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, InboxItem, Log } from "../lib/argus/types";
import { loadOrganizationPageData, loadProjectPageData } from "../lib/argus/v2/loaders";

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

const org = entity({
  id: "org1",
  name: "Acme",
  type: "company",
  linkedEntityIds: ["p1"],
});
const project = entity({
  id: "p1",
  name: "Alpha",
  type: "project",
  linkedEntityIds: ["org1", "t1", "e1"],
  linkedTopicIds: ["t1"],
  linkedEventIds: ["e1"],
  startDate: "2026-01-01",
  endDate: "2026-12-31",
});
const topic = entity({
  id: "t1",
  name: "Supply risk",
  type: "other",
  notes: "Kind: Topic",
  linkedEntityIds: ["p1"],
});
const event = entity({
  id: "e1",
  name: "Q1 review",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  startDate: "2026-03-15",
  linkedEntityIds: ["p1", "t1"],
});

const noteOnEvent: Log = {
  id: "log-e1",
  title: "Event prep",
  body: "on the Event",
  kind: "note",
  date: "2026-03-15",
  entityIds: ["e1"],
  topics: ["prep"],
  attachmentIds: [],
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
} as unknown as Log;

const noteOnTopic: Log = {
  id: "log-t1",
  title: "Topic note",
  body: "on the Topic",
  kind: "note",
  date: "2026-04-01",
  entityIds: ["t1"],
  topics: ["supply"],
  attachmentIds: [],
  createdAt: "2026-04-01T12:00:00.000Z",
  updatedAt: "2026-04-01T12:00:00.000Z",
} as unknown as Log;

const data: ArgusData = {
  entities: [org, project, topic, event],
  logs: [noteOnEvent, noteOnTopic],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

const projectPage = loadProjectPageData(data, [] as InboxItem[], project, true, "2026-08-12", {
  respectProjectDates: false,
});
assert.ok(
  projectPage.timeline.some((e) => e.id === "anchor-event-e1"),
  "Project Timeline includes Event anchor"
);
assert.ok(
  projectPage.timeline.some((e) => e.id === "anchor-topic-t1"),
  "Project Timeline includes Topic anchor"
);
assert.ok(
  projectPage.timeline.some((e) => e.id === "log-e1"),
  "Project Timeline includes Note on linked Event"
);
assert.ok(
  projectPage.timeline.some((e) => e.id === "log-t1"),
  "Project Timeline includes Note on linked Topic"
);
assert.ok(
  projectPage.timeline.some((e) => e.kind === "event" && e.title === "Q1 review"),
  "Event filter chip can match Event anchors"
);
assert.ok(
  projectPage.timeline.some((e) => e.kind === "topic" && e.title === "Supply risk"),
  "Topics filter chip can match Topic anchors"
);

const orgPage = loadOrganizationPageData(data, [] as InboxItem[], org, true, "2026-08-12");
assert.ok(
  orgPage.timeline.some((e) => e.id === "anchor-event-e1"),
  "Org Timeline includes Event from child project"
);
assert.ok(
  orgPage.timeline.some((e) => e.id === "anchor-topic-t1"),
  "Org Timeline includes Topic from child project"
);
assert.ok(
  orgPage.timeline.some((e) => e.id === "log-e1"),
  "Org Timeline includes Note on Event under project"
);

console.log("ok: project-org-timeline-portfolio");
