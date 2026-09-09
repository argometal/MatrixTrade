/**
 * Insights Snapshot (MXT 029) — parity + PLAN-001/009 separations.
 * Run: npx tsx tools/test-insights-snapshot.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CaseDiagnosis } from "../lib/case-diagnosis-types";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import {
  buildInsightsCaseSpineView,
} from "../lib/insights-case-spine-view";
import {
  computePipelinePerformance,
} from "../lib/insights-pipeline-performance";
import { aggregatePlaybookDiagnosis } from "../lib/insights-playbook-diagnosis";
import {
  buildInsightsSnapshotBrief,
  buildInsightsSnapshotModel,
} from "../lib/insights-snapshot";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { MafExperiment } from "../lib/maf-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { TradePlan } from "../lib/plan-types";
import { VISIBLE_SNAPSHOT_MENU_LABELS } from "../lib/visible-snapshot-menu";

function diagnosis(
  partial: Partial<CaseDiagnosis> &
    Pick<CaseDiagnosis, "planId" | "classification" | "equationId">
): CaseDiagnosis {
  return {
    inputsUsed: [],
    missingInputs: [],
    reason: partial.reason ?? "fixture",
    ...partial,
  };
}

function caseRow(
  partial: Partial<InsightsCaseRow> &
    Pick<
      InsightsCaseRow,
      | "planId"
      | "ticker"
      | "family"
      | "decisionQuality"
      | "reality"
      | "t0Available"
    >
): InsightsCaseRow {
  const dx =
    partial.diagnosis ??
    diagnosis({
      planId: partial.planId,
      classification:
        partial.family === "B"
          ? {
              kind: "no_entry",
              value: partial.noEntryDiagnosis ?? "INDETERMINATE",
            }
          : { kind: "unclassified", value: "INDETERMINATE" },
      equationId: partial.equationId ?? "EQ-FIXTURE",
      reason: partial.diagnosisReason ?? "fixture",
    });
  return {
    caseId: partial.planId,
    date: "2026-09-04T00:00:00.000Z",
    playbookId: null,
    stockThesisId: null,
    participation: partial.family === "B" ? "no_entry" : "entry",
    verdict: partial.family === "B" ? "wait" : "go",
    noEntryDiagnosis: null,
    equationId: dx.equationId,
    executionQuality: "not_applicable",
    outcomeLabel: null,
    loKind: null,
    realizedR: null,
    realizedPnL: null,
    counterfactualR: null,
    missingInputs: [],
    diagnosisReason: dx.reason,
    evidenceSummary: "",
    caseHref: `/mxt/scout/case?plan=${partial.planId}`,
    diagnosis: dx,
    ...partial,
  };
}

const playbookNames = {
  "expectancy-asymmetry": "Expectancy & Asymmetry",
  "weekly-breakout": "Weekly Breakout",
  other: "Other Book",
};

/** PLAN-009 — own T0, Over-Opt, missed opportunity, entry_quality MAF */
const plan009: InsightsCaseRow = caseRow({
  planId: "PLAN-009",
  ticker: "TSLA",
  playbookId: "expectancy-asymmetry",
  stockThesisId: "ST-TSLA-001",
  family: "B",
  noEntryDiagnosis: "OVER_OPTIMIZATION",
  equationId: "EQ-016A-NE-OVER-OPT",
  decisionQuality: "supported",
  reality: "condition_met",
  executionQuality: "not_applicable",
  t0Available: true,
  loKind: "missed_opportunity",
  realizedR: 0,
  counterfactualR: 5.83,
  diagnosisReason:
    "No-entry while T0 participation conditions later met in Reality — possible over-restrictive filter.",
  mafAttribution: {
    mafExperimentId: "MAF-TSLA-001",
    primaryDragComponent: "entry_quality",
    source: "supabase",
  },
  linkage: {
    tradeId: null,
    planThesis: "linked",
    planPlaybook: "linked",
    tradePlan: "UNLINKED",
  },
  diagnosis: diagnosis({
    planId: "PLAN-009",
    classification: { kind: "no_entry", value: "OVER_OPTIMIZATION" },
    equationId: "EQ-016A-NE-OVER-OPT",
    reason:
      "No-entry while T0 participation conditions later met in Reality — possible over-restrictive filter.",
  }),
});

/**
 * PLAN-001 — honest Missing T0 / Insufficient Evidence Case,
 * while LO may still carry UPL + CF −1R and accepted timing MAF.
 */
