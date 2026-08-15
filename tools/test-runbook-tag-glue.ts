/**
 * Smoke: Runbook ↔ Tag glue — classification metadata, Pattern evidence-only,
 * suggestion matching/ranking, create-from-suggestion tags, no new TagRole.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  matchingRunbookSuggestionTags,
  rankRunbookSuggestions,
  runbookClassificationTags,
  runbookMatchesSuggestionKeys,
  scopeRunbookSuggestionKeys,
  scoreRunbookSuggestionMatch,
  suggestionTagsForCreate,
} from "../lib/argus/runbook-helpers";
import { buildTagPatternsForScope } from "../lib/argus/v2/tag-patterns";
import {
  TAG_ROLES,
  collectKnownTagVocabulary,
  countTagsByRole,
  normalizeTagList,
} from "../lib/argus/tag-ontology";
import { normalizeRunbook } from "../lib/argus/normalize";
import type { ArgusData, Runbook } from "../lib/argus/types";

const root = process.cwd();

assert.deepEqual(
  TAG_ROLES,
  ["project", "topic", "event", "global", "evidence"],
  "no runbook TagRole"
);

const template: Runbook = {
  id: "rb-bha",
  title: "BHA",
  items: [],
  linkedEntityIds: ["org1"],
  tags: ["BHA", "handover", "BHA"],
  createdAt: "",
  updatedAt: "2026-08-10T00:00:00.000Z",
};

assert.deepEqual(runbookClassificationTags(template), ["BHA", "handover"]);

const keys = scopeRunbookSuggestionKeys(["handover", "drop ball"]);
assert.equal(runbookMatchesSuggestionKeys(template, keys), true);
assert.deepEqual(matchingRunbookSuggestionTags(template, keys), ["handover"]);
assert.equal(
  runbookMatchesSuggestionKeys({ tags: ["unrelated"] }, keys),
  false,
  "no match does not suggest"
);
assert.equal(
  runbookMatchesSuggestionKeys({ tags: ["handover"] }, scopeRunbookSuggestionKeys([])),
  false,
  "empty scope never auto-suggests"
);
assert.deepEqual(
  matchingRunbookSuggestionTags({ tags: ["handover"] }, scopeRunbookSuggestionKeys([])),
  [],
  "empty scope yields no match tags"
);

const patterns = buildTagPatternsForScope(
  [
    {
      id: "l1",
      kind: "log",
      date: "2026-08-01",
      title: "a",
      body: "",
      entityIds: ["p1"],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["handover"],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "l2",
      kind: "log",
      date: "2026-08-02",
      title: "b",
      body: "",
      entityIds: ["p1"],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["handover"],
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
    {
      id: "l3",
      kind: "log",
      date: "2026-08-03",
      title: "c",
      body: "",
      entityIds: ["p1"],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["handover"],
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
    },
  ],
  [],
  "2026-08-14"
);
assert.equal(patterns[0]?.tag, "handover");
assert.equal(
  runbookMatchesSuggestionKeys(template, scopeRunbookSuggestionKeys(patterns.map((p) => p.tag))),
  true,
  "Pattern tag can suggest a runbook"
);

const weak: Runbook = {
  id: "rb-weak",
  title: "Weak binder only",
  items: [],
  linkedEntityIds: ["org1"],
  tags: ["binder-only"],
  createdAt: "",
  updatedAt: "2026-08-09T00:00:00.000Z",
};
const strong: Runbook = {
  id: "rb-strong",
  title: "Strong pattern overlap",
  items: [],
  linkedEntityIds: ["org1"],
  tags: ["handover", "BHA", "binder-only"],
  createdAt: "",
  updatedAt: "2026-08-08T00:00:00.000Z",
};
const none: Runbook = {
  id: "rb-none",
  title: "No overlap",
  items: [],
  linkedEntityIds: ["org1"],
  tags: ["unrelated"],
  createdAt: "",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

const suggestionTags = ["handover", "BHA", "binder-only"];
const priorityTags = ["handover", "BHA"];
const ranked = rankRunbookSuggestions([none, weak, strong, template], suggestionTags, priorityTags);

assert.equal(ranked.length, 3, "non-matches are omitted from Suggested");
assert.equal(ranked[0]?.runbook.id, "rb-strong", "more overlaps rank first");
assert.deepEqual(ranked[0]?.matchingTags, ["BHA", "binder-only", "handover"]);
assert.ok(
  ranked[0]!.score > ranked[1]!.score,
  "quantity/quality score orders suggestions"
);
assert.equal(
  scoreRunbookSuggestionMatch(["handover"], scopeRunbookSuggestionKeys(priorityTags)) >
    scoreRunbookSuggestionMatch(["binder-only"], scopeRunbookSuggestionKeys(priorityTags)),
  true,
  "pattern priority beats binder-only at equal quantity"
);
assert.deepEqual(
  suggestionTagsForCreate(ranked),
  normalizeTagList(["BHA", "handover", "binder-only"]),
  "create-from-suggestion prefills only tags that caused matches"
);
assert.deepEqual(
  rankRunbookSuggestions([template], [], priorityTags),
  [],
  "Suggested stays hidden when scope has no real match keys"
);
assert.deepEqual(
  rankRunbookSuggestions([none], suggestionTags, priorityTags),
  [],
  "Suggested stays hidden when library has no real overlaps"
);

const data: ArgusData = {
  version: 3,
  entities: [],
  logs: [
    {
      id: "l1",
      kind: "log",
      date: "2026-08-01",
      title: "a",
      body: "",
      entityIds: [],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["evidence-only"],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  inboxItems: [],
  attachments: [],
  runbooks: [{ ...template, tags: ["only-on-runbook"] }],
  runbookProgress: [],
  signalTags: [],
  globalTags: ["Important"],
};

const vocab = collectKnownTagVocabulary(data);
assert.ok(vocab.includes("Important"));
assert.ok(vocab.includes("evidence-only"));
assert.ok(!vocab.includes("only-on-runbook"), "runbook-only tags are not a TagRole vocabulary");
assert.equal(countTagsByRole(data).evidence > 0, true);
assert.equal("runbook" in countTagsByRole(data), false);

const normalized = normalizeRunbook({ ...template, tags: undefined });
assert.deepEqual(normalized.tags, []);

assert.deepEqual(normalizeTagList(["BHA", "bha"]), ["BHA"]);

const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
assert.match(actions, /updateRunbookTagsAction/, "tag write action exists");
assert.match(
  actions,
  /persistRunbookFromPayload\([\s\S]*payload\.tags/,
  "create persists classification tags from payload"
);
assert.doesNotMatch(actions, /createRunbookFromPattern|autoAssignRunbook|draftFromPattern/, "no auto-create/assign/draft");

const patternsSrc = readFileSync(join(root, "lib/argus/v2/tag-patterns.ts"), "utf8");
assert.match(patternsSrc, /log\.topics/, "patterns still from evidence logs");
assert.doesNotMatch(patternsSrc, /runbook\.tags/, "patterns must not read runbook tags");

const helpers = readFileSync(join(root, "lib/argus/runbook-helpers.ts"), "utf8");
assert.match(helpers, /rankRunbookSuggestions/, "ranking helper exists");
assert.match(helpers, /matchingRunbookSuggestionTags/, "match-reason helper exists");

const tab = readFileSync(join(root, "app/argus/v2/components/V2EntityRunbooksTab.tsx"), "utf8");
assert.match(tab, /Suggested from tags/, "assign UI surfaces suggestions");
assert.match(tab, /rankRunbookSuggestions/, "assign UI ranks meaningful matches");
assert.match(tab, /matchingTags/, "assign UI exposes why each runbook matched");
assert.match(tab, /Create with match tags|Use tags/, "create-from-suggestion carries match tags");
assert.match(tab, /linkRunbookToEntityAction/, "assignment remains explicit");
assert.doesNotMatch(tab, /Draft from Patterns|autoAssign|generateChecks/, "no draft/auto work");

const createStrip = readFileSync(join(root, "app/argus/v2/components/V2RunbookCreateStrip.tsx"), "utf8");
assert.match(createStrip, /initialTags/, "create strip accepts prefilled match tags");
assert.match(createStrip, /tags: normalizeTagList\(tags\)/, "create strip sends tags to persist");

const standalone = readFileSync(join(root, "app/argus/v2/runbooks/[id]/page.tsx"), "utf8");
assert.match(standalone, /collectKnownTagVocabulary/, "standalone runbook page reuses tag vocabulary");

const ontology = readFileSync(join(root, "lib/argus/tag-ontology.ts"), "utf8");
assert.doesNotMatch(ontology, /role === "runbook"/, "ontology has no runbook role branch");

console.log("ok: runbook-tag-glue");
