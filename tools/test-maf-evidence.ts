/**
 * Smoke checks for MAF + Learning Outcome + Observation + inference.
 * Run: npx tsx tools/test-maf-evidence.ts
 */
import assert from "node:assert/strict";
import { buildMafEvidence } from "../lib/maf-evidence";
import { validateAttributionProposal } from "../lib/maf-validate";
import { inferMafRuleHints } from "../lib/maf-inference";
import {
  deriveLearningOutcomeKindFromTrade,
  deriveLearningOutcomeKindFromPlan,
} from "../lib/learning-outcome";
import { resolveFirstTerminalEvent } from "../lib/observation";
import { validateObservationUpdateProposal } from "../lib/observation-validate";
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

assert.equal(deriveLearningOutcomeKindFromTrade(trade), "executed_loss");

const missPlan: TradePlan = {
  ...plan,
  id: "PLAN-TEST-002",
  status: "failed",
  linkedTradeId: undefined,
  outcome: {
    recordedAt: "2026-01-02T00:00:00.000Z",
    reason: "no_trigger",
    strategyStillValid: true,
  },
};
assert.equal(deriveLearningOutcomeKindFromPlan(missPlan), "missed_opportunity");

const evidence = buildMafEvidence({
  trade,
  plan,
  learningOutcome: {
    id: "LO-TEST-001",
    kind: "executed_loss",
    ticker: "TEST",
    tradeId: "H999",
    lifecycleStatus: "observing",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
    source: "trade_close",
  },
  observationRecord: {
    id: "OBS-TEST-001",
    tradeId: "H999",
    ticker: "TEST",
    status: "observing",
    startedAt: "2026-01-05T00:00:00.000Z",
    endsAt: "2026-04-05T00:00:00.000Z",
    durationDays: 90,
    targetReached: true,
    thesisInvalidated: false,
    createdAt: "2026-01-05T00:00:00.000Z",
    lastUpdatedAt: "2026-01-05T00:00:00.000Z",
  },
});
assert.equal(evidence.fillStatus, "filled");
assert.equal(evidence.learningOutcomeKind, "executed_loss");
assert.equal(evidence.targetReachedAfterStop, true);
assert.equal(evidence.sources.observationRecord, true);

const hints = inferMafRuleHints(evidence);
assert.ok(hints.some((h) => h.tag === "stop_too_tight"));

assert.equal(
  resolveFirstTerminalEvent({
    targetReached: true,
    targetReachedAt: "2026-02-01T00:00:00.000Z",
    thesisInvalidated: true,
    invalidationReachedAt: "2026-03-01T00:00:00.000Z",
  }),
  "target"
);

const obsOk = validateObservationUpdateProposal({
  tradeId: "H999",
  targetReached: true,
  mfe: 10,
});
assert.equal(obsOk.ok, true);

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

console.log("maf + learning + observation smoke OK");
