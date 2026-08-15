/**
 * Create/link UI trim: structural chips only; inbox Connect uses Link modal shell.
 */
import assert from "node:assert/strict";
import { LINK_TABS } from "../app/argus/components/create-link-shared";
import {
  CREATE_ITEM_LABELS,
  CREATE_MENU_SECTIONS,
  LINK_FILTER_LABELS,
} from "../lib/argus/create-flow-types";
import { usesLinkModalShell } from "../lib/argus/link-modal-adapter";
import { filterEntitiesForLinkTab } from "../lib/argus/create-flow-helpers";
import type { Entity } from "../lib/argus/types";

assert.deepEqual(LINK_TABS, ["all", "person", "organization", "project", "event", "topic"]);
assert.ok(!LINK_TABS.includes("document"));
assert.ok(!LINK_TABS.includes("journal"));

assert.equal(CREATE_ITEM_LABELS.journal, "Note");
assert.ok(!CREATE_MENU_SECTIONS.some((s) => s.id === "knowledge"));
assert.ok(!CREATE_MENU_SECTIONS.some((s) => s.kinds.includes("journal")));
assert.ok(!CREATE_MENU_SECTIONS.some((s) => s.kinds.includes("document")));

assert.equal(LINK_FILTER_LABELS.person, "People");
assert.equal(LINK_FILTER_LABELS.topic, "Topics");

assert.equal(
  usesLinkModalShell({ mode: "inbox-evidence", linkOnly: true }),
  true,
  "inbox Link/Connect must use slim link modal"
);
assert.equal(
  usesLinkModalShell({ mode: "inbox-evidence", linkOnly: false }),
  true,
  "inbox never opens CREATE→LINK→SAVE wizard"
);
assert.equal(usesLinkModalShell({ mode: "link" }), true);
assert.equal(usesLinkModalShell({ mode: "create" }), false);

const doc = {
  id: "d1",
  name: "Spec",
  type: "other",
  notes: "Kind: Document",
  deletedAt: undefined,
} as Entity;
const person = {
  id: "p1",
  name: "Vic",
  type: "person",
  notes: "",
  deletedAt: undefined,
} as Entity;
const all = filterEntitiesForLinkTab([doc, person], "all");
assert.equal(all.length, 1);
assert.equal(all[0].id, "p1");

console.log("ok: create-link-trim");
