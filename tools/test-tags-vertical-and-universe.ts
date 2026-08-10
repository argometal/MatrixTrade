/**
 * Smoke: binder Tags use Manage List · rows; Intel Tags portfolio is uncapped;
 * Project/Org Tags tabs are wired to entity-scoped data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity } from "../lib/argus/types";
import { buildV2FocusTagPortfolio } from "../lib/argus/v2/loaders";

const root = join(process.cwd());
const manage = readFileSync(join(root, "app/argus/v2/components/tag-manage-list.ts"), "utf8");
const vocab = readFileSync(join(root, "app/argus/v2/components/V2VocabularyListEditor.tsx"), "utf8");
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const badges = readFileSync(join(root, "app/argus/v2/components/V2TagPatternBadges.tsx"), "utf8");
const flaggable = readFileSync(join(root, "app/argus/v2/components/V2FlaggableTagChip.tsx"), "utf8");
const eventEd = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventTagEditor.tsx"),
  "utf8"
);
const topicEd = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicAliasEditor.tsx"),
  "utf8"
);
const projectShell = readFileSync(join(root, "app/argus/v2/components/V2ProjectShell.tsx"), "utf8");
const orgShell = readFileSync(join(root, "app/argus/v2/components/V2OrgShell.tsx"), "utf8");
const projectEd = readFileSync(join(root, "app/argus/v2/components/V2ProjectTagEditor.tsx"), "utf8");
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");
const portfolioUi = readFileSync(
  join(root, "app/argus/v2/components/V2FocusTagPortfolio.tsx"),
  "utf8"
);
const loaders = readFileSync(join(root, "lib/argus/v2/loaders.ts"), "utf8");

assert.match(
  manage,
  /rounded-xl border border-zinc-800\/80 bg-zinc-900\/40 px-4 py-3/,
  "Manage row matches OrganizationListRow family"
);
assert.match(manage, /TAG_MANAGE_LIST_CLASS = "space-y-2"/, "Manage list is vertical stack");

assert.match(vocab, /orientation: _orientation = "stack"/, "vocabulary defaults to stack");
assert.match(vocab, /TAG_MANAGE_ROW_CLASS/, "vocabulary uses Manage rows");
assert.doesNotMatch(
  vocab,
  /chipClassName = "inline-flex/,
  "default chip class must not be inline-flex chip"
);

assert.match(eventEd, /TAG_MANAGE_ROW_CLASS/, "Event Tags editor uses Manage rows");
assert.match(topicEd, /TAG_MANAGE_ROW_CLASS/, "Topic Tags editor uses Manage rows");
assert.match(projectEd, /TAG_MANAGE_ROW_CLASS/, "Project Tags editor uses Manage rows");
assert.match(binder, /TAG_MANAGE_ROW_CLASS/, "branch tags are Manage rows");
assert.match(binder, /const PREVIEW = 40/, "branch preview is not a tiny chip strip");
assert.match(badges, /TAG_MANAGE_LIST_CLASS/, "pattern badges are Manage stack");
assert.match(flaggable, /TAG_MANAGE_ROW_CLASS/, "flaggable tags are Manage rows");

assert.match(projectShell, /\["Overview", "Timeline", "Runbooks", "Tags", "Links"\]/, "Project has Tags tab");
assert.match(projectShell, /V2BinderTagsTab/, "Project Tags tab uses binder Tags");
assert.match(projectShell, /entity\.projectTags/, "Project Tags wired to projectTags");
assert.match(projectShell, /V2ProjectTagEditor/, "Project Tags editor mounted");
assert.match(projectShell, /helpTopic="project-tags"/, "Project Tags help topic");

assert.match(orgShell, /\["Overview", "Timeline", "Runbooks", "Tags", "Links"\]/, "Org has Tags tab");
assert.match(orgShell, /tab === "Tags"/, "Org Tags tab renders");
assert.match(orgShell, /V2TagPatternBadges/, "Org Tags show scoped patterns");
assert.match(orgShell, /tagPatterns/, "Org Tags wired to org neighborhood patterns");
assert.match(orgShell, /helpTopic="org-tags"|topic="org-tags"/, "Org Tags help topic");
assert.match(orgShell, /manualTags=\{\[\]\}/, "Org Links keeps ORDER 001 — no binder Tags");

assert.match(actions, /updateProjectTagsAction/, "projectTags write action exists");
assert.match(help, /id: "project-tags"/, "project-tags help registered");
assert.match(help, /id: "org-tags"/, "org-tags help registered");

assert.match(loaders, /Number\.POSITIVE_INFINITY/, "portfolio default is uncapped");
assert.doesNotMatch(loaders, /limit = 80/, "top-80 cut must be gone");
assert.match(portfolioUi, /Full tag inventory for this filter/, "UI exposes full filtered list");
assert.doesNotMatch(portfolioUi, /\.slice\(0,\s*24\)/, "Also-in-filter 24-cap removed");
assert.doesNotMatch(portfolioUi, /trackerRows\.slice\(0,\s*36\)/, "Trackers strip 36-cap removed");

function entity(partial: Partial<Entity> & Pick<Entity, "id" | "type" | "name">): Entity {
  return {
    notes: "",
    strategicValue: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const manyTags = Array.from({ length: 120 }, (_, i) => `Tag${String(i).padStart(3, "0")}`);
const data: ArgusData = {
  version: 3,
  signalTags: ["TrackerOnlyCold"],
  globalTags: ["GlobalCold"],
  entities: [
    entity({
      id: "t1",
      type: "other",
      name: "Topic One",
      notes: "Kind: topic",
      topicTags: manyTags.slice(0, 60),
    }),
    entity({
      id: "p1",
      type: "project",
      name: "Project One",
      projectTags: manyTags.slice(60, 100),
    }),
    entity({
      id: "e1",
      type: "other",
      name: "Event One",
      notes: "Kind: event",
      eventTags: manyTags.slice(100),
    }),
  ],
  logs: [],
  inboxItems: [],
  attachments: [],
  runbooks: [],
};

const portfolio = buildV2FocusTagPortfolio(data, [], true, "2026-08-10");
assert.ok(portfolio.length >= 122, `expected full universe (>=122), got ${portfolio.length}`);
assert.ok(portfolio.some((r) => r.name === "Tag000"), "includes early binder tags");
assert.ok(portfolio.some((r) => r.name === "Tag119"), "includes late binder tags beyond old top-80");
assert.ok(portfolio.some((r) => r.name === "TrackerOnlyCold"), "includes tracker-only tags");
assert.ok(portfolio.some((r) => r.name === "GlobalCold"), "includes global tags");

const capped = buildV2FocusTagPortfolio(data, [], true, "2026-08-10", 80);
assert.equal(capped.length, 80, "explicit limit still honored when passed");

console.log("ok: tags-vertical-and-universe");
