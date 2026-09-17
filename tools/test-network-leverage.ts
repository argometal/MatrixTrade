/**
 * Network leverage derived metrics (N2/N3) + vocabulary smoke.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entity } from "../lib/argus/types";
import {
  networkAttentionScore,
  networkLeverageForPerson,
} from "../lib/argus/network-leverage";

const root = process.cwd();
const shell = readFileSync(
  join(root, "app/argus/v2/network/components/NetworkContactShell.tsx"),
  "utf8"
);
const vocab = readFileSync(join(root, "md/argus/vocabulary-policy.md"), "utf8");
const ux = readFileSync(join(root, "lib/argus/ux-copy.ts"), "utf8");

assert.match(shell, /appendNetworkConversationOutcomeAction/, "N1 outcome action wired");
assert.match(shell, /NETWORK_RELATIONSHIP/, "uses sealed Network copy");
assert.match(shell, /Save relationship marks|saveMarks/, "marks not outcomes");
assert.match(vocab, /Contact Value/, "vocab documents Contact Value");
assert.match(vocab, /Conversation outcome/, "vocab documents outcomes");
assert.match(ux, /NETWORK_RELATIONSHIP/, "ux-copy has Network Relationship");
assert.doesNotMatch(ux.slice(0, 200), /Work Tracker/, "tagline no longer Work Tracker");

const entity = {
  id: "p1",
  name: "Ada",
  type: "person",
  contactValue: ["knowledge", "opportunity", "support"],
  myValue: ["help"],
  notes: "",
  linkedEntityIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as unknown as Entity;

const row = networkLeverageForPerson({ entity, daysSinceLastInteraction: 45 });
assert.equal(row.receivedCount, 3);
assert.equal(row.givenCount, 1);
assert.equal(row.asymmetry, 2);
assert.ok(networkAttentionScore(row) >= row.leverageScore);

console.log("test-network-leverage: ok");
