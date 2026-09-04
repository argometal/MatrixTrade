/**
 * MXT 021 — Entry Solver: forbid ZONE → arbitrary plannedEntry.
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import {
  adviseBullishContinuationZone,
  buildCandidateRMap,
  buildEntrySolverMechanicsBrief,
  computeMaximumEntryCeiling,
  describeExistingNoFillLearningSurfaces,
  ENTRY_SOLVER_PIPELINE,
  longRewardRiskR,
  validateEntrySolverForScout,
} from "../lib/entry-solver";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

// --- math ---
assert.equal(Number(longRewardRiskR(310, 280, 360)?.toFixed(4)), 1.6667);
assert.ok((longRewardRiskR(285, 280, 360) ?? 0) > (longRewardRiskR(310, 280, 360) ?? 0));

const ceiling = computeMaximumEntryCeiling(360, 280, 3);
assert.ok(ceiling != null && ceiling < 360 && ceiling > 280);

// --- Mechanics / Control surface ---
const esBrief = buildEntrySolverMechanicsBrief();
assert.match(esBrief, /Target → Stop → R Map → Participation → Entry/);
assert.match(esBrief, /Optimize executable participation, not maximum theoretical R/);
assert.match(esBrief, /MAX R ≠ OPTIMAL ENTRY/);

const mechanics = buildMatrixMechanicsBrief();
assert.match(mechanics, /ENTRY SOLVER/);
assert.match(mechanics, new RegExp(ENTRY_SOLVER_PIPELINE.replace(/[→]/g, "\\$&")));
assert.match(mechanics, /ZONE → arbitrary price/);
assert.doesNotMatch(
  mechanics,
  /Target → Stop → Maximum Entry \(ceiling\) → Technical Validation → Entry Optimization/
);

// --- Analyze package includes Entry Solver advising scaffold ---
const thesis = {
  id: "ST-JPM-001",
  ticker: "JPM",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Secular bullish",
  currentHypothesis: "Wait pullback",
  levels: { primaryZone: { low: 285, high: 315 }, targets: [360] },
  riskRules: { minimumRR: 3, invalidation: "Weekly close below 260" },
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
  activeEvidence: [],
});
assert.match(pkg, /=== ENTRY SOLVER \/ OPTIMIZED ENTRY ===/);
assert.match(pkg, /Candidate Entry \| Risk\/share/);
assert.match(pkg, /FILL EVIDENCE: INSUFFICIENT/);
assert.match(pkg, /ENTRY SOLVER \(Mechanics\)/);
assert.match(pkg, /1R = USD/);

// --- Scenario: extended bullish continuation — JPM-like ---
const sheet = adviseBullishContinuationZone({
  zoneLow: 285,
  zoneHigh: 315,
  currentPrice: 340,
  probableTarget: 360,
  probableTargetKind: "probable_operational",
  calculatedProjections: [{ label: "fib_382_ref", price: 382 }],
  tacticalStop: 280,
  minimumRR: 3,
  structuralInvalidationNote: "Weekly close below 260",
});

assert.equal(sheet.priceExtended, true);
assert.equal(sheet.verdictHint, "wait");
assert.equal(sheet.selectedEntry, null);
assert.match(sheet.whySelected ?? "", /NO CHASE/);
assert.equal(sheet.fillEvidenceStatus, "insufficient");
assert.ok(sheet.candidates.length >= 2);

const mid = sheet.candidates.find((c) => c.role === "zone_mid_aesthetic");
assert.ok(mid);
// Lower prices improve R
const high = sheet.candidates.find((c) => c.role === "opportunity_1_zone_high");
const low = sheet.candidates.find((c) => c.role === "opportunity_2_zone_low");
assert.ok(high && low && low.r != null && high.r != null && low.r > high.r);

// Arbitrary plannedEntry 310 without completed why / matching selection must FAIL
const arbitrary = validateEntrySolverForScout({
  worksheet: {
    ...sheet,
    selectedEntry: 310,
    whySelected: "inside support zone",
    candidates: buildCandidateRMap({
      prices: [
        { price: 315, role: "opportunity_1_zone_high" },
        { price: 310, role: "zone_mid_aesthetic" },
        { price: 285, role: "opportunity_2_zone_low" },
      ],
      stop: 280,
      target: 360,
      minimumRR: 3,
    }),
    // Force incomplete participation
    participationNote: "",
  },
  plannedEntry: 310,
});
assert.equal(arbitrary.ok, false);
assert.ok(
  arbitrary.errors.some((e) => /participation/i.test(e)),
  `expected participation error, got: ${arbitrary.errors.join("; ")}`
);
assert.ok(
  arbitrary.errors.some(
    (e) =>
      /whySelected insufficient/i.test(e) ||
      /minRR-passing/i.test(e) ||
      /Entry Solver incomplete/i.test(e)
  ),
  `expected plannedEntry rejection, got: ${arbitrary.errors.join("; ")}`
);

// Incomplete: zone only, no target/stop
const incomplete = validateEntrySolverForScout({
  worksheet: {
    probableTarget: null,
    probableTargetKind: null,
    calculatedProjections: [],
    tacticalStop: null,
    opportunityZone: { low: 285, high: 315 },
    minimumRR: 3,
    maximumEntryCeiling: null,
    candidates: [],
    fillEvidenceStatus: "insufficient",
    participationNote: "none",
    selectedEntry: 310,
    whySelected: "near support",
    alternativeDeeperOpportunity: null,
    reassessmentCondition: null,
    verdictHint: "go",
  },
  plannedEntry: 310,
});
assert.equal(incomplete.ok, false);
assert.ok(incomplete.errors.some((e) => /probable target/i.test(e)));
assert.ok(incomplete.errors.some((e) => /tactical stop/i.test(e)));
assert.ok(incomplete.errors.some((e) => /R map/i.test(e)));

// Fib projection alone as target kind rejected
const fibAsTarget = validateEntrySolverForScout({
  worksheet: {
    ...sheet,
    priceExtended: false,
    probableTargetKind: "calculated_projection",
    probableTarget: 382,
    selectedEntry: null,
    whySelected: null,
    participationNote: sheet.participationNote,
  },
  plannedEntry: 310,
});
assert.equal(fibAsTarget.ok, false);

// Historical surfaces documented without inventing fill %
assert.match(describeExistingNoFillLearningSurfaces(), /missed_opportunity/);
assert.match(describeExistingNoFillLearningSurfaces(), /FILL EVIDENCE: INSUFFICIENT/);

console.log("test-mxt-021-entry-solver: ok");
