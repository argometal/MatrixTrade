/**
 * MXT 029 — T0 repair + Plan-specific freeze integrity.
 * Run: npx tsx tools/test-thesis-t0-repair.ts
 */
import assert from "node:assert/strict";
import { appendDecision } from "../lib/scout-decision";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";
import {
  createMemoryThesisT0Store,
  setThesisT0StoreForTests,
  getThesisT0Store,
} from "../lib/thesis-t0-store";
import {
  buildThesisT0Freeze,
  ensureThesisT0OnScoutDecision,
  listThesisT0Freezes,
} from "../lib/thesis-t0";
import { findFreezeForPlan } from "../lib/thesis-case";
import {
  applyThesisT0Repair,
  validateThesisT0RepairProposal,
} from "../lib/thesis-t0-repair";
import { validateProposalPayload } from "../lib/bridge";
import { formatAnalyzeT0Section } from "../lib/stock-file-analyze";
import { MATRIX_MECHANICS_REVISION } from "../lib/matrix-mechanics-snapshot";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";

function baseThesis(id: string): StockThesis {
  return {
    id,
    ticker: "TSLA",
    status: "watching",
    version: 1,
    style: "swing",
    thesis: "Bullish structure",
    historicalAnalysis: [],
    levels: { majorSupport: 300, majorResistance: 400 },
    riskRules: { minimumRR: 2, invalidation: "Close below 295" },
    currentHypothesis: "Hold zone",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  } as StockThesis;
}

function basePlan(
  id: string,
  entry: number,
  stockThesisId: string
): TradePlan {
  return {
    id,
    ticker: "TSLA",
    status: "watching",
    stockThesisId,
    plannedEntry: entry,
    stopPrice: entry - 30,
    targetPrice: entry + 80,
    plannedRR: 2.5,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
  } as TradePlan;
}

async function run() {
  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const thesis = baseThesis("ST-TSLA-001");

  const plan009 = appendDecision(basePlan("PLAN-009", 280, thesis.id), {
    verdict: "wait",
    decisionConfidence: 60,
    challenges: ["c"],
    reasoning: "waiting",
    decidedBy: "human",
  }).plan;
  plan009.decision = {
    ...plan009.decision!,
    decidedAt: "2025-07-01T00:00:00.000Z",
  };

  const e009 = await ensureThesisT0OnScoutDecision({
    plan: plan009,
    thesis,
  });
  assert.equal(e009.status, "created");
  assert.ok(e009.freeze);
  assert.equal(e009.freeze!.plan.plannedEntry, 280);
  assert.equal(e009.freeze!.recordKind, "original");

  const plan001 = appendDecision(basePlan("PLAN-001", 349, thesis.id), {
    verdict: "wait",
    decisionConfidence: 55,
    challenges: ["c"],
    reasoning: "other window",
    decidedBy: "human",
  }).plan;
  plan001.decision = {
    ...plan001.decision!,
    decidedAt: "2025-06-15T14:00:00.000Z",
  };

  const e001 = await ensureThesisT0OnScoutDecision({
    plan: plan001,
    thesis,
  });
  assert.equal(e001.status, "created");
  assert.ok(e001.freeze);
  assert.notEqual(e001.freeze!.id, e009.freeze!.id);
  assert.equal(e001.freeze!.plan.plannedEntry, 349);

  const all = await listThesisT0Freezes();
  assert.equal(findFreezeForPlan(plan001, all)?.id, e001.freeze!.id);
  assert.equal(findFreezeForPlan(plan009, all)?.id, e009.freeze!.id);

  setThesisT0StoreForTests(createMemoryThesisT0Store());
  const store = getThesisT0Store();
  const contaminated = buildThesisT0Freeze({
    plan: plan009,
    decision: plan009.decision!,
    thesis,
  });
  contaminated.planIds = ["PLAN-009", "PLAN-001"];
  await store.insert(contaminated);

  const validated = validateThesisT0RepairProposal({
    planId: "PLAN-001",
    repairKind: "reconstructed",
    t0: "2025-06-15T14:00:00.000Z",
    plannedEntry: 349,
    stopPrice: 320,
    targetPrice: 430,
    plannedRR: 2.79,
    note: "Missing Plan-specific T0; contemporaneous geometry confirmed.",
    evidenceRefs: ["human:notebook"],
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error(String((validated as { error: string }).error));

  const repaired = await applyThesisT0Repair({
    plan: plan001,
    repair: validated.value,
    thesis,
  });
  assert.equal(repaired.created, true);
  assert.equal(repaired.freeze.recordKind, "reconstructed");
  assert.equal(repaired.freeze.plan.plannedEntry, 349);
  assert.ok(repaired.freeze.correctionAudit?.length);
  assert.ok(repaired.detachedFromFreezeIds.includes(contaminated.id));

  const after = await listThesisT0Freezes();
  const foreign = after.find((f) => f.id === contaminated.id)!;
  assert.ok(!foreign.planIds.some((id) => id.toUpperCase() === "PLAN-001"));
  assert.equal(findFreezeForPlan(plan001, after)?.plan.plannedEntry, 349);

  const corr = await applyThesisT0Repair({
    plan: plan001,
    repair: {
      planId: "PLAN-001",
      repairKind: "corrected",
      plannedEntry: 350,
      note: "Persisted entry was wrong; contemporaneous plan said 350.",
      evidenceRefs: ["human:plan-sheet"],
    },
    thesis,
  });
  assert.equal(corr.freeze.recordKind, "corrected");
  assert.equal(corr.freeze.plan.plannedEntry, 350);
  const prev = corr.freeze.correctionAudit?.at(-1)?.previous as {
    plan?: { plannedEntry?: number };
  };
  assert.equal(prev.plan?.plannedEntry, 349);

  const bridge = validateProposalPayload({
    type: "thesis-t0-repair",
    proposal: {
      planId: "PLAN-001",
      repairKind: "reconstructed",
      t0: "2025-06-15T14:00:00.000Z",
      plannedEntry: 349,
      stopPrice: 320,
      targetPrice: 430,
      note: "Enough characters for note field here.",
    },
  });
  assert.equal(bridge.ok, true);

  const analyzeMissing = formatAnalyzeT0Section(null, "PLAN-001");
  assert.match(analyzeMissing, /NO PERSISTED T0/);
  assert.match(analyzeMissing, /thesis-t0-repair/);
  const analyzeRepaired = formatAnalyzeT0Section(corr.freeze, "PLAN-001");
  assert.match(analyzeRepaired, /record_kind:corrected/);

  const mechanics = buildMatrixMechanicsBrief();
  assert.match(mechanics, /DATA CORRECTABILITY/);
  assert.match(mechanics, /thesis-t0-repair/);
  assert.ok(MATRIX_MECHANICS_REVISION >= 45);

  console.log("test-thesis-t0-repair: PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
