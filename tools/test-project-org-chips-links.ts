/**
 * Project / Org overview chips must recognize reverse structural links
 * (people, orgs, emails via contacts) — same set as the Link modal.
 */
import assert from "node:assert/strict";
import type { ArgusData, Entity, InboxItem } from "../lib/argus/types";
import { getProjectEvidenceScope, projectLinkedPersonIds } from "../lib/argus/project-evidence-scope";
import { loadOrganizationPageData, loadProjectPageData } from "../lib/argus/v2/loaders";
import { organizationRosterPersonIds } from "../lib/argus/v2/hierarchy";
import { buildV2ProjectBrowseCards } from "../lib/argus/v2/project-browse-utils";
import { buildV2OrganizationBrowseCards } from "../lib/argus/v2/organization-browse-utils";

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
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  // Org only outbound; people/topic/event arrive reverse-only
  linkedEntityIds: [],
});
const person = entity({
  id: "p1",
  name: "Vic",
  type: "person",
  linkedEntityIds: ["proj1", "org1"],
});
const otherOrg = entity({
  id: "org2",
  name: "Partner Co",
  type: "company",
  linkedEntityIds: ["proj1"],
});
const topic = entity({
  id: "t1",
  name: "Scope",
  type: "other",
  notes: "Kind: Topic",
  linkedEntityIds: ["proj1", "org1"],
});
const event = entity({
  id: "e1",
  name: "Kickoff",
  type: "other",
  notes: "Kind: Event\nChronicle: v2\n---",
  linkedEntityIds: ["proj1", "org1", "p1"],
});

const inbox: InboxItem[] = [
  {
    id: "mail1",
    subject: "Hello Vic",
    from: "vic@example.com",
    receivedAt: "2026-06-15T12:00:00.000Z",
    status: "linked",
    linkedEntityIds: ["p1"],
    createdAt: "2026-06-15T12:00:00.000Z",
    updatedAt: "2026-06-15T12:00:00.000Z",
  } as unknown as InboxItem,
];

const data: ArgusData = {
  entities: [org, project, person, otherOrg, topic, event],
  logs: [],
  inbox,
  attachments: [],
  runbooks: [],
  runbookProgress: [],
  signalTags: [],
} as unknown as ArgusData;

const today = "2026-08-14";

assert.deepEqual(projectLinkedPersonIds(data, project).sort(), ["p1"]);
assert.deepEqual(organizationRosterPersonIds(data, org).sort(), ["p1"]);

const projectPage = loadProjectPageData(data, inbox, project, true, today);
assert.equal(projectPage.stats.people, 1, "project People chip includes reverse person");
assert.equal(projectPage.stats.organizations, 1, "project Org chip includes reverse org");
assert.equal(projectPage.stats.topics, 1, "project Topics chip");
assert.equal(projectPage.stats.events, 1, "project Events chip");
assert.equal(projectPage.stats.emails, 1, "project Emails via reverse contact");
assert.ok(projectPage.peopleWithRoles.some((p) => p.id === "p1"));
assert.ok(projectPage.org?.id === "org2");
assert.ok(projectPage.linkModalIds.includes("p1"));
assert.ok(projectPage.linkModalIds.includes("org2"));

const orgPage = loadOrganizationPageData(data, inbox, org, true, today);
assert.equal(orgPage.stats.people, 1, "org People chip includes reverse person");
assert.equal(orgPage.stats.topics, 1);
assert.equal(orgPage.stats.events, 1);
assert.ok(orgPage.linkedPeople.some((p) => p.id === "p1"));

const scope = getProjectEvidenceScope(data, inbox, project, true);
assert.equal(scope.emailCount, 1);
assert.equal(scope.viaContactInbox.length, 1);

const projectCards = buildV2ProjectBrowseCards(data, inbox, true, today);
const projectCard = projectCards.find((c) => c.id === "proj1")!;
assert.equal(projectCard.metrics.people, 1);
assert.equal(projectCard.metrics.emails, 1);
assert.equal(projectCard.metrics.topics, 1);
assert.equal(projectCard.metrics.events, 1);

const orgCards = buildV2OrganizationBrowseCards(data, inbox, true, today);
const orgCard = orgCards.find((c) => c.id === "org1")!;
assert.equal(orgCard.metrics.people, 1);
assert.equal(orgCard.metrics.topics, 1);
assert.equal(orgCard.metrics.events, 1);

console.log("ok: project-org-chips-links");
