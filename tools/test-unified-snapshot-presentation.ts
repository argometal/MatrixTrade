import assert from "node:assert/strict";
import { composeUnifiedSnapshot } from "../lib/unified-snapshot-presentation";

const caseSnapshot = `=== CASE SNAPSHOT ===

MSFT · PLAN-003
STATUS: INCOMPLETE
MISSING REQUIRED: T0

--- 1. CASE ---
Case body

--- 2. EVIDENCE ---
Evidence body

--- 3. RESULT ---
Result body

--- 4. ISSUES ---
none

=== END CASE SNAPSHOT ===
`;

const insightsSnapshot = `=== INSIGHTS SNAPSHOT ===

SCOPE: Universe
GENERATED: now

--- 1. UNIVERSE ---
Universe body

--- 2. CASES ---
Focused case duplicate

--- 3. LEARNING ---
Learning body

--- 4. ATTENTION ---
Attention body

=== END INSIGHTS SNAPSHOT ===
`;

const focused = composeUnifiedSnapshot({
  caseSnapshotText: caseSnapshot,
  insightsSnapshotText: insightsSnapshot,
});

assert.match(focused, /=== SNAPSHOT ===/);
assert.match(focused, /--- FOCUS ---/);
assert.match(focused, /MSFT · PLAN-003/);
assert.match(focused, /--- 1\. UNIVERSE ---/);
assert.match(focused, /--- 3\. LEARNING ---/);
assert.match(focused, /--- 4\. ATTENTION ---/);
assert.doesNotMatch(focused, /Focused case duplicate/);
assert.doesNotMatch(focused, /--- 2\. CASES ---/);

const unfocused = composeUnifiedSnapshot({
  insightsSnapshotText: insightsSnapshot,
});

assert.match(unfocused, /=== SNAPSHOT ===/);
assert.match(unfocused, /--- 1\. UNIVERSE ---/);
assert.match(unfocused, /--- 3\. LEARNING ---/);
assert.match(unfocused, /--- 4\. ATTENTION ---/);
assert.doesNotMatch(unfocused, /--- FOCUS ---/);
assert.doesNotMatch(unfocused, /--- 2\. CASES ---/);
assert.doesNotMatch(unfocused, /Focused case duplicate/);

console.log("test-unified-snapshot-presentation: PASS");
