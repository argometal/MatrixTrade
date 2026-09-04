/**
 * MXT 023 — R semantics, feasibility bounds, Analyze governance, closestApproach, Missing T0.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  computeMaximumEntryCeiling,
  computeShortMinimumEntry,
  adviseBullishContinuationZone,
} from "../lib/entry-solver";
import {
  computeLongMaximumEntry,
  computeShortMinimumEntry as shortMinFromSemantics,
  computeRGeometry,
  buildRSemanticsBrief,
  buildTargetTimeframeGovernanceBrief,
} from "../lib/r-semantics";
import {
  resolveOptimizedEntry,
  sharesForRiskBudget,
  validateOptimizedEntryApplyClaim,
} from "../lib/optimized-entry";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import {
  measureClosestApproach,
  classifyMissingT0Case,
} from "../lib/entry-learning-closest-approach";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";
import { OBSERVATION_UPDATE_ALLOWED_KEYS } from "../lib/observation-validate";

// 1. R$ semantics
const geo = computeRGeometry({
  side: "long",
  entry: 305,
  tacticalStop: 295,
  target: 360,
  riskBudgetUsd: 100,
});
assert.ok(geo);
assert.equal(geo.riskPerShare, 10);
assert.equal(geo.shares, 10);
assert.equal(geo.actualRiskUsd, 100);
assert.equal(geo.actualR, 1);
assert.equal(geo.rewardPerShare, 55);
assert.equal(geo.rewardRiskRatio, 5.5);
const brief = buildRSemanticsBrief(100);
assert.match(brief, /1R = USD 100|R\$ = configured/);
assert.match(brief, /riskPerShare/);
assert.match(brief, /Never label \$10 as/);

// 2. maximumEntry long
const longMax = computeLongMaximumEntry(360, 280, 3);
assert.ok(longMax != null);
assert.ok(Math.abs(longMax! - (360 + 3 * 280) / 4) < 1e-9);
assert.equal(computeMaximumEntryCeiling(360, 280, 3), longMax);

// 3. maximumEntry / minimumEntry short
const shortMin = shortMinFromSemantics(200, 250, 2);
assert.ok(shortMin != null);
assert.ok(Math.abs(shortMin! - (200 + 2 * 250) / 3) < 1e-9);
assert.equal(computeShortMinimumEntry(200, 250, 2), shortMin);
const shortGeo = computeRGeometry({
  side: "short",
  entry: shortMin!,
  tacticalStop: 250,
  target: 200,
  riskBudgetUsd: 100,
});
assert.ok(shortGeo);
assert.ok(Math.abs(shortGeo!.rewardRiskRatio - 2) < 1e-6);

// 4. MAX R ≠ optimizedEntry
const solved = resolveOptimizedEntry({
  candidates: [
    { price: 315, role: "opportunity_1_zone_high" },
    { price: 285, role: "opportunity_2_zone_low" },
  ],
  probableTarget: 380,
  probableTargetKind: "probable_operational",
  tacticalStop: 295,
  minimumRR: 2.5,
  riskBudgetUsd: 100,
  opportunityZone: { low: 285, high: 315 },
  currentPrice: 312,
});
const maxRCand = [...solved.candidates]
  .filter((c) => c.plannedRR != null)
  .sort((a, b) => (b.plannedRR ?? 0) - (a.plannedRR ?? 0))[0];
assert.ok(maxRCand);
if (solved.selectedEntry != null) {
  assert.notEqual(solved.selectedEntry, 285);
  assert.ok(
    solved.selectedEntry !== maxRCand.price || maxRCand.price !== 285,
    "must not auto-pick deepest max-R as optimized when fill insufficient"
  );
}
assert.match(
  solved.whySelected ?? solved.participationNote,
  /MAX R|participation|Opportunity 1|fill/i
);

// 5. target required before optimized claim
const noTarget = resolveOptimizedEntry({
  candidates: [{ price: 310, role: "zone_mid" }],
  probableTarget: null,
  probableTargetKind: null,
  tacticalStop: 295,
  minimumRR: 2.5,
  riskBudgetUsd: 100,
  opportunityZone: { low: 300, high: 315 },
  currentPrice: 308,
});
assert.equal(noTarget.selectedEntry, null);
assert.equal(noTarget.optimizedClaimEligible, false);

const zoneNoTarget = adviseBullishContinuationZone({
  zoneLow: 285,
  zoneHigh: 315,
  currentPrice: 310,
  probableTarget: null,
  probableTargetKind: null,
  tacticalStop: 280,
  minimumRR: 3,
});
assert.equal(zoneNoTarget.selectedEntry, null);

// 6. tactical stop used for R geometry
assert.equal(sharesForRiskBudget(305, 295, 100), 10);
assert.equal(sharesForRiskBudget(240, 250, 100), 10); // short abs

// 7. structural invalidation remains separate — Analyze + Entry Solver wording
assert.match(brief, /Structural invalidation/);
assert.match(brief, /Tactical stop/);

// 8. insufficient evidence → unresolved (not invented entry)
assert.equal(noTarget.status === "needs_evidence" || noTarget.selectedEntry == null, true);

// 9. Volume Profile provenance — governance brief + MTAE validate path
const tfBrief = buildTargetTimeframeGovernanceBrief({
  strategic_tf: "6M",
  opportunity_tf: "3M",
  refinement_tf: "1M",
  execution_tf: "1W",
});
assert.match(tfBrief, /POC\/VAH\/VAL/);
assert.match(tfBrief, /analysisRange/);
assert.match(tfBrief, /STRUCTURAL\/HISTORY/);
assert.match(tfBrief, /DECISION\/REASSESSMENT/);

// 10. Analyze context receives Mechanics / R / timeframe
const thesis = {
  id: "ST-TEST-001",
  ticker: "TEST",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Bullish structure",
  currentHypothesis: "Wait",
  levels: { primaryZone: { low: 100, high: 110 } },
  riskRules: { minimumRR: 2.5, invalidation: "below 90" },
  notes: "",
  historicalAnalysis: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StockThesis;

const presets: MtaeTimeframeMapPreset[] = [
  {
    id: "swing-6m",
    label: "Swing 6M",
    roles: {
      strategic_tf: "6M",
      opportunity_tf: "3M",
      refinement_tf: "1M",
      execution_tf: "1W",
    },
  },
];

const pkg = buildStockFileAnalyzePackage({
  thesis,
  plans: [],
  mtaePresets: presets,
  riskBudgetUsd: 100,
});
assert.match(pkg, /R SEMANTICS/);
assert.match(pkg, /TARGET \+ TIMEFRAME GOVERNANCE/);
assert.match(pkg, /strategic_tf/);
assert.match(pkg, /1R = USD 100|R\$ = configured monetary risk budget/);
assert.match(pkg, /Do NOT auto-request extra/);
assert.match(pkg, /ENTRY SOLVER/);
assert.match(pkg, /FEASIBILITY BOUND|maximumEntry/);

// 11. optimized claim without worksheet fails
assert.equal(
  validateOptimizedEntryApplyClaim({
    plannedEntry: 310,
    optimizedEntryClaim: true,
  }).ok,
  false
);

// 12. legacy plannedEntry does not masquerade as optimized
const legacy = validateOptimizedEntryApplyClaim({ plannedEntry: 310 });
assert.equal(legacy.ok, true);
assert.equal(legacy.legacyMissing, true);

// 13. historical Missing T0 remains Indeterminate
const missing = classifyMissingT0Case("PLAN-013");
assert.equal(missing.status, "INDETERMINATE");
assert.match(missing.reason, /NO PERSISTED T0/);
const plansPath = join(process.cwd(), "data", "plans.json");
const t0Path = join(process.cwd(), "data", "thesis-t0-freezes.json");
const plansRaw = existsSync(plansPath) ? readFileSync(plansPath, "utf8") : "";
const t0Raw = existsSync(t0Path) ? readFileSync(t0Path, "utf8") : "";
assert.equal(plansRaw.includes('"id": "PLAN-013"') || plansRaw.includes('"id":"PLAN-013"'), false);
assert.equal(
  /PLAN-013/.test(t0Raw) && /"planIds"/.test(t0Raw)
    ? t0Raw.includes("PLAN-013")
    : false,
  false,
  "local T0 store must not fabricate PLAN-013 freeze"
);

// 14. no automatic MAF persistence — capture keys only; no MAF write in this module
assert.ok(OBSERVATION_UPDATE_ALLOWED_KEYS.includes("closestApproach"));
assert.doesNotMatch(
  readFileSync(join(process.cwd(), "lib/entry-learning-closest-approach.ts"), "utf8"),
  /mafExperiment|writeMaf|persistMaf/i
);

// 15. closestApproach learning only from valid evidence
const okMeasure = measureClosestApproach({
  plannedEntry: 100,
  closestApproach: 111,
  entryTouched: false,
  t0FreezeId: "T0-1",
});
assert.equal(okMeasure.status, "MEASURABLE_NOW");
if (okMeasure.status === "MEASURABLE_NOW") {
  assert.equal(okMeasure.distanceAbs, 11);
  assert.equal(okMeasure.t0Anchored, true);
}
const badMeasure = measureClosestApproach({
  plannedEntry: Number.NaN,
  closestApproach: 111,
});
assert.equal(badMeasure.status, "INSUFFICIENT_DATA");

console.log("test-mxt-023-consolidated: ok");
