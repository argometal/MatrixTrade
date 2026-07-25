/**
 * plan-outcome Apply + unexecuted_plan_loss / duplicate_creation (25-29).
 * Run: npx tsx tools/test-plan-outcome.ts
 */
import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES, parseAiBlock } from "../lib/ai-block";
import {
  parseTradingInboxPayload,
  validateProposalPayload,
  describeProposal,
} from "../lib/bridge";
import { buildApplySchemaContract } from "../lib/apply-schema-contract";
import { isApplyImplemented } from "../lib/ai-bridge-types";
import {
  deriveCounterfactualR,
  derivePlanOutcomeMetrics,
  validatePlanOutcomeProposalFields,
  applyPlanOutcomeFromProposal,
} from "../lib/plan-outcome";
import { aggregateScoutOutcomeMetrics } from "../lib/scout-outcome-metrics";
import type { TradePlan } from "../lib/plan-types";
import { getPlansStore } from "../lib/plans-store";
import { getPlanById } from "../lib/plans";
import {
  getLearningOutcomeByPlanId,
  getLearningOutcomes,
} from "../lib/learning-outcome-store";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import { verifyApplyPersistence } from "../lib/apply-verify";
import { applyTradingProposal } from "../lib/apply-trading-inbox";

const sample = AI_BLOCK_SAMPLES["plan-outcome"] as Record<string, unknown>;

// 1–2. Parser + bridge
{
  const parsed = parseTradingInboxPayload(sample);
  assert.ok(parsed);
  assert.equal(parsed!.type, "plan-outcome");
  const v = validateProposalPayload(parsed!);
  assert.equal(v.ok, true, v.ok ? "" : (v as { ok: false; errors: string[] }).errors.join("; "));
  assert.match(describeProposal(parsed!), /Plan outcome PLAN-004/);
  assert.equal(isApplyImplemented("plan-outcome"), true);
  const ai = parseAiBlock(JSON.stringify(sample));
  assert.equal(ai.ok, true);
}

// Schema contract
{
  const c = buildApplySchemaContract();
  assert.ok(c.acceptedTypes.includes("plan-outcome"));
  assert.ok(c.requiredFields["plan-outcome"]);
  assert.ok(c.allowedEnums["plan-outcome.outcome"]?.includes("unexecuted_plan_loss"));
  assert.ok(c.allowedEnums["learningOutcome.kind"]?.includes("duplicate_creation"));
  assert.ok(c.examples["plan-outcome"]);
}

// 5–8. Field validation rules
{
  assert.ok(
    validatePlanOutcomeProposalFields({
      planId: "PLAN-X",
      outcome: "unexecuted_plan_loss",
    }).some((e) => e.includes("entryReached"))
  );
  assert.ok(
    validatePlanOutcomeProposalFields({
      planId: "PLAN-X",
      outcome: "unexecuted_plan_loss",
      entryReached: true,
    }).some((e) => e.includes("stopReachedBeforeTarget"))
  );
  assert.ok(
    validatePlanOutcomeProposalFields({
      planId: "PLAN-X",
      outcome: "unexecuted_plan_loss",
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: true,
    }).some((e) => e.includes("cannot both be true"))
  );
  assert.ok(
    validatePlanOutcomeProposalFields({
      planId: "PLAN-X",
      outcome: "not_a_real_outcome",
    }).some((e) => e.includes("outcome unsupported"))
  );
}

// 11. counterfactualR derived -1 for UPL long
{
  const plan = {
    plannedEntry: 70,
    stopPrice: 62,
    targetPrice: 94,
  } as TradePlan;
  assert.equal(
    deriveCounterfactualR(plan, {
      entryReached: true,
      stopReachedBeforeTarget: true,
      targetReachedBeforeStop: false,
    }),
    -1
  );
  const m = derivePlanOutcomeMetrics(plan, "unexecuted_plan_loss", {
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
  });
  assert.equal(m.realizedR, 0);
  assert.equal(m.realizedPnL, 0);
  assert.equal(m.counterfactualR, -1);
  assert.equal(m.counterfactualDollarResult, undefined); // no authorizedRiskAmount
  assert.equal(m.excludedFromMetrics, false);

  const withRisk = {
    ...plan,
    layeredEntry: {
      executionMethod: "layered_limits" as const,
      limits: [],
      noChase: true as const,
      status: "planned" as const,
      authorizedRiskAmount: 100,
    },
  } as TradePlan;
  const m2 = derivePlanOutcomeMetrics(withRisk, "unexecuted_plan_loss", {
    entryReached: true,
    stopReachedBeforeTarget: true,
  });
  assert.equal(m2.counterfactualDollarResult, -100);
}

// 13–14. Metrics aggregator
{
  const rows: LearningOutcome[] = [
    {
      id: "LO-NFLX-001",
      kind: "unexecuted_plan_loss",
      ticker: "NFLX",
      planId: "PLAN-004",
      realizedR: 0,
      realizedPnL: 0,
      counterfactualR: -1,
      counterfactualDollarResult: -100,
      nonExecutionReason: "monitoring_failure",
      excludedFromMetrics: false,
      lifecycleStatus: "concluded",
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      source: "plan_outcome",
    },
    {
      id: "LO-NFLX-002",
      kind: "duplicate_creation",
      ticker: "NFLX",
      planId: "PLAN-011",
      realizedR: 0,
      realizedPnL: 0,
      excludedFromMetrics: true,
      lifecycleStatus: "concluded",
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      source: "plan_outcome",
    },
  ];
  const agg = aggregateScoutOutcomeMetrics(rows);
  assert.equal(agg.evaluatedScoutCount, 1);
  assert.equal(agg.unexecutedPlanLossCount, 1);
  assert.equal(agg.monitoringFailureCount, 1);
  assert.equal(agg.counterfactualRTotal, -1);
  assert.equal(agg.tradeCountDelta, 0);
  assert.equal(agg.executedLossCountDelta, 0);
}

