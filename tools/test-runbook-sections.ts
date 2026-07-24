import assert from "node:assert/strict";
import {
  buildRunbookItemsFromText,
  canMoveRunbookSection,
  moveRunbookSectionBlock,
  placeRunbookBlockAt,
  runbookItemSectionId,
  runbookItemsToText,
  runbookProgress,
  runbookSectionBlockRange,
  runbookSectionChildStats,
  runbookTransferIds,
} from "../lib/argus/runbook-helpers";

const items = buildRunbookItemsFromText(
  ["Check A", "# Prep", "Item 1", "", "Item 2", "# Wrap", "Item 3"].join("\n")
);

assert.equal(items[0].type, "item");
assert.equal(items[1].type, "section");
assert.equal(items[1].text, "Prep");
assert.equal(items[3].type, "sep");
assert.equal(items[4].type, "item");
assert.equal(runbookProgress(items).total, 4);

// 24-a1: sep does not end section ownership
const range = runbookSectionBlockRange(items, items[1].id);
assert.deepEqual(range, { start: 1, end: 5 });
assert.equal(runbookItemSectionId(items, items[4].id), items[1].id);
assert.deepEqual(runbookSectionChildStats(items, items[1].id), { total: 2, open: 2 });

assert.equal(canMoveRunbookSection(items, items[1].id, 1), true);
assert.equal(canMoveRunbookSection(items, items[1].id, -1), false);

const moved = moveRunbookSectionBlock(items, items[1].id, 1);
assert.equal(moved[1].type, "section");
assert.equal(moved[1].text, "Wrap");
assert.equal(moved[3].type, "section");
assert.equal(moved[3].text, "Prep");

const placed = placeRunbookBlockAt(items, items[4].id, 1);
assert.equal(placed[1].id, items[4].id);
assert.equal(placed[2].type, "section");

assert.deepEqual(runbookTransferIds(items, items[1].id).length, 4);

const roundTrip = buildRunbookItemsFromText(runbookItemsToText(items));
assert.equal(roundTrip.filter((i) => i.type === "section").length, 2);
assert.equal(roundTrip.filter((i) => i.type === "item").length, 4);

console.log("runbook-helpers sections: ok");
