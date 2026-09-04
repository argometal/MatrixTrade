/**
 * MXT 023 — Target discipline: LIVE vs EVALUATION (no ticker hardcodes).
 */
import assert from "node:assert/strict";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { adviseBullishContinuationZone } from "../lib/entry-solver";
import { resolveOptimizedEntry } from "../lib/optimized-entry";
import {
  buildTargetDisciplineBrief,
  classifyTargetLifecycle,
} from "../lib/target-discipline";

const discipline = buildTargetDisciplineBrief();
assert.match(discipline, /LIVE vs EVALUATION/);
assert.match(discipline, /EVALUATION \/ RECONSTRUCTION/);
assert.match(discipline, /Do NOT invent T2/);
assert.match(discipline, /Does NOT rewrite frozen T0/);
assert.doesNotMatch(
  discipline,
  /Entry Solver must STOP geometry \(no maximumEntry/
);

const mechanics = buildMatrixMechanicsBrief({ riskBudgetUsd: 100 });
assert.match(mechanics, /LIVE vs EVALUATION/);

// Generic: T=100 reached at 101, zone below — evaluation must keep R geometry
const PROBABLE = 100;
const CURRENT = 101;
const ZONE = { low: 90, high: 98 };
const STOP = 88;

const life = classifyTargetLifecycle({
  side: "long",
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  currentPrice: CURRENT,
  nextEvidencedTarget: null,
});
assert.equal(life.status, "target_reached");
assert.equal(life.blockEntrySolverGeometry, false);
assert.equal(life.liveNewEntryAgainstConsumedTargetBlocked, true);

const sheet = adviseBullishContinuationZone({
  zoneLow: ZONE.low,
  zoneHigh: ZONE.high,
  currentPrice: CURRENT,
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  calculatedProjections: [{ label: "plausible_extension", price: 120 }],
  tacticalStop: STOP,
  minimumRR: 2.5,
});
assert.ok(sheet.candidates.some((c) => c.r != null), "evaluation keeps R map against T");
assert.ok(sheet.maximumEntryCeiling != null);
assert.match(sheet.whySelected ?? "", /TARGET REACHED|evaluation/i);
assert.match(sheet.whySelected ?? "", /do not invent T2|EVALUATION|evaluation/i);

const opt = resolveOptimizedEntry({
  candidates: [
    { price: 97, role: "opportunity_1_zone_high" },
    { price: 92, role: "opportunity_2_zone_low" },
  ],
  probableTarget: PROBABLE,
  probableTargetKind: "observed_structural",
  tacticalStop: STOP,
  minimumRR: 0.5,
  riskBudgetUsd: 100,
  opportunityZone: ZONE,
  currentPrice: CURRENT,
  calculatedProjections: [{ label: "wishful", price: 120 }],
});
assert.equal(opt.status, "target_reached");
assert.ok(opt.candidates.every((c) => c.plannedRR != null));
assert.ok(opt.selectedEntry != null, "evaluation may select historical optimized entry vs T");
assert.equal(opt.optimizedClaimEligible, false, "LIVE Apply claim blocked for consumed T");
assert.match(opt.whySelected ?? "", /EVALUATION|evaluation|REASSESSMENT/);

// Projection-only still blocks geometry
const proj = classifyTargetLifecycle({
  side: "long",
  probableTarget: PROBABLE,
  probableTargetKind: "calculated_projection",
  currentPrice: 95,
});
assert.equal(proj.blockEntrySolverGeometry, true);

// Live target still ahead — normal selected path
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

console.log("test-mxt-023-target-discipline: ok");
