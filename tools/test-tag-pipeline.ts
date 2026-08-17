/**
 * One Tag pipeline: Tag tabs, Notes, and Home vocabulary cannot drift.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity, Log } from "../lib/argus/types";
import {
  applyBinderTagSync,
  diffTagLists,
  ensureTagsInPipeline,
  evidenceTagKeysForEntity,
  mergeEvidenceTagsIntoBinders,
  pruneBinderTagsMissingEvidence,
  registerHomeVocabulary,
  stripTagsFromEntityEvidence,
} from "../lib/argus/v2/tag-pipeline";
import { readTagsForRole } from "../lib/argus/tag-ontology";

const root = process.cwd();
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const storage = readFileSync(join(root, "lib/argus/server-storage.ts"), "utf8");
const portfolio = readFileSync(
  join(root, "app/argus/v2/components/V2FocusTagPortfolio.tsx"),
  "utf8"
);

assert.match(storage, /export async function applyBinderTagPipeline/, "server applyBinderTagPipeline");
assert.match(storage, /export async function ensureTagsInPipeline/, "server ensureTagsInPipeline");
assert.match(storage, /registerHomeVocabulary\(data, \[display\]\)/, "Flag registers Home Tags");
assert.match(storage, /mergeEvidenceTagsIntoBinders/, "createLog merges Note Tags onto binders");
assert.match(storage, /pruneBinderTagsMissingEvidence/, "updateLog prunes binder when Notes drop a Tag");

assert.match(actions, /applyBinderTagPipeline\(entityId, eventTags\)/, "Event Tags tab uses pipeline");
assert.match(actions, /applyBinderTagPipeline\(entityId, linkedTags\)/, "Topic Tags tab uses pipeline");
assert.match(actions, /applyBinderTagPipeline\(entityId, projectTags\)/, "Project Tags tab uses pipeline");
assert.match(actions, /ensureTagsInPipeline\(id, incoming\)/, "Note Add uses pipeline");
assert.match(actions, /deleteTagInlineAction/, "Home Tags delete still exists");
assert.match(actions, /createGlobalTagAction/, "Home Tags create still exists");
assert.match(portfolio, /createGlobalTagAction/, "Home Tags Create UI");
assert.match(portfolio, /deleteTagInlineAction/, "Home Tags Delete UI");

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "name" | "type">): Entity {
  return {
    notes: "",
    linkedEntityIds: [],
    linkedPersonIds: [],
    linkedTopicIds: [],
    linkedEventIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    strategicValue: 3,
    ...partial,
  };
}

function log(partial: Partial<Log> & Pick<Log, "id" | "body" | "entityIds" | "topics">): Log {
  return {
    kind: "log",
    date: "2026-08-10",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
    title: "Note",
    classificationStatus: "classified",
    private: false,
    source: "manual",
    attachmentIds: [],
    ...partial,
  };
}

function fixture(): ArgusData {
  return {
    version: 3,
    entities: [
      entity({
        id: "e1",
        name: "SLB review",
        type: "other",
        notes: "Kind: Event\nChronicle: v2\n---",
        eventTags: ["latency", "binder-only"],
      }),
      entity({
        id: "t1",
        name: "Handoff",
        type: "other",
        notes: "Kind: Topic",
        topicTags: ["handoff"],
        linkedTags: ["handoff"],
      }),
      entity({
        id: "p1",
        name: "Alpha",
        type: "project",
        projectTags: ["trading"],
      }),
    ],
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
}

let seq = 0;
const ids = {
  nowIso: "2026-08-17T12:00:00.000Z",
  newId: () => `new-${++seq}`,
};

assert.deepEqual(diffTagLists(["latency", "old"], ["latency", "new"]), {
  added: ["new"],
  removed: ["old"],
});

const addData = fixture();
const added = applyBinderTagSync(addData, "e1", ["latency", "new-tag"], ids);
assert.deepEqual(added.added, ["new-tag"]);
assert.deepEqual(added.removed, ["binder-only"]);
assert.ok(added.placeholderCount >= 1, "new Tag creates Note evidence");
assert.ok(evidenceTagKeysForEntity(addData, "e1").has("new-tag"), "Note has added Tag");
assert.equal(evidenceTagKeysForEntity(addData, "e1").has("binder-only"), false, "removed Tag stripped from Notes");
assert.deepEqual(readTagsForRole(addData, "event", { entityId: "e1" }), ["latency", "new-tag"]);
assert.ok(addData.globalTags?.includes("new-tag"), "create registers Home Tags vocabulary");
assert.equal(
  addData.logs.find((row) => row.id === "l1")?.topics.includes("latency"),
  true,
  "unrelated Note Tags stay"
);

const deleteData = fixture();
const deleted = applyBinderTagSync(deleteData, "e1", ["binder-only"], ids);
assert.deepEqual(deleted.removed, ["latency"]);
assert.equal(evidenceTagKeysForEntity(deleteData, "e1").has("latency"), false, "Tag tab delete strips Notes");
assert.deepEqual(deleteData.logs.find((row) => row.id === "l1")?.topics, [], "Note remains; Tag membership gone");

const topicData = fixture();
topicData.logs.push(
  log({
    id: "lt",
    body: "Tagged: #handoff",
    entityIds: ["t1"],
    topics: ["handoff"],
  })
);
applyBinderTagSync(topicData, "t1", [], ids);
assert.deepEqual(readTagsForRole(topicData, "topic", { entityId: "t1" }), []);
assert.deepEqual(
  topicData.logs.find((row) => row.id === "lt")?.topics,
  [],
  "Topic Tag tab delete strips Topic Notes"
);

const projectAdd = fixture();
ensureTagsInPipeline(projectAdd, "p1", ["risk"], ids);
assert.ok(readTagsForRole(projectAdd, "project", { entityId: "p1" }).includes("risk"));
assert.ok(evidenceTagKeysForEntity(projectAdd, "p1").has("risk"), "Project Tag create writes Notes");
assert.ok(projectAdd.globalTags?.includes("risk"), "Project Tag create hits Home Tags");

const noteFirst = fixture();
noteFirst.logs.push(
  log({
    id: "l2",
    body: "Tagged: #from-note",
    entityIds: ["e1"],
    topics: ["from-note"],
  })
);
mergeEvidenceTagsIntoBinders(noteFirst, ["e1"], ["from-note"]);
assert.ok(
  readTagsForRole(noteFirst, "event", { entityId: "e1" }).some((tag) => tag.toLowerCase() === "from-note"),
  "Note Tags merge onto Event Tags tab"
);
assert.ok(noteFirst.globalTags?.includes("from-note"), "Note create registers Home Tags");

const pruneData = fixture();
stripTagsFromEntityEvidence(pruneData, "e1", ["latency"]);
pruneBinderTagsMissingEvidence(pruneData, ["e1"], ["latency"]);
assert.equal(
  readTagsForRole(pruneData, "event", { entityId: "e1" }).some((tag) => tag.toLowerCase() === "latency"),
  false,
  "last Note delete prunes the Tags tab"
);
assert.ok(
  readTagsForRole(pruneData, "event", { entityId: "e1" }).includes("binder-only"),
  "other binder Tags stay until their Notes are gone"
);

const home = fixture();
assert.equal(registerHomeVocabulary(home, ["WatchMe"]), 1);
assert.equal(registerHomeVocabulary(home, ["WatchMe"]), 0, "Home register is idempotent");

console.log("ok: tag-pipeline");
