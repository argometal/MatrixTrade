/**
 * PROMPT 16-0E — Scout Case selector: one option per war-ready plan.
 * Same universe as Dashboard active_plans (isWarReadyScoutPlan); no ticker/Stock File collapse.
 * Run: npx tsx tools/test-scout-case-selector-16-0e.ts
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { countActivePlans, isWarReadyScoutPlan } from "../lib/plan-helpers";
import { formatPlansSnapshotSection } from "../lib/plan-snapshot";
import { listScoutWarCases } from "../lib/scout-war-cases";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

function plan(overrides: Partial<TradePlan>): TradePlan {
  const now = "2026-08-15T00:00:00.000Z";
  return {
    id: "PLAN-001",
    ticker: "NFLX",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "5m",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function thesis(overrides: Partial<StockThesis> & Pick<StockThesis, "id" | "ticker">): StockThesis {
  const now = "2026-08-15T00:00:00.000Z";
  return {
    status: "watching",
    style: "swing",
    version: 1,
    thesis: "NFLX case",
    historicalAnalysis: [],
    levels: {},
    currentHypothesis: "test",
    riskRules: { minimumRR: 3, invalidation: "below major support" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

async function main() {
  const nflxFile = thesis({ id: "ST-NFLX", ticker: "NFLX" });
  const plan010 = plan({
    id: "PLAN-010",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX",
    status: "watching",
  });
  const plan012 = plan({
    id: "PLAN-012",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX",
    status: "watching",
  });
  const dead = plan({
    id: "PLAN-099",
    ticker: "NFLX",
    stockThesisId: "ST-NFLX",
    status: "expired",
    outcome: {
      planId: "PLAN-099",
      outcomeKind: "unexecuted_plan_loss",
      recordedAt: "2026-08-16T00:00:00.000Z",
      tradeExecuted: false,
      entryTriggered: false,
      stopTriggered: false,
      targetTriggered: false,
      entryReached: false,
      stopReachedBeforeTarget: false,
      targetReachedBeforeStop: false,
      theoreticalResultR: 0,
      realizedResultR: 0,
      outcomeSource: "counterfactual_observation",
      evidenceStatus: "verified",
      evidenceRefs: [],
      updatedAt: "2026-08-16T00:00:00.000Z",
    },
  });

  const plans = [plan010, plan012, dead];
  const cases = listScoutWarCases(plans, [nflxFile]);

  assert.equal(cases.length, 2, "two war-ready plans → two Case options");
  assert.deepEqual(
    cases.map((c) => c.key).sort(),
    ["PLAN-010", "PLAN-012"],
    "Case keys are plan ids"
  );
  assert.ok(cases.every((c) => c.thesis.id === "ST-NFLX"));
  assert.ok(cases.every((c) => isWarReadyScoutPlan(c.plan)));

  // Same universe as Dashboard snapshot active_plans
  const snap = formatPlansSnapshotSection(plans);
  assert.match(snap, /active_plans:2/);
  assert.match(snap, /id:PLAN-010/);
  assert.match(snap, /id:PLAN-012/);
  assert.equal(countActivePlans(plans), cases.length);

  // Source contract: desk uses listScoutWarCases; no thesis-id collapse
  const planning = await read("app/components/planning-preview/PreviewPlanning.tsx");
  assert.match(planning, /listScoutWarCases/);
  assert.match(planning, /One Case per war-ready plan/);
  assert.doesNotMatch(planning, /key:\s*thesis\.id/);
  assert.doesNotMatch(
    planning,
    /const primaryPlan = activePlans\[0\];\s*const levelsView/
  );
  assert.match(planning, /setScoutCaseKey\(focusPlanId\)/);
  assert.match(planning, /setScoutCaseKey\(planId\)/);

  const helper = await read("lib/scout-war-cases.ts");
  assert.match(helper, /isWarReadyScoutPlan/);
  assert.match(helper, /Same ticker or Stock File may yield multiple cases/);

  console.log("test-scout-case-selector-16-0e: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
