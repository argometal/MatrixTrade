import assert from "node:assert/strict";
import {
  buildRunbookItemsFromText,
  canMoveRunbookSection,
  moveRunbookSectionBlock,
  runbookItemsToText,
  runbookProgress,
  runbookSectionBlockRange,
} from "../lib/argus/runbook-helpers";

const items = buildRunbookItemsFromText(
  ["Check A", "# Prep", "Item 1", "Item 2", "", "# Wrap", "Item 3"].join("\n")
);

assert.equal(items[0].type, "item");
assert.equal(items[1].type, "section");
assert.equal(items[1].text, "Prep");
assert.equal(items[2].type, "item");
assert.equal(items[4].type, "sep");
assert.equal(items[5].type, "section");
assert.equal(runbookProgress(items).total, 4);

const range = runbookSectionBlockRange(items, items[1].id);
assert.deepEqual(range, { start: 1, end: 4 });

assert.equal(canMoveRunbookSection(items, items[1].id, 1), true);
assert.equal(canMoveRunbookSection(items, items[1].id, -1), false);

const moved = moveRunbookSectionBlock(items, items[1].id, 1);
assert.equal(moved[1].type, "sep");
assert.equal(moved[2].type, "section");
assert.equal(moved[2].text, "Wrap");
assert.equal(moved[4].type, "section");
assert.equal(moved[4].text, "Prep");
assert.equal(moved[5].text, "Item 1");

const roundTrip = buildRunbookItemsFromText(runbookItemsToText(items));
assert.equal(roundTrip.filter((i) => i.type === "section").length, 2);
assert.equal(roundTrip.filter((i) => i.type === "item").length, 4);

console.log("runbook-helpers sections: ok");