const plan001: InsightsCaseRow = caseRow({
  planId: "PLAN-001",
  ticker: "TSLA",
  playbookId: "weekly-breakout",
  stockThesisId: "ST-TSLA-001",
  family: "B",
  noEntryDiagnosis: "INDETERMINATE",
  equationId: "EQ-016A-NE-MISSING-T0",
  decisionQuality: "INDETERMINATE",
  reality: "INDETERMINATE",
  executionQuality: "not_applicable",
  t0Available: false,
  loKind: "unexecuted_plan_loss",
  realizedR: 0,
  counterfactualR: -1,
  diagnosisReason:
    "Missing usable T0 freeze — cannot distinguish Good Filter from Over-optimization or Case D plan-path accounting.",
  mafAttribution: {
    mafExperimentId: "MAF-TSLA-002",
    primaryDragComponent: "timing_quality",
    source: "supabase",
  },
  linkage: {
    tradeId: null,
    planThesis: "linked",
    planPlaybook: "linked",
    tradePlan: "UNLINKED",
  },
  diagnosis: diagnosis({
    planId: "PLAN-001",
    classification: { kind: "no_entry", value: "INDETERMINATE" },
    equationId: "EQ-016A-NE-MISSING-T0",
    reason:
      "Missing usable T0 freeze — cannot distinguish Good Filter from Over-optimization or Case D plan-path accounting.",
    missingInputs: ["t0_freeze"],
  }),
});

const aapl: InsightsCaseRow = caseRow({
  planId: "PLAN-AAPL",
  ticker: "AAPL",
  playbookId: "other",
  family: "B",
  noEntryDiagnosis: "GOOD_FILTER",
  decisionQuality: "supported",
  reality: "condition_not_met",
  t0Available: true,
});

const caseSpine = [plan009, plan001, aapl];

