/**
 * Smoke + unit: Home Tags manager — rename / delete / create wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeTagList } from "../lib/argus/tag-ontology";

const root = process.cwd();
const portfolio = readFileSync(
  join(root, "app/argus/v2/components/V2FocusTagPortfolio.tsx"),
  "utf8"
);
const tracker = readFileSync(
  join(root, "app/argus/v2/components/V2TrackerTogglePanel.tsx"),
  "utf8"
);
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const storage = readFileSync(join(root, "lib/argus/server-storage.ts"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");

// Case-aware merge (rename Bar → foo when Foo exists)
assert.deepEqual(normalizeTagList(["Foo", "foo"]), ["Foo"]);
assert.deepEqual(normalizeTagList(["Bar", "foo"].map((t) => (t === "Bar" ? "foo" : t))), ["foo"]);

assert.match(storage, /normalizeTagList\(mapped\)/, "rename uses case-aware dedupe");
assert.match(storage, /data\.runbooks/, "rename/delete touch runbook tags");
assert.match(storage, /export async function deleteTagGlobally/, "deleteTagGlobally exists");
assert.match(storage, /export async function createGlobalTag/, "createGlobalTag exists");

assert.match(actions, /export async function renameTagInlineAction/, "inline rename action");
assert.match(actions, /export async function deleteTagInlineAction/, "inline delete action");
assert.match(actions, /export async function createGlobalTagAction/, "create global action");

assert.match(portfolio, /renameTagInlineAction/, "Home Tags imports rename");
assert.match(portfolio, /deleteTagInlineAction/, "Home Tags imports delete");
assert.match(portfolio, /createGlobalTagAction/, "Home Tags imports create");
assert.match(portfolio, /pendingRename/, "optimistic rename selection");
assert.match(portfolio, /submitDelete/, "Delete handler");
assert.match(portfolio, /Create tag/, "Create UI");
assert.match(portfolio, /Delete tag/, "Delete CTA");
assert.match(portfolio, /result\.touched === 0/, "warns when rename touches nothing");
assert.match(portfolio, /finally \{\s*setRenameBusy\(false\)/, "rename busy cleared in finally");

assert.match(tracker, /showSessionDrafts/, "flat mode can show session drafts");
assert.match(tracker, /Already a Tracker — do not invert/, "Flag no longer force-toggles OFF→ON");

assert.match(help, /Create tag adds a durable Global Tag/, "help documents Create");
assert.match(help, /Select a tag → Delete/, "help documents Delete");
assert.match(help, /Hot is Treemap-only/, "help documents Hot scope");

console.log("ok: tag-rename-ui");
