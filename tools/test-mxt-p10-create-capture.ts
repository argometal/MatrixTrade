/**
 * P10 — minimum CREATE capture: originalEntry / executableEntry / blocker / reviseIf.
 * Run: npx tsx tools/test-mxt-p10-create-capture.ts
 */
import assert from "node:assert/strict";
import {
  applyScoutCaptureToPlan,
  getExecutableEntry,
  seedOriginalEntry,
} from "../lib/scout-entry-capture";
import { buildThesisT0Freeze } from "../lib/thesis-t0";
import type { TradePlan } from "../lib/plan-types";
import type { ScoutDecision } from "../lib/scout-decision-types";

function basePlan(over: Partial<TradePlan> = {}): TradePlan {
  const now = "2026-09-03T12:00:00.000Z";
  return {
    id: "PLAN-P10",
    ticker: "TEST",
    status: "watching",
    analysisTimeframes: ["1D", "1H"],
    entryTimeframe: "5m",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 130,
    plannedRR: 3,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function decision(): ScoutDecision {
  return {
    id: "DEC-P10",
    verdict: "wait",
    decisionConfidence: 60,
    challenges: ["price above zone"],
    reasoning: "Wait for retest",
    decidedAt: "2026-09-03T12:00:00.000Z",
    decidedBy: "human",
  };
}

function main() {
  // 1) CREATE seed: originalEntry from plannedEntry
  const created = seedOriginalEntry(basePlan({ originalEntry: undefined }));
  assert.equal(created.originalEntry, 100);
  assert.equal(getExecutableEntry(created), 100);

  // 2) Capture on decision-update: revise executable, keep original
  const withCapture = applyScoutCaptureToPlan(created, {
    participationBlocker: "Price above 100 zone — do not chase",
    reviseIf: ["Daily close back into 100-102", "Higher low above 105 holds 5 sessions"],
    executableEntry: 105,
  });
  assert.equal(withCapture.errors.length, 0);
  assert.equal(withCapture.plan.originalEntry, 100);
  assert.equal(withCapture.plan.plannedEntry, 105);
  assert.equal(withCapture.plan.participationBlocker, "Price above 100 zone — do not chase");
  assert.deepEqual(withCapture.plan.reviseIf, [
    "Daily close back into 100-102",
    "Higher low above 105 holds 5 sessions",
  ]);

  // 3) originalEntry immutable
  const mutateOrig = applyScoutCaptureToPlan(withCapture.plan, {
    originalEntry: 99,
  });
  assert.ok(mutateOrig.errors.some((e) => /immutable/i.test(e)));

  // 4) T0 freezes original + capture; later live revision does not alter freeze
  const atDecision = {
    ...created,
    decision: decision(),
    participationBlocker: "Waiting for zone",
    reviseIf: ["Touch 100"],
  };
  const freeze = buildThesisT0Freeze({
    plan: atDecision,
    decision: atDecision.decision!,
    thesis: null,
  });
  assert.equal(freeze.plan.plannedEntry, 100);
  assert.equal(freeze.plan.originalEntry, 100);
  assert.equal(freeze.plan.participationBlocker, "Waiting for zone");
  assert.deepEqual(freeze.plan.reviseIf, ["Touch 100"]);

  // Simulate live plan after freeze (executable revised)
  const liveLater = applyScoutCaptureToPlan(
    { ...atDecision, ...withCapture.plan },
    { plannedEntry: 110 }
  ).plan;
  assert.equal(liveLater.plannedEntry, 110);
  assert.equal(liveLater.originalEntry, 100);
  // Freeze object unchanged
  assert.equal(freeze.plan.plannedEntry, 100);
  assert.equal(freeze.plan.originalEntry, 100);

  // 5) Alias plannedEntry works
  const alias = applyScoutCaptureToPlan(basePlan({ originalEntry: 100 }), {
    plannedEntry: 102,
  });
  assert.equal(alias.plan.plannedEntry, 102);
  assert.equal(alias.plan.originalEntry, 100);

  console.log("test-mxt-p10-create-capture: PASS");
}

main();