const learningOutcomes: LearningOutcome[] = [
  {
    id: "LO-TSLA-009",
    kind: "missed_opportunity",
    ticker: "TSLA",
    planId: "PLAN-009",
    playbookId: "expectancy-asymmetry",
    observationId: "OBS-TSLA-009",
    counterfactualR: 5.83,
    realizedR: 0,
    lifecycleStatus: "observing",
    source: "plan_outcome",
    createdAt: "2026-09-04T18:31:58.000Z",
    updatedAt: "2026-09-04T18:31:59.000Z",
  },
  {
    id: "LO-TSLA-001",
    kind: "unexecuted_plan_loss",
    ticker: "TSLA",
    planId: "PLAN-001",
    playbookId: "weekly-breakout",
    counterfactualR: -1,
    realizedR: 0,
    lifecycleStatus: "concluded",
    source: "plan_outcome",
    createdAt: "2026-09-04T18:00:00.000Z",
    updatedAt: "2026-09-04T18:00:00.000Z",
  },
  {
    id: "LO-AAPL-1",
    kind: "missed_opportunity",
    ticker: "AAPL",
    planId: "PLAN-AAPL",
    playbookId: "other",
    counterfactualR: 2,
    realizedR: 0,
    lifecycleStatus: "observing",
    source: "plan_outcome",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
];

const mafExperiments: MafExperiment[] = [
  {
    id: "MAF-TSLA-001",
    planId: "PLAN-009",
    playbookId: "expectancy-asymmetry",
    ticker: "TSLA",
    status: "concluded",
    evidence: { fillStatus: "unknown", sources: { plan: true } },
    attributions: [
      {
        component: "entry_quality",
        classification: "failure",
        aiInterpretationConfidence: 62,
        reasoning: "entry drag",
        evidenceRefs: [],
      },
    ],
    primaryDragComponent: "entry_quality",
    createdAt: "2026-09-03T22:18:25.000Z",
    updatedAt: "2026-09-03T22:18:25.000Z",
    source: "attribution",
  },
  {
    id: "MAF-TSLA-002",
    planId: "PLAN-001",
    playbookId: "weekly-breakout",
    ticker: "TSLA",
    status: "concluded",
    evidence: { fillStatus: "unknown", sources: { plan: true } },
    attributions: [
      {
        component: "timing_quality",
        classification: "failure",
        aiInterpretationConfidence: 55,
        reasoning: "timing drag",
        evidenceRefs: [],
      },
    ],
    primaryDragComponent: "timing_quality",
    createdAt: "2026-09-03T22:18:25.000Z",
    updatedAt: "2026-09-03T22:18:25.000Z",
    source: "attribution",
  },
];

const observations: ObservationRecord[] = [
  {
    id: "OBS-TSLA-009",
    planId: "PLAN-009",
    learningOutcomeId: "LO-TSLA-009",
    ticker: "TSLA",
    status: "concluded",
    startedAt: "2026-09-04T18:31:58.000Z",
    observationKind: "plan_counterfactual_observation",
    entryTriggered: false,
    targetTriggered: true,
    firstTerminalEvent: "target",
    createdAt: "2026-09-04T18:31:58.000Z",
    lastUpdatedAt: "2026-09-04T18:31:58.000Z",
  } as ObservationRecord,
];

const plans: TradePlan[] = [
  {
    id: "PLAN-009",
    ticker: "TSLA",
    playbookId: "expectancy-asymmetry",
    stockThesisId: "ST-TSLA-001",
    status: "failed",
    plannedEntry: 280,
    stopPrice: 268,
    targetPrice: 350,
    plannedRR: 5.833333333333333,
    decision: {
      id: "DEC-1",
      verdict: "wait",
      challenges: [],
      decidedAt: "2026-07-25T09:17:15.788Z",
    },
    decisionHistory: [],
    createdAt: "2026-07-25T09:10:27.000Z",
    updatedAt: "2026-09-04T18:31:59.000Z",
  } as TradePlan,
  {
    id: "PLAN-001",
    ticker: "TSLA",
    playbookId: "weekly-breakout",
    stockThesisId: "ST-TSLA-001",
    status: "failed",
    plannedEntry: 349,
    stopPrice: 320,
    targetPrice: 430,
    plannedRR: 2.79,
    decision: {
      id: "DEC-001",
      verdict: "wait",
      challenges: [],
      decidedAt: "2025-06-01T00:00:00.000Z",
    },
    decisionHistory: [],
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2026-09-04T18:00:00.000Z",
  } as TradePlan,
];

const pipelineInput = {
  learningOutcomes,
  plans,
  trades: [],
  observations,
  mafExperiments,
};

// --- Universe parity ---
{
  const model = buildInsightsSnapshotModel({
    pipelineInput,
    caseSpine,
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  const caseView = buildInsightsCaseSpineView(caseSpine, {});
  const pipeline = computePipelinePerformance({ ...pipelineInput, filters: {} });
  const pb = aggregatePlaybookDiagnosis(caseView.rows, playbookNames);

  assert.equal(model.scopeLabel, "Universe");
  assert.equal(
    model.caseView.cards.totalCases.numerator,
    caseView.cards.totalCases.numerator
  );
  assert.equal(model.caseView.cards.totalCases.numerator, 3);
  assert.deepEqual(model.pipeline.summaryCounts, pipeline.summaryCounts);
  assert.equal(
    model.pipeline.counterfactual.counterfactualRSum,
    pipeline.counterfactual.counterfactualRSum
  );
  assert.equal(model.playbookLearning.length, pb.length);

  const text = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.match(text, /=== INSIGHTS SNAPSHOT ===/);
  assert.match(text, /SCOPE: Universe/);
  assert.match(text, /--- 1\. UNIVERSE ---/);
  assert.match(text, /--- 2\. CASES ---/);
  assert.match(text, /--- 3\. LEARNING ---/);
  assert.match(text, /--- 4\. ATTENTION ---/);
  assert.match(text, /Cases: 3/);
  assert.match(text, /No individual Case is selected in the current Insights context\./);
  assert.match(text, /Counterfactual R is not portfolio P\/L\./);
  assert.doesNotMatch(text, /pathRows:/);
  console.log("UNIVERSE TEST: ok");
}

// --- TSLA filter + no cross-contamination ---
{
  const filters = { ticker: "TSLA" };
  const model = buildInsightsSnapshotModel({
    pipelineInput,
    caseSpine,
    pipelineFilters: filters,
    caseFilters: filters,
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.equal(model.scopeLabel, "Ticker:TSLA");
  assert.equal(model.caseView.cards.totalCases.numerator, 2);
  assert.ok(model.caseView.rows.every((r) => r.ticker === "TSLA"));
  assert.equal(model.playbookLearning.length, 2);

  const text = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: filters,
    caseFilters: filters,
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.match(text, /PLAN-009/);
  assert.match(text, /PLAN-001/);
  // Distinct playbooks / MAF — not fused
  assert.match(text, /expectancy-asymmetry/);
  assert.match(text, /weekly-breakout/);
  assert.match(text, /No individual Case is selected in the current Insights context\./);
  assert.doesNotMatch(text, /AAPL/);
  console.log("TSLA TEST: ok");
}

// --- PLAN-001 focus: Outcome + CF + MAF without forcing Case evaluable ---
{
  const model = buildInsightsSnapshotModel({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-001",
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.ok(model.focus);
  assert.equal(model.focus!.planId, "PLAN-001");
  assert.equal(model.focus!.stockThesisId, "ST-TSLA-001");
  assert.equal(model.focus!.t0Available, false);
  assert.equal(model.focus!.evaluable, false);
  assert.equal(model.focus!.loKind, "unexecuted_plan_loss");
  assert.equal(model.focus!.realizedR, 0);
  assert.equal(model.focus!.counterfactualR, -1);
  assert.equal(model.focus!.mafExperimentId, "MAF-TSLA-002");
  assert.equal(model.focus!.mafPrimaryDrag, "Timing quality");
  assert.equal(model.focus!.equationId, "EQ-016A-NE-MISSING-T0");
  assert.notEqual(model.focus!.family.includes("D2"), true);

  const text = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-001",
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.match(text, /unexecuted_plan_loss/);
  assert.match(text, /TSLA · PLAN-001 · INCOMPLETE/);
  assert.match(text, /Counterfactual: -1\.00R/);
  assert.match(text, /Timing: evaluated 1 · weak\/fail 1 · primary drag 1/);
  assert.match(text, /Counterfactual R is not portfolio P\/L\./);
  assert.doesNotMatch(text, /FOCUS CASE/);
  console.log("PLAN-001 FOCUS TEST: ok");
}

// --- PLAN-009 focus remains independent ---
{
  const model = buildInsightsSnapshotModel({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-009",
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.ok(model.focus);
  assert.equal(model.focus!.planId, "PLAN-009");
  assert.equal(model.focus!.family, "B · No Entry");
  assert.equal(model.focus!.noEntryDiagnosis, "Possible Over-Optimization");
  assert.equal(model.focus!.t0Available, true);
  assert.equal(model.focus!.evaluable, true);
  assert.equal(model.focus!.loKind, "missed_opportunity");
  assert.equal(model.focus!.counterfactualR, 5.83);
  assert.equal(model.focus!.realizedR, 0);
  assert.equal(model.focus!.mafPrimaryDrag, "Entry quality");
  assert.equal(model.focus!.planGeometry?.plannedEntry, 280);

  const text = buildInsightsSnapshotBrief({
    pipelineInput,
    caseSpine,
    pipelineFilters: { ticker: "TSLA" },
    caseFilters: { ticker: "TSLA" },
    focusPlanId: "PLAN-009",
    playbookNames,
    generatedAt: "2026-09-04T19:00:00.000Z",
  });
  assert.match(text, /TSLA · PLAN-009 · COMPLETE/);
  assert.match(text, /Counterfactual: \+5\.83R/);
  assert.doesNotMatch(text, /FOCUS CASE/);
  console.log("PLAN-009 FOCUS TEST: ok");
  console.log("--- PLAN-009 SAMPLE SNAPSHOT ---");
  console.log(text);
}

// UI + unified snapshot action
{
  const src = readFileSync(
    "app/components/insights-preview/PreviewPipelinePerformance.tsx",
    "utf8"
  );
  assert.match(src, /Copy Snapshot/);
  assert.match(src, /composeUnifiedSnapshot/);
  assert.match(src, /buildInsightsSnapshotBrief/);
  assert.match(src, /data-testid="insights-snapshot-copy"/);
  assert.doesNotMatch(src, /consumed from original entry/);
  assert.match(src, /without participation/);
  assert.doesNotMatch(src, /Snapshots ▾/);
  assert.doesNotMatch(src, /\bReport\b/);
  assert.match(src, /\bInsights\b/);
  assert.ok(
    VISIBLE_SNAPSHOT_MENU_LABELS.includes("Insights Snapshot")
  );
  assert.ok(!VISIBLE_SNAPSHOT_MENU_LABELS.includes("Plan Snapshot"));
  console.log("LOCAL UI WIRING: ok");
}

console.log("PIPELINE PARITY: ok (snapshot model === canonical builders)");
console.log("test-insights-snapshot: ok");
