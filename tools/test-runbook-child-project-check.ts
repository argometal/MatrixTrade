/**
 * Smoke: child-project (scoped) runbook checks start empty and do not inherit
 * template item.done — that made Project execute checks look broken.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyRunbookProgress,
  emptyRunbookProgress,
  seedProgressFromTemplateItems,
} from "../lib/argus/runbook-helpers";
import type { Runbook } from "../lib/argus/types";

const root = process.cwd();

const runbook: Runbook = {
  id: "rb1",
  title: "BHA",
  linkedEntityIds: ["org1", "proj-child"],
  createdAt: "2026-01-01T00:00:00",
  updatedAt: "2026-01-01T00:00:00",
  items: [
    { id: "a", text: "Prep", done: true, doneAt: "2026-01-01T00:00:00", type: "item", subtasks: [] },
    { id: "b", text: "Load", done: false, doneAt: "", type: "item", subtasks: [] },
  ],
};

const displayBefore = applyRunbookProgress(runbook, null);
assert.equal(displayBefore[0].done, false, "scoped UI clears template done");
assert.equal(displayBefore[1].done, false, "scoped UI starts unchecked");

const empty = emptyRunbookProgress(runbook.id, "proj-child");
assert.deepEqual(empty.checks, {}, "new project progress has no checks");
assert.equal(empty.closed, false);

const legacySeed = seedProgressFromTemplateItems(runbook, "proj-child");
assert.ok(legacySeed.checks.a?.done, "legacy seed helper still copies template (migration only)");

const afterToggle = {
  ...empty,
  checks: { b: { done: true, doneAt: "2026-08-14T00:00:00" } },
};
const displayAfter = applyRunbookProgress(runbook, afterToggle);
assert.equal(displayAfter[0].done, false, "unchecked items stay open");
assert.equal(displayAfter[1].done, true, "toggled item is done");

const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
assert.match(actions, /emptyRunbookProgress/, "loadOrSeedProgress uses empty seed");
assert.doesNotMatch(
  actions,
  /seedProgressFromTemplateItems\(runbook,\s*entityId\)/,
  "toggle path must not seed from template dones"
);

const tab = readFileSync(join(root, "app/argus/v2/components/V2EntityRunbooksTab.tsx"), "utf8");
assert.doesNotMatch(
  tab,
  /isLibrary && !progressForSelected/,
  "library must not show raw template item.done"
);

const panel = readFileSync(join(root, "app/argus/v2/components/V2RunbookWorkPanel.tsx"), "utf8");
assert.match(panel, /useState\(executeMode\)/, "execute mode shows accomplished by default");
assert.match(panel, /optimisticDone/, "optimistic check state on child projects");

console.log("ok: runbook-child-project-check");
