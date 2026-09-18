/**
 * Smoke: 091601 project customize + runbook links; 091602 muted text CSS.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRunbookLink } from "../lib/argus/runbook-helpers";
import type { RunbookItem } from "../lib/argus/types";

const root = join(process.cwd());

const tab = readFileSync(join(root, "app/argus/v2/components/V2EntityRunbooksTab.tsx"), "utf8");
const panel = readFileSync(join(root, "app/argus/v2/components/V2RunbookWorkPanel.tsx"), "utf8");
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const globals = readFileSync(join(root, "app/globals.css"), "utf8");

assert.match(tab, /showProjectCustomizeToggle/, "customize toggle inside runbook panel");
assert.match(tab, /runbook:\$\{runbookId\}/, "per-runbook customize storage");
assert.match(tab, /organizationLibraryDestructive=\{isLibrary\}/, "org-only destructive flag");
assert.match(tab, /onOpenLinkedRunbook/, "child runbook navigation");

assert.match(panel, /addRunbookLinkItemAction/, "link row action wired");
assert.match(panel, /softDeleteRunbookAction/, "delete entire runbook");
assert.match(panel, /sharedTemplateEditNotice/, "shared template banner");

assert.match(actions, /addRunbookLinkItemAction/, "server: add link row");
assert.match(actions, /softDeleteRunbookAction/, "server: soft delete");
assert.match(actions, /assertOrganizationLibraryDestructive/, "destructive guard");

assert.match(globals, /091602/, "muted text brightness bump");

const linkItem: RunbookItem = {
  id: "l1",
  text: "Detail procedure",
  done: false,
  doneAt: "",
  type: "link",
  linkedRunbookId: "rb_child",
};
assert.equal(isRunbookLink(linkItem), true);

console.log("ok: runbook-091601-091602");
