import assert from "node:assert/strict";
import {
  classifyBullTrendEntryState,
  formatFamilyBAssessmentSection,
  normalizeFamilyBAssessment,
  synthesizeFamilyBAssessment,
  toBullTrendLayerRole,
  validateFamilyBPlan,
  recomputeFamilyBLayeredPlan,
} from "../lib/family-b-assessment";
import { FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT } from "../lib/family-b-types";
import { authorizeLayeredEntry } from "../lib/layered-entry";
import { buildMafEvidence } from "../lib/maf-evidence";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import { isSecularTrendContinuationPlaybook } from "../lib/playbook-family-b";
import type { TradePlan } from "../lib/plan-types";
import type { StockThesis } from "../lib/stock-thesis-types";

assert.equal(isSecularTrendContinuationPlaybook("secular-trend-continuation"), true);
assert.equal(isSecularTrendContinuationPlaybook("structural-pullback-entry"), false);
assert.equal(toBullTrendLayerRole("preferred"), "preferred_pullback");
assert.equal(toBullTrendLayerRole("confirmation"), "reclaim_confirmation");
assert.equal(FAMILY_B_STARTER_MAX_ALLOCATION_PERCENT, 30);

const thesis = {
  id: "SF-TEST",
  ticker: "TEST",
  status: "watching",
  version: 1,
  style: "swing",
  thesis: "Secular uptrend",
  historicalAnalysis: [],
  levels: {},
  riskRules: { minimumRR: 4, invalidation: "Weekly close below 220" },
  currentHypothesis: "Continuation",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
} as StockThesis;

// 1: starter + preferred + deep plan
const layered = authorizeLayeredEntry(
  {
    executionMethod: "layered_limits",
    sizingMode: "risk_percent",
    authorizedRiskAmount: 100,
    stopModel: "per_layer",
    primaryTargetPrice: 270,
    proposalSource: { human: true, ai: true, validatedByHuman: true },
    limits: [
      {
        price: 240,
        allocationPercent: 20,
        role: "starter",
        stopPrice: 230,
        confidence: "low",
        rationale: "3R starter, high uncertainty, reserve better zones",
        uncertaintyNote: "elevated",
      },
      {
        price: 233,
        allocationPercent: 45,
        role: "preferred_pullback",
        stopPrice: 229,
        confidence: "medium",
        structuralBasis: "Primary pullback zone",
      },
      {
        price: 228,
        allocationPercent: 35,
        role: "deep_pullback",
        stopPrice: 224,
        confidence: "medium",
        structuralBasis: "Deep correction while thesis intact",
      },
    ],
  },
  { primaryTargetPrice: 270 }
);

assert.ok(layered.limits[0].derived);
assert.ok(Math.abs((layered.limits[0].derived?.rr ?? 0) - 3) < 0.01);
assert.ok((layered.limits[1].derived?.rr ?? 0) > (layered.limits[0].derived?.rr ?? 0));

const plan = {
  id: "PLAN-FB",
  ticker: "TEST",
  playbookId: "secular-trend-continuation",
  stockThesisId: "SF-TEST",
  status: "watching",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 240,
  stopPrice: 224,
  targetPrice: 270,
  layeredEntry: layered,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
} as TradePlan;

// 3: starter 3R + uncertainty
assert.ok(layered.limits[0].rationale);
assert.ok(layered.limits[0].uncertaintyNote);

// 2: starter allocation warning > 30%
{
  const heavy = {
    ...plan,
    layeredEntry: authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        authorizedRiskAmount: 100,
        stopModel: "common",
        commonStopPrice: 224,
        primaryTargetPrice: 270,
        limits: [
          { price: 240, allocationPercent: 40, role: "starter", rationale: "too big" },
          { price: 233, allocationPercent: 60, role: "preferred_pullback" },
        ],
      },
      { primaryTargetPrice: 270, planStopPrice: 224 }
    ),
  } as TradePlan;
  const { warnings } = validateFamilyBPlan({
    playbookId: heavy.playbookId,
    plan: heavy,
    thesis,
  });
  assert.ok(warnings.some((w) => /starter allocation/i.test(w)), warnings.join("; "));
}

// 4: preferred better R
assert.ok((layered.limits[1].derived?.rr ?? 0) > (layered.limits[0].derived?.rr ?? 0));

// 5: deep + damaged structure warning
{
  const assessment = synthesizeFamilyBAssessment({
    playbookId: plan.playbookId,
    plan,
    thesis,
    assessment: {
      state: "deep_entry_available",
      trendIntegrity: "questionable",
      extension: "not_extended",
      pullbackQuality: "deep_valid",
      participationCase: "deep",
      evidenceFor: ["HH/HL"],
      evidenceAgainst: ["Lost local structure"],
      unresolved: ["Is correction normal?"],
    },
  });
  const { warnings } = validateFamilyBPlan({
    playbookId: plan.playbookId,
    plan,
    thesis,
    assessment,
  });
  assert.ok(warnings.some((w) => /trend integrity is questionable/i.test(w)));
}

// 6: extended no chase
{
  const state = classifyBullTrendEntryState({
    assessment: {
      state: "extended_no_chase",
      trendIntegrity: "intact",
      extension: "extreme",
      pullbackQuality: "none",
      participationCase: "wait",
      evidenceFor: [],
      evidenceAgainst: [],
      unresolved: [],
    },
  });
  assert.equal(state, "extended_no_chase");
}

