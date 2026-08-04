/**
 * MTA-AI-STRATEGY-HANDOFF-001 — Strategy Review handoff projection tests.
 * Run: npm run test:strategy-review-handoff
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { Trade } from "../lib/types";
import {
  buildStrategyReviewHandoff,
  formatStrategyReviewHandoffText,
  STRATEGY_REVIEW_SNAPSHOT_ID,
  strategyReviewSnapshotItem,
} from "../lib/strategy-review-handoff";

const root = join(__dirname, "..");
const FIXED_NOW = "2026-08-04T12:00:00.000Z";

function basePlan(partial: Partial<TradePlan> & Pick<TradePlan, "id" | "status">): TradePlan {
  return {
    ticker: "AMZN",
    analysisTimeframes: ["1D", "1H"],
    entryTimeframe: "1H",
    plannedEntry: 200,
    stopPrice: 190,
    targetPrice: 230,
    plannedRR: 3,
    stockThesisId: "ST-AMZN-001",
    playbookId: "PB-1",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...partial,
  };
}

function baseThesis(partial: Partial<StockThesis> = {}): StockThesis {
  return {
    id: "ST-AMZN-001",
    ticker: "AMZN",
    status: "watching",
    version: 1,
    style: "Family A",
    thesis: "Accumulate pullbacks in primary zone",
    historicalAnalysis: [
      { timeframe: "3M", summary: "Higher lows" },
      { timeframe: "1W", summary: "Constructive" },
    ],
    levels: { primaryZone: { low: 195, high: 205 }, targets: [230, 250] },
    riskRules: { minimumRR: 3, invalidation: "Weekly close below 185" },
    currentHypothesis: "Wait for zone",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

function lo(
  partial: Partial<LearningOutcome> & Pick<LearningOutcome, "id" | "kind" | "ticker">
): LearningOutcome {
  return {
    lifecycleStatus: "concluded",
    source: "plan_outcome",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...partial,
  };
}

{
  // Active Scout without Trade
  const plan = basePlan({ id: "PLAN-A", status: "watching" });
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  });
  assert.equal(handoff.operationalState.needsOutcome, false);
  assert.equal(handoff.operationalState.linkedTradeId, null);
  assert.equal(handoff.learning.linkedTradeSummary, null);
  assert.equal(handoff.operationalState.outcome, null);
  assert.equal(handoff.marketObservation.currentPrice, "not_recorded");
  assert.equal(handoff.marketObservation.entryTouched, "not_recorded");
  assert.ok(handoff.meta.missingFields.includes("marketObservation.currentPrice"));
  assert.doesNotMatch(JSON.stringify(handoff.learning), /realizedPnLSum|equity/);
}

{
  // Terminal Scout without outcome
  const plan = basePlan({ id: "PLAN-T", status: "expired" });
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  });
  assert.equal(handoff.operationalState.needsOutcome, true);
  assert.equal(handoff.operationalState.needsStrategyReview, true);
  assert.ok(handoff.meta.missingFields.includes("operationalState.outcome"));
}

{
  // Scout with outcome + complete Learning sync
  const plan = basePlan({
    id: "PLAN-OK",
    status: "failed",
    outcome: {
      recordedAt: "2026-07-22T00:00:00.000Z",
      outcomeKind: "unexecuted_plan_loss",
      entryReached: true,
      entryTriggered: true,
      stopTriggered: true,
      targetTriggered: false,
      tradeExecuted: false,
      theoreticalResultR: -1,
      learningSyncStatus: "complete",
      learningOutcomeId: "LO-1",
      nonExecutionReason: "order_not_staged",
    },
  });
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: baseThesis(),
    learningOutcomes: [
      lo({
        id: "LO-1",
        kind: "unexecuted_plan_loss",
        ticker: "AMZN",
        planId: "PLAN-OK",
        counterfactualR: -1,
      }),
    ],
    now: FIXED_NOW,
  });
  assert.equal(handoff.operationalState.needsOutcome, false);
  assert.equal(handoff.operationalState.needsLearningSyncRepair, false);
  assert.equal(handoff.marketObservation.entryTouched, true);
  assert.equal(handoff.learning.counterfactualR, -1);
  assert.equal(handoff.learning.learningOutcome?.id, "LO-1");
  assert.equal(handoff.learning.missedReason, "order_not_staged");
}

{
  // Scout with partial Learning failure
  const plan = basePlan({
    id: "PLAN-SYNC",
    status: "failed",
    outcome: {
      recordedAt: "2026-07-22T00:00:00.000Z",
      outcomeKind: "unexecuted_plan_loss",
      learningSyncStatus: "failed",
      learningSyncError: "persist LO boom",
      tradeExecuted: false,
      theoreticalResultR: -1,
    },
  });
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  });
  assert.equal(handoff.operationalState.needsLearningSyncRepair, true);
  assert.ok(handoff.meta.missingFields.includes("learning.learningOutcome"));
}

{
  // Scout converted to Trade — compact summary only
  const plan = basePlan({
    id: "PLAN-TR",
    status: "entered",
    linkedTradeId: "H010",
  });
  const trade: Trade = {
    id: "H010",
    ticker: "AMZN",
    entry: 201,
    stop: 190,
    shares: 10,
    target: 230,
    status: "open",
    createdAt: "2026-07-15T00:00:00.000Z",
    planId: "PLAN-TR",
  };
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: baseThesis(),
    linkedTrade: trade,
    now: FIXED_NOW,
  });
  assert.equal(handoff.operationalState.linkedTradeId, "H010");
  assert.ok(handoff.learning.linkedTradeSummary);
  assert.equal(handoff.learning.linkedTradeSummary?.tradeId, "H010");
  assert.match(
    handoff.learning.linkedTradeSummary!.note,
    /Compact Trade summary/
  );
  // Must not embed full Trade Review / Mechanics
  const text = formatStrategyReviewHandoffText(handoff);
  assert.doesNotMatch(text, /MTA Mechanics|Trade forensic|equity curve/i);
}

{
  // Missing market observations always not_recorded
  const handoff = buildStrategyReviewHandoff({
    plan: basePlan({ id: "PLAN-M", status: "ready" }),
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  });
  assert.equal(handoff.marketObservation.priceAtPlanCreation, "not_recorded");
  assert.equal(handoff.marketObservation.highestPriceSinceCreation, "not_recorded");
  assert.equal(handoff.marketObservation.marketDataSource, "not_recorded");
}

{
  // Missing Stock File reference
  const plan = basePlan({
    id: "PLAN-NS",
    status: "watching",
    stockThesisId: undefined,
    thesis: undefined,
  });
  const handoff = buildStrategyReviewHandoff({
    plan,
    stockThesis: null,
    now: FIXED_NOW,
  });
  assert.equal(handoff.identity.stockFileId, null);
  assert.equal(handoff.strategicThesis.thesis, null);
  assert.ok(
    handoff.meta.missingFields.some((f) => f.includes("strategicThesis"))
  );
}

{
  // Deterministic output for same input
  const input = {
    plan: basePlan({ id: "PLAN-D", status: "watching" }),
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  };
  const a = formatStrategyReviewHandoffText(buildStrategyReviewHandoff(input));
  const b = formatStrategyReviewHandoffText(buildStrategyReviewHandoff(input));
  assert.equal(a, b);
  assert.match(a, /=== MTA STRATEGY REVIEW HANDOFF ===/);
  assert.match(a, /AI_REVIEW_REQUEST/);
  assert.match(a, /Scout counterfactual R is NOT Trade P\/L/);
}

{
  // Snapshot menu item — read-only, no writes
  const item = strategyReviewSnapshotItem({
    plan: basePlan({ id: "PLAN-S", status: "watching" }),
    stockThesis: baseThesis(),
    now: FIXED_NOW,
  });
  assert.equal(item.id, STRATEGY_REVIEW_SNAPSHOT_ID);
  assert.match(item.label, /Snap Strategy Review/);
  assert.match(item.text, /=== .*SNAP STRATEGY REVIEW/);
  assert.match(item.text, /MISSING_FIELDS/);
}

{
  // UI wiring markers (Planning + page loaders) — no new route
  const planning = readFileSync(
    join(root, "app/components/planning-preview/PreviewPlanning.tsx"),
    "utf8"
  );
  const page = readFileSync(
    join(root, "app/(trading)/(preview)/planning/page.tsx"),
    "utf8"
  );
  assert.match(planning, /strategyReviewSnapshotItem/);
  assert.match(planning, /resolveLinkedTradeForPlan/);
  assert.match(page, /getLearningOutcomes/);
  assert.match(page, /getObservations/);
  assert.match(page, /getMafExperiments/);
  assert.doesNotMatch(page, /app\/\(trading\).*\/strategy-review/);
  // Pure builder — no store writes
  const mod = readFileSync(join(root, "lib/strategy-review-handoff.ts"), "utf8");
  assert.doesNotMatch(mod, /upsert|persistPlanOutcome|getPlansStore\(\)\.upsert/);
}

console.log("test-strategy-review-handoff: ok");
