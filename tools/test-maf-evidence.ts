/**
 * Smoke checks for MAF V1 evidence + validation.
 * Run: npx tsx tools/test-maf-evidence.ts
 */
import assert from "node:assert/strict";
import { buildMafEvidence } from "../lib/maf-evidence";
import { validateAttributionProposal } from "../lib/maf-validate";
import type { Trade } from "../lib/types";
import type { TradePlan } from "../lib/plan-types";

const trade: Trade = {
  id: "H999",
  ticker: "TEST",
  entry: 100,
  exit: 94,
  stop: 95,
  target: 120,
  shares: 10,
  status: "closed",
  createdAt: "2026-01-01T00:00:00.000Z",
  openedAt: "2026-01-01T00:00:00.000Z",
  closedAt: "2026-01-05T00:00:00.000Z",
  exitReason: "stop",
  planId: "PLAN-TEST-001",
  postStopStudy: {
    enabled: true,
    durationDays: 90,
    startedAt: "2026-01-05T00:00:00.000Z",
    endsAt: "2026-04-05T00:00:00.000Z",
    originalTradeId: "H999",
    originalEntry: 100,
    originalStop: 95,
    originalTargets: [120],
    targetReached: true,
    thesisInvalidated: false,
  },
};

const plan: TradePlan = {
  id: "PLAN-TEST-001",
  ticker: "TEST",
  status: "entered",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 99,
  stopPrice: 94,
  targetPrice: 120,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const evidence = buildMafEvidence({ trade, plan });
assert.equal(evidence.fillStatus, "filled");
assert.equal(evidence.plannedEntry, 99);
assert.equal(evidence.executedEntry, 100);
assert.equal(evidence.targetReachedAfterStop, true);
assert.equal(evidence.slippageVsPlan, 1);
assert.ok(evidence.rAchieved !== undefined);
assert.equal(evidence.sources.trade, true);
assert.equal(evidence.sources.plan, true);
assert.equal(evidence.sources.postStopStudy, true);

const withObs = buildMafEvidence({
  trade,
  plan,
  observation: { mfe: 8, mae: 6, mfeMaeUnit: "price", betterEntryAvailable: true },
});
assert.equal(withObs.mfe, 8);
assert.equal(withObs.sources.observationSupplement, true);

const ok = validateAttributionProposal({
  tradeId: "H999",
  components: [
    {
      component: "stop_quality",
      classification: "weak",
      aiInterpretationConfidence: 80,
      reasoning: "Target reached after stop",
    },
  ],
  primaryDragComponent: "stop_quality",
});
assert.equal(ok.ok, true);

const bad = validateAttributionProposal({
  components: [],
});
assert.equal(bad.ok, false);

console.log("maf evidence + validate smoke OK");
