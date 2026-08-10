/**
 * Smoke: binder Tags rows are Links-style vertical; Intel Tags portfolio is uncapped.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgusData, Entity } from "../lib/argus/types";
import { buildV2FocusTagPortfolio } from "../lib/argus/v2/loaders";

const root = join(process.cwd());
const vocab = readFileSync(join(root, "app/argus/v2/components/V2VocabularyListEditor.tsx"), "utf8");
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const eventEd = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventTagEditor.tsx"),
  "utf8"
);
const topicEd = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicAliasEditor.tsx"),
  "utf8"
);
const portfolioUi = readFileSync(
  join(root, "app/argus/v2/components/V2FocusTagPortfolio.tsx"),
  "utf8"
);
const loaders = readFileSync(join(root, "lib/argus/v2/loaders.ts"), "utf8");

assert.match(vocab, /orientation = "stack"/, "vocabulary defaults to stack");
assert.match(vocab, /flex w-full items-center justify-between/, "stack rows are full-width flex");
assert.doesNotMatch(
  vocab,
  /chipClassName = "inline-flex/,
  "default chip class must not be inline-flex chip"
);

assert.match(eventEd, /chipClassName="flex w-full/, "Event Tags editor uses full-width rows");
assert.match(topicEd, /chipClassName="flex w-full/, "Topic Tags editor uses full-width rows");
assert.match(
  binder,
  /flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800/,
  "branch tags are Links-style rows"
);
assert.match(binder, /const PREVIEW = 40/, "branch preview is not a tiny chip strip");

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