// 7: missing preferred zone
{
  const noPref = {
    ...plan,
    layeredEntry: authorizeLayeredEntry(
      {
        executionMethod: "layered_limits",
        sizingMode: "risk_percent",
        authorizedRiskAmount: 100,
        stopModel: "common",
        commonStopPrice: 224,
        primaryTargetPrice: 270,
        limits: [
          { price: 240, allocationPercent: 30, role: "starter", rationale: "x" },
          { price: 228, allocationPercent: 70, role: "deep_pullback" },
        ],
      },
      { primaryTargetPrice: 270, planStopPrice: 224 }
    ),
  } as TradePlan;
  const { warnings } = validateFamilyBPlan({
    playbookId: noPref.playbookId,
    plan: noPref,
    thesis,
  });
  assert.ok(warnings.some((w) => /preferred pullback zone missing/i.test(w)));
}

// 8: Fib-only warning
{
  const { warnings } = validateFamilyBPlan({
    playbookId: plan.playbookId,
    plan,
    thesis,
    assessment: {
      state: "preferred_entry_available",
      trendIntegrity: "intact",
      extension: "moderate",
      pullbackQuality: "preferred",
      participationCase: "preferred",
      evidenceFor: ["0.618 fib retracement"],
      evidenceAgainst: [],
      unresolved: [],
      fibonacci: { note: "only fib" },
      humanValidated: true,
    },
  });
  assert.ok(warnings.some((w) => /Fibonacci-only/i.test(w)));
}

// 9–10: target/stop constraints
{
  const { errors } = validateFamilyBPlan({
    playbookId: plan.playbookId,
    plan: { ...plan, targetPrice: 230, layeredEntry: { ...layered, primaryTargetPrice: 230 } },
    thesis,
  });
  assert.ok(errors.some((e) => /target <= entry/i.test(e)));
}

// 11–14: recompute + fill states + no chase
{
  const { plan: recomputed, errors } = recomputeFamilyBLayeredPlan(plan);
  assert.equal(errors.length, 0);
  assert.ok(recomputed.layeredEntry?.limits[0].derived?.rr !== undefined);
  // forged R overwritten
  const forged = {
    ...plan,
    layeredEntry: {
      ...layered,
      limits: layered.limits.map((l, i) =>
        i === 0
          ? {
              ...l,
              derived: {
                rr: 99,
                riskPerShare: 1,
                rewardPerShare: 1,
                riskSharePercent: 20,
                plannedQuantity: 999,
                plannedCapital: 1,
                plannedRiskAmount: 1,
              },
            }
          : l
      ),
    },
  } as TradePlan;
  const { plan: fixed } = recomputeFamilyBLayeredPlan(forged);
  assert.ok(Math.abs((fixed.layeredEntry!.limits[0].derived!.rr ?? 0) - 3) < 0.05);
}

// 15: old plan compatibility — no Family B fields
{
  const old = {
    id: "PLAN-OLD",
    ticker: "TEST",
    playbookId: "secular-trend-continuation",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 120,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as TradePlan;
  const assessment = synthesizeFamilyBAssessment({
    playbookId: old.playbookId,
    plan: old,
    thesis,
  });
  assert.equal(assessment.state, "watch");
  const { errors } = validateFamilyBPlan({
    playbookId: old.playbookId,
    plan: old,
    thesis,
    assessment,
  });
  assert.equal(errors.length, 0);
}

// 16: AI snapshot completeness
{
  const pkg = buildStockFileAnalyzePackage({
    thesis,
    playbooks: [],
    plans: [plan],
    mtaePresets: [],
  });
  assert.match(pkg, /FAMILY B/);
  assert.match(pkg, /do not invent/i);
  assert.match(pkg, /Fibonacci/i);
  assert.match(pkg, /no chase/i);
}

// 17: normalize assessment
{
  const parsed = normalizeFamilyBAssessment({
    state: "starter_available",
    trendIntegrity: "intact",
    extension: "moderate",
    pullbackQuality: "shallow_valid",
    participationCase: "starter",
    evidenceFor: ["HH"],
    evidenceAgainst: [],
    unresolved: ["Event risk"],
    humanValidated: true,
  });
  assert.ok(parsed);
  assert.equal(parsed!.state, "starter_available");
}

// 18–20: MAF fields
{
  const withFb = {
    ...plan,
    familyBAssessment: synthesizeFamilyBAssessment({
      playbookId: plan.playbookId,
      plan,
      thesis,
      assessment: {
        state: "starter_available",
        trendIntegrity: "intact",
        extension: "moderate",
        pullbackQuality: "shallow_valid",
        participationCase: "starter",
        evidenceFor: ["structure"],
        evidenceAgainst: [],
        unresolved: [],
        humanValidated: true,
      },
    }),
    layeredEntry: {
      ...layered,
      status: "partial",
      fillPercent: 20,
      limits: layered.limits.map((l, i) => ({ ...l, filled: i === 0 })),
    },
  } as TradePlan;
  const evidence = buildMafEvidence({ plan: withFb });
  assert.equal(evidence.familyBEntryState, "starter_available");
  assert.equal(evidence.familyBTrendIntegrity, "intact");
  assert.equal(evidence.layeredLimitsFilled, 1);
}

// 21–22: unrelated playbook unchanged
{
  const { errors, warnings } = validateFamilyBPlan({
    playbookId: "structural-pullback-entry",
    plan,
    thesis,
  });
  assert.equal(errors.length, 0);
  assert.equal(warnings.length, 0);
}

{
  const text = formatFamilyBAssessmentSection({
    assessment: synthesizeFamilyBAssessment({
      playbookId: plan.playbookId,
      plan,
      thesis,
      assessment: plan.familyBAssessment,
    }),
    plan,
    minimumRR: 4,
  });
  assert.match(text, /human\/AI proposals/i);
  assert.match(text, /ENTRY LAYERS/);
}

console.log("test-family-b-bull-trend: ok");
