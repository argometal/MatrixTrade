/**
 * Smoke: Home Tags universe exposes Rename wired to renameTagInlineAction.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const portfolio = readFileSync(
  join(root, "app/argus/v2/components/V2FocusTagPortfolio.tsx"),
  "utf8"
);
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const storage = readFileSync(join(root, "lib/argus/server-storage.ts"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");

assert.match(storage, /export async function renameTagGlobally/, "storage rename exists");
assert.match(actions, /export async function renameTagAction/, "form rename action");
assert.match(actions, /export async function renameTagInlineAction/, "inline rename action");
assert.match(portfolio, /renameTagInlineAction/, "Home Tags imports inline rename");
assert.match(portfolio, /onClick=\{openRename\}/, "Rename opens modal");
assert.match(portfolio, /Rename tag/, "Rename CTA present on selection");
assert.match(portfolio, /✎ Rename/, "Inline rename beside title");
assert.match(
  portfolio,
  /Updates Notes, email Topics, Topic\/Project\/Event Tags, and Trackers/,
  "confirm explains global rewrite"
);
assert.match(portfolio, /Top by recurrence/, "recurrence ranking list");
assert.match(portfolio, /Top by recency/, "recency ranking list");
assert.match(portfolio, /hoveredName|showLabel/, "plot labels only on hover/select");
assert.match(help, /Select a tag → Rename/, "help documents rename");
assert.match(help, /Hot is Treemap-only/, "help documents Hot scope");

console.log("ok: tag-rename-ui");