// 3–4, 9–12, 15–20. Persist via Apply (json store) + verify + idempotency
async function runPersistenceTests() {
  const planId = "PLAN-TEST-UPL-25-29";
  const store = getPlansStore();
  const now = new Date().toISOString();
  const seed: TradePlan = {
    id: planId,
    ticker: "NFLX",
    status: "watching",
    analysisTimeframes: ["1D", "1H"],
    entryTimeframe: "1H",
    plannedEntry: 70,
    stopPrice: 62,
    targetPrice: 94,
    plannedRR: 3,
    layeredEntry: {
      executionMethod: "layered_limits",
      limits: [{ price: 70, allocationPercent: 100 }],
      noChase: true,
      status: "planned",
      authorizedRiskAmount: 100,
      primaryTargetPrice: 94,
      commonStopPrice: 62,
    },
    stockThesisId: "ST-NFLX-TEST",
    createdAt: now,
    updatedAt: now,
  };
  await store.upsert(seed);

  const proposalBody = {
    planId,
    outcome: "unexecuted_plan_loss",
    entryReached: true,
    stopReachedBeforeTarget: true,
    targetReachedBeforeStop: false,
    nonExecutionReason: "monitoring_failure",
    notes: `test UPL ${now}`,
    counterfactualR: -99, // must be ignored
  };

  const appliedDirect = await applyPlanOutcomeFromProposal(proposalBody);
  assert.ok(!appliedDirect.errors?.length, appliedDirect.errors?.join("; "));

  const plan = await getPlanById(planId);
  assert.ok(plan);
  assert.notEqual(plan!.status, "watching");
  assert.notEqual(plan!.status, "ready");
  assert.equal(plan!.plannedEntry, 70);
  assert.equal(plan!.stopPrice, 62);
  assert.equal(plan!.targetPrice, 94);
  assert.ok(plan!.outcome?.recordedAt);
  assert.equal(plan!.scoutLifecycle, "outcome_recorded");

  const lo = await getLearningOutcomeByPlanId(planId);
  assert.ok(lo);
  assert.equal(lo!.kind, "unexecuted_plan_loss");
  assert.equal(lo!.realizedR, 0);
  assert.equal(lo!.realizedPnL, 0);
  assert.equal(lo!.counterfactualR, -1);
  assert.equal(lo!.counterfactualDollarResult, -100);
  assert.equal(lo!.excludedFromMetrics, false);
  assert.equal(lo!.lifecycleStatus, "concluded");

  const inboxPayload = {
    type: "plan-outcome",
    source: `test-${now}`,
    proposal: proposalBody,
  };
  const verified = await verifyApplyPersistence(
    parseTradingInboxPayload(inboxPayload)!
  );
  assert.equal(verified.ok, true, verified.detail);

  // Apply path + fingerprint idempotency
  const viaInbox = await applyTradingProposal(inboxPayload);
  assert.equal(viaInbox.ok, true, viaInbox.ok ? "" : viaInbox.errors.join("; "));
  const again = await applyTradingProposal(inboxPayload);
  assert.equal(again.ok, true);
  assert.equal(again.ok && again.alreadyApplied, true);
  const allLo = (await getLearningOutcomes()).filter((r) => r.planId === planId);
  assert.equal(allLo.length, 1);

  // Reject UPL when trade linked
  await store.upsert({ ...plan!, linkedTradeId: "H999", status: "watching", outcome: undefined });
  const withTrade = await applyPlanOutcomeFromProposal({
    planId,
    outcome: "unexecuted_plan_loss",
    entryReached: true,
    stopReachedBeforeTarget: true,
  });
  assert.ok(withTrade.errors?.some((e) => e.includes("executed Trade")));

  // Duplicate creation
  const dupId = "PLAN-TEST-DUP-25-29";
  await store.upsert({
    ...seed,
    id: dupId,
    status: "ready",
    linkedTradeId: undefined,
    outcome: undefined,
  });
  const dupApply = await applyTradingProposal({
    type: "plan-outcome",
    source: "test",
    proposal: {
      planId: dupId,
      outcome: "duplicate_creation",
      nonExecutionReason: "duplicate_creation",
      canonicalPlanId: "PLAN-010",
      notes: "dup of PLAN-010",
    },
  });
  assert.equal(dupApply.ok, true, dupApply.ok ? "" : dupApply.errors.join("; "));
  const dupLo = await getLearningOutcomeByPlanId(dupId);
  assert.ok(dupLo?.excludedFromMetrics);
  assert.equal(dupLo?.kind, "duplicate_creation");
  const dupPlan = await getPlanById(dupId);
  assert.ok(dupPlan && dupPlan.status !== "watching" && dupPlan.status !== "ready");

  // Cleanup test rows from JSON stores
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const plansPath = path.join(process.cwd(), "data", "plans.json");
  const loPath = path.join(process.cwd(), "data", "learning-outcomes.json");
  const plansJson = JSON.parse(await fs.readFile(plansPath, "utf-8")) as TradePlan[];
  await fs.writeFile(
    plansPath,
    `${JSON.stringify(
      plansJson.filter((p) => p.id !== planId && p.id !== dupId),
      null,
      2
    )}\n`
  );
  const loJson = JSON.parse(await fs.readFile(loPath, "utf-8")) as LearningOutcome[];
  await fs.writeFile(
    loPath,
    `${JSON.stringify(
      loJson.filter((r) => r.planId !== planId && r.planId !== dupId),
      null,
      2
    )}\n`
  );
}

runPersistenceTests()
  .then(() => {
    console.log("test-plan-outcome: ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
