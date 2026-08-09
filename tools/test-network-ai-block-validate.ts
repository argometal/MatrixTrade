/**
 * Network AI block structure parse vs field validation (MTA-style Fix before Accept).
 */
import assert from "node:assert/strict";
import {
  parseNetworkAiBlock,
  parseNetworkAiBlockStructure,
  validateNetworkAiBlockProposal,
} from "../lib/argus/network-ai-block";

const badMetrics = JSON.stringify({
  type: "network-metrics",
  proposal: {
    entityId: "p1",
    contactValue: ["not-a-real-key"],
    status: "Active",
  },
});

const structure = parseNetworkAiBlockStructure(badMetrics);
assert.equal(structure.ok, true, "structure parse allows preview");
if (structure.ok) {
  const check = validateNetworkAiBlockProposal(structure.payload.type, structure.payload.proposal);
  assert.equal(check.ok, false);
  if (!check.ok) {
    assert.ok(check.errors.some((e) => e.includes("contactValue")));
    assert.ok(check.errors.some((e) => e.includes("status")));
  }
}

const full = parseNetworkAiBlock(badMetrics);
assert.equal(full.ok, false);

const good = parseNetworkAiBlock(
  JSON.stringify({
    type: "network-metrics",
    proposal: {
      entityId: "p1",
      contactValue: ["knowledge"],
      myValue: ["help"],
    },
  })
);
assert.equal(good.ok, true);

console.log("ok: network-ai-block-validate");
