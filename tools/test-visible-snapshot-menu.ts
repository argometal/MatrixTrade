/**
 * Prompt 15-12 — SNAPSHOT MENU ontology / single-source hygiene.
 * Run: npx tsx tools/test-visible-snapshot-menu.ts
 */
import assert from "node:assert/strict";
import { buildLibraryIndexBrief } from "../lib/library-index";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildMatrixMechanicsSnapshot } from "../lib/matrix-mechanics-snapshot";
import {
  CONTROL_NAV_LABELS_NOT_COPY_TARGETS,
  formatSnapshotMenuForMechanics,
  VISIBLE_SNAPSHOT_MENU,
  VISIBLE_SNAPSHOT_MENU_LABELS,
} from "../lib/visible-snapshot-menu";

const menu = formatSnapshotMenuForMechanics();
const brief = buildMatrixMechanicsBrief();
const snap = buildMatrixMechanicsSnapshot();
const library = buildLibraryIndexBrief();

assert.equal(
  brief.includes(menu),
  true,
  "mechanics brief embeds canonical SNAPSHOT MENU verbatim"
);

assert.equal(
  (snap.match(/SNAPSHOT MENU \(ask human/g) ?? []).length,
  1,
  "full mechanics snapshot must contain exactly one SNAPSHOT MENU list"
);

for (const label of VISIBLE_SNAPSHOT_MENU_LABELS) {
  assert.ok(menu.includes(label), `menu missing ${label}`);
}

for (const nav of CONTROL_NAV_LABELS_NOT_COPY_TARGETS) {
  assert.ok(
    !VISIBLE_SNAPSHOT_MENU_LABELS.includes(nav),
    `${nav} must not be a copy allowlist label`
  );
}

assert.ok(library.includes("Copy row: MAF attribution protocol"));
assert.ok(library.includes("Copy row: MTAE protocol"));
assert.ok(library.includes("do not ask the human to copy Learning"));

assert.ok(
  VISIBLE_SNAPSHOT_MENU.some((e) => e.label === "Apply schema contract" && e.kind === "copy_row")
);
assert.ok(
  VISIBLE_SNAPSHOT_MENU.some((e) => e.label === "MAF attribution protocol" && e.kind === "copy_row")
);

console.log("test-visible-snapshot-menu: ok");
