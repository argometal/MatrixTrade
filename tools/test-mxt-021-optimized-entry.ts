/**
 * MXT 021 Punto 2 — Optimized Entry JPM regression + sizing.
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import { DEFAULT_RISK_BUDGET_USD } from "../lib/layered-entry-risk";
import {
  resolveOptimizedEntry,
  sharesForRiskBudget,
  validateOptimizedEntryApplyClaim,
  formatOptimizedEntrySection,
} from "../lib/optimized-entry";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

// --- sizing: Entry 305 Stop 295 → risk/share $10; 1R=$100 → 10 shares ---
assert.equal(sharesForRiskBudget(305, 295, 100), 10);
assert.equal(DEFAULT_RISK_BUDGET_USD, 100);

// --- Mechanics contradiction removed ---
const mechanics = buildMatrixMechanicsBrief();
assert.doesNotMatch(
  mechanics,
  /Entry Optimization \(R quality\) stays the only primary variable/
);
assert.match(mechanics, /MAX R ≠ OPTIMIZED ENTRY/);

// --- JPM-like: extended, zone 285–315, deeper improves R, fill insufficient ---
const jpm = resolveOptimizedEntry({
  candidates: [
    { price: 315, role: "opportunity_1_zone_high" },
    { price: 310, role: "zone_mid_aesthetic" },
    { price: 305, role: "zone_round_305" },
    { price: 285, role: "opportunity_2_zone_low" },
  ],
  probableTarget: 360,
  probableTargetKind: "probable_operational",
  tacticalStop: 280,
  minimumRR: 3,
  riskBudgetUsd: 100,
  opportunityZone: { low: 285, high: 315 },
  currentPrice: 340,
  calculatedProjections: [{ label: "fib_ref", price: 382 }],
});

assert.equal(jpm.status, "wait_extended");
assert.equal(jpm.selectedEntry, null);
assert.equal(jpm.participationEvidence, "insufficient");
assert.equal(jpm.riskBudgetUsd, 100);
assert.match(jpm.oneRDefinition, /1R = USD 100/);
assert.ok(jpm.candidates.length >= 3);
// Deeper improves theoretical R
const at315 = jpm.candidates.find((c) => c.price === 315);
const at285 = jpm.candidates.find((c) => c.price === 285);
assert.ok(at315?.plannedRR != null && at285?.plannedRR != null);
assert.ok(at285!.plannedRR! > at315!.plannedRR!);
// Must not invent fill %
assert.doesNotMatch(jpm.participationNote, /\d+(\.\d+)?%/);

// --- Not extended: must not pick max-R deep (285) over opp1 when fill insufficient ---
const inZone = resolveOptimizedEntry({
  candidates: [
    { price: 315, role: "opportunity_1_zone_high" },
    { price: 310, role: "zone_mid_aesthetic" },
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
assert.notEqual(inZone.selectedEntry, 285);
if (inZone.selectedEntry != null) {
  assert.ok(inZone.selectedEntry >= 310);
  assert.equal(inZone.optimizedClaimEligible, true);
  assert.match(inZone.whySelected ?? "", /riskPerShare/);
  assert.match(inZone.whySelected ?? "", /1R = \$100/);
}

// --- Arbitrary 310 claim without worksheet FAILS Apply ---
const bareClaim = validateOptimizedEntryApplyClaim({
  plannedEntry: 310,
  optimizedEntryClaim: true,
});
assert.equal(bareClaim.ok, false);

// Legacy plannedEntry without claim allowed
const legacy = validateOptimizedEntryApplyClaim({ plannedEntry: 310 });
assert.equal(legacy.ok, true);
assert.equal(legacy.legacyMissing, true);

// Valid claim with worksheet
const goodClaim = validateOptimizedEntryApplyClaim({
  plannedEntry: 315,
  optimizedEntryClaim: true,
  entrySolver: {
    probableTarget: 380,
    tacticalStop: 295,
    riskBudgetUsd: 100,
    participationEvidence: "insufficient",
    whySelected:
      "target 380 (probable_operational); stop 295; R map compared candidates; opportunity_1 @ 315; participation insufficient prefers fill over max R",
    candidates: [
      { price: 315, role: "opportunity_1_zone_high" },
      { price: 285, role: "opportunity_2_zone_low" },
    ],
    selectedEntry: 315,
  },
});
assert.equal(goodClaim.ok, true, goodClaim.errors.join("; "));

// --- Sizing row for 305/295 ---
const sized = resolveOptimizedEntry({
  candidates: [
    { price: 305, role: "opportunity_1_zone_high" },
    { price: 300, role: "opportunity_2_deeper" },
  ],
  probableTarget: 360,
  probableTargetKind: "probable_operational",
  tacticalStop: 295,
  minimumRR: 3,
  riskBudgetUsd: 100,
  opportunityZone: { low: 300, high: 305 },
  currentPrice: 304,
});
const c305 = sized.candidates.find((c) => c.price === 305);
assert.equal(c305?.riskPerShare, 10);
assert.equal(c305?.estimatedShares, 10);
assert.ok(c305?.fullStopLossUsd != null && Math.abs(c305.fullStopLossUsd - 100) < 0.01);

// --- Analyze package includes Risk Budget ---
const thesis = {
  id: "ST-JPM-001",
  ticker: "JPM",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Secular bullish",
  currentHypothesis: "Wait",
  levels: { primaryZone: { low: 285, high: 315 } },
  riskRules: { minimumRR: 3, invalidation: "below 260" },
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
assert.match(pkg, /1R = USD 100/);
assert.match(pkg, /OPTIMIZED ENTRY/);
assert.match(pkg, /riskPerShare/);
assert.match(formatOptimizedEntrySection(jpm), /FILL EVIDENCE: INSUFFICIENT/);

console.log("test-mxt-021-optimized-entry: ok");
