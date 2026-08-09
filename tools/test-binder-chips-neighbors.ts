/**
 * Topics/Events chips on Org/Project/Person must use neighbor binder refs,
 * never evidence tag strings — including reverse-only links.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import { loadOrganizationPageData, loadProjectPageData } from "../lib/argus/v2/loaders";
import { buildNetworkContactPageData } from "../lib/argus/v2/network-contact-loaders";
import { buildV2TopicDetails } from "../lib/argus/v2/topic-loaders";
import { buildV2EventDetails } from "../lib/argus/v2/event-loaders";
import { linkModalStructuralIds } from "../lib/argus/v2/scope-node-counts";

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

const org = entity({ id: "org1", name: "Acme", type: "company" });
const project = entity({
  id: "proj1",
  name: "Rollout",
  type: "project",
  linkedEntityIds: ["org1"],
});
const person = entity({ id: "p1", name: "Vic", type: "person" });
const topic = entity({
  id: "t1",
  name: "Vic performance",
  type: "other",
  notes: "Kind: Topic",
  // Topic → project/org/person (reverse from their perspective)
  linkedEntityIds: ["proj1", "org1", "p1"],
});
const event = entity({
  id: "e1",
  name: "Q1 review",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["t1", "proj1", "org1", "p1"],
});

const data: ArgusData = {
  entities: [org, project, person, topic, event],
  logs: [],
  inbox: [],
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

const today = "2026-08-09";

const orgPage = loadOrganizationPageData(data, [], org, true, today);
assert.ok(
  orgPage.linkedTopics.some((t) => t.id === "t1"),
  "org Topics chips must include reverse-linked topic entity"
);
assert.ok(
  orgPage.linkedEvents.some((e) => e.id === "e1"),
  "org Events chips must include reverse-linked event entity"
);
assert.equal(orgPage.stats.topics, 1);
assert.equal(orgPage.stats.events, 1);
assert.ok(orgPage.linkModalIds.includes("t1"));
assert.ok(orgPage.linkModalIds.includes("e1"));
// Must not be evidence-tag strings
assert.equal(typeof orgPage.linkedTopics[0], "object");
assert.ok("href" in orgPage.linkedTopics[0]);

const projectPage = loadProjectPageData(data, [], project, true, today);
assert.ok(projectPage.linkedTopics.some((t) => t.id === "t1"), "project Topics chips");
assert.ok(projectPage.linkedEvents.some((e) => e.id === "e1"), "project Events chips");
assert.ok(projectPage.linkModalIds.includes("t1"));

const personPage = buildNetworkContactPageData({
  data,
  entity: person,
  inboxItems: [],
  logs: [] as Log[],
  enrichedInbox: [],
  includePrivate: true,
  today,
});
assert.ok(personPage.relatedTopics.some((t) => t.id === "t1"), "person Linked topics");
assert.ok(personPage.relatedEvents.some((e) => e.id === "e1"), "person Linked events");
assert.ok(personPage.linkModalIds.includes("t1"));

const topicDetails = buildV2TopicDetails(data, [], true, today);
const topicDetail = topicDetails.find((d) => d.id === "t1")!;
assert.ok(topicDetail.linkedEntityIds.includes("proj1"), "topic Link seeds project");
assert.ok(topicDetail.linkedEntityIds.includes("org1"), "topic Link seeds org");
assert.ok(topicDetail.linkedEvents.some((e) => e.id === "e1"), "topic Events list");
assert.ok(
  topicDetail.linkedEntities.some((e) => e.id === "proj1"),
  "topic Connections includes project"
);
assert.ok(
  topicDetail.linkedEntities.some((e) => e.id === "org1"),
  "topic Connections includes org"
);

const eventDetails = buildV2EventDetails(data, [], true, today);
const eventDetail = eventDetails.find((d) => d.id === "e1")!;
assert.ok(eventDetail.linkedTopics.some((t) => t.id === "t1"), "event Metrics topic chips");
assert.ok(eventDetail.linkedEntityIds.includes("org1"), "event Link seeds org");
assert.ok(linkModalStructuralIds(data, topic).includes("e1"));

console.log("ok: binder-chips-neighbors");
