/**
 * Control sanity — Prompt ID protocol + read-only aggregate snapshots (24-30).
 * Run: npm run test:control-sanity-snapshots
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import {
  MATRIX_MECHANICS_REVISION,
  buildMatrixMechanicsSnapshot,
} from "../lib/matrix-mechanics-snapshot";
import {
  AGGREGATE_SNAPSHOT_ID_PREFIX,
  buildAggregateSnapshotItem,
  buildAggregateSnapshotText,
  collectEligibleSnapshotItems,
  isAggregateSnapshotItem,
  withLeadingAggregateSnapshot,
} from "../lib/snapshot-aggregate";
import type { SnapshotMenuItem } from "../lib/snapshot-types";

function item(id: string, label: string, body: string): SnapshotMenuItem {
  return {
    id,
    label,
    description: `${label} desc`,
    text: `BODY:${body}`,
  };
}

// 1. Prompt ID Protocol appears in canonical Mechanics snapshot
{
  const brief = buildMatrixMechanicsBrief();
  const snap = buildMatrixMechanicsSnapshot();
  assert.ok(brief.includes("PROMPT ID PROTOCOL"));
  assert.ok(brief.includes("DD-XX"));
  assert.ok(brief.includes("never reused"));
  assert.ok(brief.includes("traceability only"));
  assert.ok(snap.includes("PROMPT ID PROTOCOL"));
  assert.ok(snap.includes(`mechanics_revision:${MATRIX_MECHANICS_REVISION}`));
  assert.equal(MATRIX_MECHANICS_REVISION, 37);
}

const children = [
  item("a", "Alpha", "alpha-text"),
  item("b", "Beta", "beta-text"),
  item("c", "Gamma", "gamma-text"),
];

// 2. General snapshot appears first
{
  const menu = withLeadingAggregateSnapshot("playbook", "Playbook", children);
  assert.equal(menu[0]?.label, "Snapshot general");
  assert.ok(isAggregateSnapshotItem(menu[0]!));
  assert.ok(menu[0]!.id.startsWith(AGGREGATE_SNAPSHOT_ID_PREFIX));
}

// 3. Existing child snapshots remain present and unchanged
{
  const menu = withLeadingAggregateSnapshot("playbook", "Playbook", children);
  const rest = menu.slice(1);
  assert.deepEqual(rest, children);
  assert.equal(rest[0].text, "BODY:alpha-text");
  assert.equal(children[0].text, "BODY:alpha-text");
}

// 4. Aggregate output contains eligible child texts
{
  const agg = buildAggregateSnapshotItem("mtae", "Technical Analysis", children);
  assert.ok(agg);
  assert.ok(agg!.text.includes("BODY:alpha-text"));
  assert.ok(agg!.text.includes("BODY:beta-text"));
  assert.ok(agg!.text.includes("BODY:gamma-text"));
  assert.ok(agg!.text.includes("id: a"));
  assert.ok(agg!.text.includes("label: Alpha"));
}

// 5. Ordering is deterministic
{
  const t1 = buildAggregateSnapshotText("L", children);
  const t2 = buildAggregateSnapshotText("L", [...children]);
  assert.equal(t1, t2);
  const menu1 = withLeadingAggregateSnapshot("x", "X", children);
  const menu2 = withLeadingAggregateSnapshot("x", "X", children);
  assert.deepEqual(
    menu1.map((i) => i.id),
    menu2.map((i) => i.id)
  );
  assert.ok(t1.indexOf("BODY:alpha-text") < t1.indexOf("BODY:beta-text"));
  assert.ok(t1.indexOf("BODY:beta-text") < t1.indexOf("BODY:gamma-text"));
}

// 6. Aggregate items do not include themselves
{
  const menu = withLeadingAggregateSnapshot("scouting", "Scout Desk", children);
  const agg = menu[0]!;
  const sources = collectEligibleSnapshotItems(menu);
  assert.equal(sources.length, children.length);
  assert.ok(!sources.some((s) => s.id === agg.id));
  // Re-aggregating a menu that already starts with Snapshot general must not nest aggregates
  const again = withLeadingAggregateSnapshot("scouting", "Scout Desk", menu);
  assert.equal(again.filter((i) => isAggregateSnapshotItem(i)).length, 1);
  assert.deepEqual(
    again.slice(1).map((i) => i.id),
    children.map((i) => i.id)
  );
  assert.ok(!again[0]!.text.includes(`id: ${agg.id}`));
  assert.ok(again[0]!.text.includes("BODY:alpha-text"));
}

// 7. Nested aggregate items are excluded to prevent duplication
{
  const nestedAgg = buildAggregateSnapshotItem("child", "Child", [
    item("n1", "Nested1", "nested-one"),
  ]);
  assert.ok(nestedAgg);
  const mixed = [nestedAgg!, item("leaf", "Leaf", "leaf-body")];
  const eligible = collectEligibleSnapshotItems(mixed);
  assert.deepEqual(
    eligible.map((i) => i.id),
    ["leaf"]
  );
  const parent = buildAggregateSnapshotItem("parent", "Parent", mixed);
  assert.ok(parent);
  assert.ok(parent!.text.includes("BODY:leaf-body"));
  assert.ok(!parent!.text.includes("BODY:nested-one"));
  assert.ok(!parent!.text.includes("Snapshot general · Child"));
}

// 8. Triggering aggregate performs no persistence or mutation
{
  const frozen = children.map((c) => ({ ...c }));
  const before = JSON.stringify(frozen);
  buildAggregateSnapshotItem("train-ai", "MTA Mechanics", frozen);
  withLeadingAggregateSnapshot("train-ai", "MTA Mechanics", frozen);
  assert.equal(JSON.stringify(frozen), before, "child items must not be mutated");
  // Helper module has no storage/Apply imports — pure projection only.
  // (Enforced by architecture; this assertion documents the read-only contract.)
  assert.equal(typeof buildAggregateSnapshotText, "function");
}

// Empty children → no aggregate
{
  assert.equal(buildAggregateSnapshotItem("empty", "Empty", []), null);
  assert.deepEqual(withLeadingAggregateSnapshot("empty", "Empty", []), []);
}

console.log("test-control-sanity-snapshots: all assertions passed");
