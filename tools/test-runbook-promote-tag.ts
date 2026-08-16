/**
 * Smoke: promote runbook check → Tag + optional binder link via openLinkModal.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  promoteRunbookCheckTextToTag,
  RUNBOOK_PROMOTE_TAG_MAX_LEN,
} from "../lib/argus/runbook-helpers";

const root = process.cwd();
const panel = readFileSync(join(root, "app/argus/v2/components/V2RunbookWorkPanel.tsx"), "utf8");
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");

assert.equal(promoteRunbookCheckTextToTag("  handover  "), "handover");
assert.equal(promoteRunbookCheckTextToTag(""), null);
assert.ok(
  (promoteRunbookCheckTextToTag("x".repeat(RUNBOOK_PROMOTE_TAG_MAX_LEN + 20))?.length ?? 0) <=
    RUNBOOK_PROMOTE_TAG_MAX_LEN
);

assert.match(panel, /Use as tag…/, "Row menu exposes Use as tag");
assert.match(panel, /onUseAsTag/, "RowActionMenu accepts promote handler");
assert.match(panel, /handleUseAsTag/, "Panel wires promote handler");
assert.match(panel, /openLinkModal/, "Reuses Argus link modal");
assert.match(panel, /updateRunbookTagsAction/, "Promotes onto runbook.tags");
assert.match(panel, /appendBinderTagToEntitiesAction/, "Optional binder attach");
assert.match(panel, /binderTagLinkBuckets/, "Link picker limited to tag binders");

assert.match(actions, /export async function appendBinderTagToEntitiesAction/, "Server action for binder attach");
assert.match(actions, /isTopicBinder|isEventBinder/, "Action respects binder kinds");

assert.match(help, /Use as tag…/, "Help documents promote path");

console.log("ok: runbook-promote-tag");
