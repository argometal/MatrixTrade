/**
 * MXT 023 — Executable swing plan training + math (no ticker hardcodes).
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import { buildLibraryIndexBrief } from "../lib/library-index";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import {
  buildExecutableSwingPlanBrief,
  computeEpisodeCumulativeR,
  computeLayeredDistributionMath,
} from "../lib/executable-swing-plan";
import { resolveOptimizedEntry } from "../lib/optimized-entry";
import { classifyTargetLifecycle } from "../lib/target-discipline";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

// 1–2. Mechanics trains one-pass EXECUTABLE PLAN + live R$
const brief150 = buildMatrixMechanicsBrief({ riskBudgetUsd: 150 });
assert.match(brief150, /EXECUTABLE SWING PLAN/);
assert.match(brief150, /1R budget: USD 150/);
assert.match(brief150, /EXECUTABLE PLAN/);
assert.match(brief150, /IF STOPPED/);
assert.match(brief150, /episode cumulative R/);
assert.match(brief150, /NEVER martingale/);
assert.match(brief150, /TACTICAL STOP: \$<S> exact/);
assert.match(brief150, /WHY THIS ENTRY/);
assert.match(brief150, /totalRisk\$ ≤ configured 1R\$/);

const briefDefault = buildExecutableSwingPlanBrief();
assert.match(briefDefault, /1R budget: USD 100/);

// 3. Exact stop required for executable claim (training + unresolved path)
assert.match(brief150, /if exact S unknown: UNRESOLVED/);

// 4. Layered math respects budget
const layeredOk = computeLayeredDistributionMath({
  layers: [
    { quantity: 5, entry: 100 },
    { quantity: 5, entry: 98 },
  ],
  tacticalStop: 90,
  target: 120,
  riskBudgetUsd: 100,
});
assert.ok(layeredOk);
assert.equal(layeredOk!.totalShares, 10);
assert.ok(Math.abs(layeredOk!.averageEntry - 99) < 1e-9);
assert.ok(layeredOk!.withinBudget);
assert.ok(layeredOk!.totalRiskUsd <= 100 + 1e-9);

const layeredOver = computeLayeredDistributionMath({
  layers: [
    { quantity: 20, entry: 100 },
    { quantity: 20, entry: 98 },
  ],
  tacticalStop: 90,
  target: 120,
  riskBudgetUsd: 100,
});
assert.ok(layeredOver);
assert.equal(layeredOver!.withinBudget, false);

// 5–6. Higher participation / max-R behavior still governed by OE (reuse)
const opt = resolveOptimizedEntry({
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
if (opt.selectedEntry != null) {
  assert.notEqual(opt.selectedEntry, 285);
}

// 7–8. Target reached / unsupported future
const reached = classifyTargetLifecycle({
  side: "long",
  probableTarget: 100,
  probableTargetKind: "observed_structural",
  currentPrice: 101,
  nextEvidencedTarget: null,
});
assert.equal(reached.status, "target_reached");
assert.equal(reached.blockEntrySolverGeometry, false);
assert.equal(reached.liveNewEntryAgainstConsumedTargetBlocked, true);

const reachedOpt = resolveOptimizedEntry({
  candidates: [
    { price: 97, role: "opportunity_1_zone_high" },
    { price: 92, role: "opportunity_2_zone_low" },
  ],
  probableTarget: 100,
  probableTargetKind: "observed_structural",
  tacticalStop: 88,
  minimumRR: 0.5,
  riskBudgetUsd: 100,
  opportunityZone: { low: 90, high: 98 },
  currentPrice: 101,
  calculatedProjections: [{ label: "wish", price: 120 }],
});
assert.equal(reachedOpt.status, "target_reached");
assert.ok(reachedOpt.candidates.every((c) => c.plannedRR != null));
assert.ok(reachedOpt.selectedEntry != null);
assert.equal(reachedOpt.optimizedClaimEligible, false);

// 9–11. Stop → realized loss language + episode cumulative R
assert.equal(computeEpisodeCumulativeR([-1, 2]), 1);
assert.equal(computeEpisodeCumulativeR([-1]), -1);
assert.equal(computeEpisodeCumulativeR([]), null);

// 12. Missing evidence → unresolved (OE needs_evidence when no target)
const missing = resolveOptimizedEntry({
  candidates: [
    { price: 100, role: "a" },
    { price: 98, role: "b" },
  ],
  probableTarget: null,
  probableTargetKind: null,
  tacticalStop: 90,
  minimumRR: 2.5,
  riskBudgetUsd: 100,
  currentPrice: 99,
});
assert.equal(missing.selectedEntry, null);
assert.ok(
  missing.status === "needs_evidence" || missing.status === "reassessment_required"
);

// 13. Discovery — Library Index teaches chain, no invented inventory claim
const library = buildLibraryIndexBrief();
assert.match(library, /DISCOVERY CHAIN/);
assert.match(library, /Do NOT assume existence/);
assert.match(library, /CATEGORIES only/);
assert.match(library, /Technical Analysis → copy row 'MTAE protocol'/);

// 14. Diagnostic mapping present (no new taxonomy)
assert.match(brief150, /DIAGNOSTIC MAPPING/);
assert.match(brief150, /MAF/);

// Analyze package one-pass + live R$
const thesis = {
  id: "ST-GEN-001",
  ticker: "GEN",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Bullish",
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
  riskBudgetUsd: 125,
});
assert.match(pkg, /EXECUTABLE SWING PLAN/);
assert.match(pkg, /1R budget: USD 125/);
assert.match(pkg, /ONE PASS/);
assert.match(pkg, /IF STOPPED/);
assert.match(pkg, /1R = USD 125/);

const apply = buildApplySchemaContractText();
assert.match(apply, /Apply schema contract|required/i);

console.log("test-mxt-023-executable-swing-plan: ok");
