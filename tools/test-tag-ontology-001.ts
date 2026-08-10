/**
 * ORDER 001 — tag ontology adapter smoke tests.
 */
import assert from "node:assert/strict";
import {
  binderTagWritePatch,
  countTagsByRole,
  normalizeTagList,
  readTagsForRole,
  tagKey,
} from "../lib/argus/tag-ontology";
import type { ArgusData, Entity } from "../lib/argus/types";
import {
  buildV2FocusTagPortfolio,
  buildV2TagRoleBucketSummary,
  filterFocusTagsByRole,
} from "../lib/argus/v2/loaders";

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "type" | "name">): Entity {
  return {
    notes: "",
    strategicValue: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const data: ArgusData = {
  version: 3,
  signalTags: ["WatchMe"],
  globalTags: ["Important"],
  entities: [
    entity({
      id: "t1",
      type: "other",
      name: "Risk",
      notes: "Kind: topic",
      linkedTags: ["legacy-topic"],
      topicTags: ["Risk Mgmt"],
    }),
    entity({
      id: "p1",
      type: "project",
      name: "Alpha",
      linkedTags: ["legacy-project"],
      projectTags: ["Trading"],
    }),
    entity({
      id: "e1",
      type: "other",
      name: "Call",
      notes: "Kind: event",
      linkedTags: ["should-not-read"],
      eventTags: ["Trade Entry"],
    }),
  ],
  logs: [
    {
      id: "l1",
      kind: "event",
      date: "2026-01-02",
      title: "Note",
      body: "x",
      entityIds: ["e1"],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["EvidenceA"],
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  inboxItems: [],
  attachments: [],
  runbooks: [],
};

assert.equal(tagKey("  Risk Mgmt "), "risk mgmt");
assert.deepEqual(normalizeTagList(["A", "a", " B "]), ["A", "B"]);

assert.deepEqual(readTagsForRole(data, "topic", { entityId: "t1" }), ["Risk Mgmt"]);
assert.deepEqual(readTagsForRole(data, "project", { entityId: "p1" }), ["Trading"]);
assert.deepEqual(readTagsForRole(data, "event", { entityId: "e1" }), ["Trade Entry"]);
assert.deepEqual(readTagsForRole(data, "global"), ["Important"]);
assert.deepEqual(readTagsForRole(data, "evidence", { entityId: "e1" }), ["EvidenceA"]);

// Event linkedTags must not leak as Event Tags
assert.ok(!readTagsForRole(data, "event", { entityId: "e1" }).includes("should-not-read"));

const topicPatch = binderTagWritePatch(data.entities[0], "topic", ["New"]);
assert.deepEqual(topicPatch.topicTags, ["New"]);
assert.deepEqual(topicPatch.linkedTags, ["New"]);

const counts = countTagsByRole(data);
assert.equal(counts.topic >= 1, true);
assert.equal(counts.evidence >= 1, true);
assert.equal(counts.global, 1);

const roleSummary = buildV2TagRoleBucketSummary(data);
assert.equal(roleSummary.find((b) => b.role === "global")?.count, 1);
assert.equal(roleSummary.find((b) => b.role === "event")?.count, 1);

const portfolio = buildV2FocusTagPortfolio(data, [], true, "2026-08-10");
const evidenceOnly = filterFocusTagsByRole(portfolio, "evidence");
assert.ok(evidenceOnly.some((r) => r.name === "EvidenceA"));
assert.ok(portfolio.some((r) => r.roles.includes("topic") && r.name === "Risk Mgmt"));
assert.ok(portfolio.some((r) => r.roles.includes("project") && r.name === "Trading"));
assert.ok(portfolio.some((r) => r.roles.includes("event") && r.name === "Trade Entry"));
assert.ok(!portfolio.some((r) => r.name === "should-not-read"));

console.log("ok: tag-ontology-001");
