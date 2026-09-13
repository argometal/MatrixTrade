/**
 * Smoke: topic001 draft route exists, draft-only framing, Slice A/B markers.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveV2PageId } from "../lib/argus/v2/page-ids";

const root = process.cwd();
const page = join(root, "app/argus/v2/drafts/topic001/page.tsx");
const draft = join(root, "app/argus/v2/drafts/topic001/Topic001Draft.tsx");
const doc = join(root, "md/design/topic001-ui-simplification.md");

assert.ok(existsSync(page), "topic001 page route");
assert.ok(existsSync(draft), "topic001 draft component");
assert.ok(existsSync(doc), "topic001 design note");

const ui = readFileSync(draft, "utf8");
assert.match(ui, /Draft · topic001/, "draft banner");
assert.match(ui, /not wired into live A06/i, "explicitly not live");
assert.match(ui, /Slice A/, "Slice A detail");
assert.match(ui, /Slice B/, "Slice B browse");
assert.match(ui, /After|before/i, "Before/After toggle");
assert.doesNotMatch(ui, /renameTagGlobally|toggleSignalTagAction/, "no production mutations");

const diagnostics = readFileSync(
  join(root, "app/argus/v2/diagnostics/page.tsx"),
  "utf8"
);
assert.match(diagnostics, /\/argus\/v2\/drafts\/topic001/, "Diagnostics links to draft");

const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");
assert.match(help, /topic001-draft/, "Help topic for draft");

assert.equal(resolveV2PageId("/argus/v2/drafts/topic001").code, "A16");
assert.equal(resolveV2PageId("/argus/v2/drafts/topic001").label, "topic001");

console.log("ok: topic001-draft");
