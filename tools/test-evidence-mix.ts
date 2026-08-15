/**
 * Evidence mix helpers for Overview pulse + Topic Event quick view.
 */
import assert from "node:assert/strict";
import { buildEvidenceMix, evidenceMixTotal } from "../lib/argus/v2/evidence-mix";

const mix = buildEvidenceMix({ notes: 3, emails: 2, events: 1 });
assert.equal(mix.length, 3);
assert.equal(evidenceMixTotal(mix), 6);
assert.equal(mix[0].label, "Notes");

const empty = buildEvidenceMix({});
assert.equal(empty.length, 0);
assert.equal(evidenceMixTotal(empty), 0);

console.log("ok: evidence-mix");
