/**
 * MXT 023 — Target discipline behavior (no ticker hardcodes).
 * CASE: bullish structure, valid probableTarget, price reaches it, no next evidenced target.
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import { adviseBullishContinuationZone } from "../lib/entry-solver";
import { resolveOptimizedEntry } from "../lib/optimized-entry";
import {
  buildTargetDisciplineBrief,
  classifyTargetLifecycle,
} from "../lib/target-discipline";
import { buildMtaeProtocolBrief } from "../lib/mtae-brief";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

// --- Mechanics trains the AI explicitly ---
const discipline = buildTargetDisciplineBrief();
assert.match(discipline, /Optimize against available evidence/);
assert.match(discipline, /Plausibility ≠ evidence/);
assert.match(discipline, /TARGET REACHED/);
assert.match(discipline, /TARGET REASSESSMENT REQUIRED/);
assert.match(discipline, /FORBIDDEN PIPELINE/);
assert.match(discipline, /invent extension/);

const mechanics = buildMatrixMechanicsBrief();
assert.match(mechanics, /TARGET DISCIPLINE/);
assert.match(mechanics, /Plausibility ≠ evidence/);
assert.match(mechanics, /Do NOT invent a higher/);

const mtae = buildMtaeProtocolBrief([]);
assert.match(mtae, /TARGET REACHED/);

// Generic prices (not a real ticker rule)
const PROBABLE = 100;
const CURRENT_REACHED = 101;
const ZONE = { low: 90, high: 98 };
const STOP = 88;

const life = classifyTargetLifecycle({
  side: "long",
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  currentPrice: CURRENT_REACHED,
  nextEvidencedTarget: null,
});
assert.equal(life.status, "target_reached");
assert.equal(life.blockEntrySolverGeometry, true);

// FAIL patterns: must not treat projection as next evidence
const projOnly = classifyTargetLifecycle({
  side: "long",
  probableTarget: PROBABLE,
  probableTargetKind: "calculated_projection",
  currentPrice: 95,
});
assert.equal(projOnly.blockEntrySolverGeometry, true);

// Entry Solver: target reached → no selected entry, no R geometry from invented upside
const sheet = adviseBullishContinuationZone({
  zoneLow: ZONE.low,
  zoneHigh: ZONE.high,
  currentPrice: CURRENT_REACHED,
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  calculatedProjections: [{ label: "plausible_extension", price: 120 }],
  tacticalStop: STOP,
  minimumRR: 2.5,
});
assert.equal(sheet.selectedEntry, null);
assert.equal(sheet.maximumEntryCeiling, null);
assert.ok(sheet.candidates.every((c) => c.r == null));
assert.match(sheet.whySelected ?? "", /TARGET REACHED|target_reached|reassessment/i);
assert.match(sheet.reassessmentCondition ?? "", /REASSESSMENT/);

// Optimized Entry same gate — must not continue with hypothetical upside
const opt = resolveOptimizedEntry({
  candidates: [
    { price: 97, role: "opportunity_1_zone_high" },
    { price: 92, role: "opportunity_2_zone_low" },
  ],
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  tacticalStop: STOP,
  minimumRR: 2.5,
  riskBudgetUsd: 100,
  opportunityZone: ZONE,
  currentPrice: CURRENT_REACHED,
  calculatedProjections: [{ label: "wishful", price: 120 }],
});
assert.equal(opt.status, "target_reached");
assert.equal(opt.selectedEntry, null);
assert.equal(opt.optimizedClaimEligible, false);
assert.equal(opt.maximumEntryCeiling, null);
assert.ok(opt.candidates.every((c) => c.plannedRR == null));
assert.match(opt.whySelected ?? "", /TARGET REACHED|do not invent/i);

// Still-live target must NOT be blocked
const live = resolveOptimizedEntry({
  candidates: [
    { price: 97, role: "opportunity_1_zone_high" },
    { price: 92, role: "opportunity_2_zone_low" },
  ],
  probableTarget: 110,
  probableTargetKind: "probable_operational",
  tacticalStop: STOP,
  minimumRR: 2.5,
  riskBudgetUsd: 100,
  opportunityZone: ZONE,
  currentPrice: 96,
});
assert.notEqual(live.status, "target_reached");
assert.ok(live.candidates.some((c) => c.plannedRR != null));

// Analyze package carries the training text
const thesis = {
  id: "ST-GEN-001",
  ticker: "GEN",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Bullish structure",
  currentHypothesis: "Wait",
  levels: { primaryZone: { low: 90, high: 98 } },
  riskRules: { minimumRR: 2.5, invalidation: "below 80" },
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
assert.match(pkg, /TARGET DISCIPLINE/);
assert.match(pkg, /TARGET REACHED/);
assert.match(pkg, /Plausibility ≠ evidence/);
assert.match(pkg, /Do NOT invent/);

console.log("test-mxt-023-target-discipline: ok");
