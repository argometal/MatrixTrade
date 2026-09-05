/**
 * MXT 028 — Plan-specific T0 freeze binding.
 * PLAN-001 must NOT inherit PLAN-009's freeze via shared stockThesisId.
 * Run: npx tsx tools/test-find-freeze-for-plan.ts
 */
import assert from "node:assert/strict";
import { findFreezeForPlan } from "../lib/thesis-case";
import type { TradePlan } from "../lib/plan-types";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";

function minimalPlan(id: string, stockThesisId: string): TradePlan {
  return {
    id,
    ticker: "TSLA",
    status: "watching",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    stockThesisId,
  } as TradePlan;
}

function freezeFor(
  freezeId: string,
  planId: string,
  stockThesisId: string,
  plannedEntry: number
): ThesisT0Freeze {
  return {
    id: freezeId,
    stockThesisId,
    t0: "2025-06-01T00:00:00.000Z",
    evaluationHorizonEndsAt: "2025-09-01T00:00:00.000Z",
    evaluationHorizonDays: 90,
    evaluationHorizonOverride: false,
    beliefFingerprint: "fp",
    planIds: [planId],
    stock: {
      stockThesisId,
      stockThesisVersion: 1,
      thesis: "t",
      currentHypothesis: "h",
      levels: { primaryZone: { low: plannedEntry - 5, high: plannedEntry + 5 } },
      riskRules: { minimumRR: 2, invalidation: "x" },
    },
    decision: {
      decisionId: "D-" + planId,
      decidedAt: "2025-06-01T00:00:00.000Z",
      verdict: "wait",
      reasoning: "r",
      challenges: [],
      decidedBy: "human",
      locationEvidence: null,
    },
    plan: {
      planId,
      plannedEntry,
      stopPrice: plannedEntry - 30,
      targetPrice: plannedEntry + 80,
      plannedRR: 2,
      layeredEntry: null,
      executionInstruction: null,
      validFrom: null,
      maximumEntryProxy: plannedEntry,
    },
    confidence: "verified",
    status: "open",
    t1: null,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
  };
}

function run() {
  const thesis = "ST-TSLA-001";
  const freeze009 = freezeFor("T0-009", "PLAN-009", thesis, 280);
  const freezes = [freeze009];

  // Regression: PLAN-001 must not attach PLAN-009 T0 via shared thesis.
  const plan001 = minimalPlan("PLAN-001", thesis);
  assert.equal(
    findFreezeForPlan(plan001, freezes),
    null,
    "PLAN-001 must not inherit PLAN-009 freeze via stockThesisId"
  );

  // PLAN-009 still binds its own freeze.
  const plan009 = minimalPlan("PLAN-009", thesis);
  assert.equal(findFreezeForPlan(plan009, freezes)?.id, "T0-009");

  // Plan-specific freeze for PLAN-001 binds correctly when present.
  const freeze001 = freezeFor("T0-001", "PLAN-001", thesis, 349);
  assert.equal(
    findFreezeForPlan(plan001, [...freezes, freeze001])?.id,
    "T0-001"
  );
  assert.equal(
    findFreezeForPlan(plan001, [...freezes, freeze001])?.plan.plannedEntry,
    349
  );

  // Geometry-only match (planIds empty / different) still binds by plan.planId.
  const geoOnly: ThesisT0Freeze = {
    ...freeze001,
    id: "T0-001-GEO",
    planIds: [],
  };
  assert.equal(findFreezeForPlan(plan001, [freeze009, geoOnly])?.id, "T0-001-GEO");

  console.log("test-find-freeze-for-plan: PASS");
}

run();
