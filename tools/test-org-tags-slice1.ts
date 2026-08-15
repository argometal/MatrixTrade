/**
 * Slice 1 — Organization Tags: direct evidence inventory + watched intersection.
 * Patterns stay threshold-driven; linked-child Tags do not inflate Org Tags.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity, InboxItem, Log } from "../lib/argus/types";
import { TAG_PATTERN_MIN_COUNT } from "../lib/argus/tag-limits";
import { loadOrganizationPageData } from "../lib/argus/v2/loaders";

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

function log(partial: Partial<Log> & Pick<Log, "id" | "date" | "topics" | "entityIds">): Log {
  return {
    kind: "log",
    title: "note",
    body: "body",
    private: false,
    source: "manual",
    classificationStatus: "classified",
    attachmentIds: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial,
  } as Log;
}

const today = "2026-08-15";
const org = entity({ id: "org1", name: "Acme", type: "company" });
const project = entity({
  id: "p1",
  name: "Child Project",
  type: "project",
  linkedEntityIds: ["org1"],
});
const topic = entity({
  id: "t1",
  name: "Child Topic",
  type: "other",
  notes: "Kind: Topic",
  linkedEntityIds: ["org1"],
});

const orgNote = log({
  id: "log-org",
  date: "2026-08-10",
  entityIds: ["org1"],
  topics: ["handover", "planning"],
});
const orgNote2 = log({
  id: "log-org-2",
  date: "2026-08-11",
  entityIds: ["org1"],
  topics: ["handover"],
});
const orgNote3 = log({
  id: "log-org-3",
  date: "2026-08-12",
  entityIds: ["org1"],
  topics: ["handover"],
});
const projectOnly = log({
  id: "log-project",
  date: "2026-08-10",
  entityIds: ["p1"],
  topics: ["child-only", "latency"],
});
const topicOnly = log({
  id: "log-topic",
  date: "2026-08-10",
  entityIds: ["t1"],
  topics: ["topic-child"],
});

const data = {
  version: 3,
  signalTags: ["handover", "unrelated-flag"],
  entities: [org, project, topic],
  logs: [orgNote, orgNote2, orgNote3, projectOnly, topicOnly],
  inboxItems: [],
  attachments: [],
  runbooks: [],
} as unknown as ArgusData;

const inbox: InboxItem[] = [];
const page = loadOrganizationPageData(data, inbox, org, true, today);

assert.ok(
  page.directEvidenceTags.some((t) => /handover/i.test(t)),
  "direct evidence includes Org note Tags"
);
assert.ok(
  page.directEvidenceTags.some((t) => /planning/i.test(t)),
  "direct evidence includes singleton Org Tags"
);
assert.ok(
  !page.directEvidenceTags.some((t) => /child-only/i.test(t)),
  "linked-project-only Tags do not appear"
);
assert.ok(
  !page.directEvidenceTags.some((t) => /latency/i.test(t)),
  "linked-project Tags do not appear on Org"
);
assert.ok(
  !page.directEvidenceTags.some((t) => /topic-child/i.test(t)),
  "linked-topic-only Tags do not appear"
);

assert.deepEqual(
  page.watchedHere.map((t) => t.toLowerCase()).sort(),
  ["handover"],
  "watchedHere is signalTags ∩ direct evidence only"
);
assert.ok(
  !page.watchedHere.some((t) => /unrelated-flag/i.test(t)),
  "Flagged Tag with no Org evidence is not watchedHere"
);
assert.ok(
  !page.watchedHere.some((t) => /planning/i.test(t)),
  "direct evidence Tag without Flag is not watchedHere"
);

assert.ok(
  page.tagPatterns.some((p) => /handover/i.test(p.tag) && p.count >= TAG_PATTERN_MIN_COUNT),
  "Patterns remain threshold-driven (handover ×3)"
);
assert.ok(
  !page.tagPatterns.some((p) => /planning/i.test(p.tag)),
  "singleton planning is evidence but not a Pattern"
);

const root = join(process.cwd());
const orgShell = readFileSync(join(root, "app/argus/v2/components/V2OrgShell.tsx"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");

assert.match(orgShell, /directEvidenceTags/, "Org Tags UI receives direct evidence");
assert.match(orgShell, /watchedHere/, "Org Tags UI receives watchedHere");
assert.match(orgShell, /Go to Tags →/, "passive path to global Tags");
assert.match(
  orgShell,
  /No Tags on evidence linked directly to this Organization/,
  "empty state explains direct evidence"
);
assert.doesNotMatch(orgShell, /V2TrackerTogglePanel/, "no Flag/Disable on Org Tags");
assert.doesNotMatch(
  orgShell,
  /organization'?s neighborhood|detected in this organization/,
  "Org Tags copy drops neighborhood inheritance"
);
assert.match(help, /linked directly to this Organization/, "org-tags help explains direct evidence");
const orgTagsHelp = help.slice(help.indexOf('id: "org-tags"'), help.indexOf('id: "inbox"'));
assert.match(orgTagsHelp, /passive Tracker|Watched here/i, "org-tags help covers passive Tracker state");
assert.doesNotMatch(orgTagsHelp, /neighborhood/, "org-tags help drops neighborhood language");

console.log("ok: org-tags-slice1");
