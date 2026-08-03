/**
 * 30-2C — Insights Pipeline Performance.
 * Run: npm run test:insights-pipeline
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computePipelinePerformance,
  isCounterfactualOutcomeBucket,
  isRealizedOutcomeBucket,
  PIPELINE_OUTCOME_BUCKETS,
  PIPELINE_PERFORMANCE_COMPONENTS,
} from "../lib/insights-pipeline-performance";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { MafExperiment } from "../lib/maf-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { TradePlan } from "../lib/plan-types";
import type { Trade } from "../lib/types";

const root = join(__dirname, "..");

function lo(partial: Partial<LearningOutcome> & Pick<LearningOutcome, "id" | "kind" | "ticker">): LearningOutcome {
  return {
    lifecycleStatus: "concluded",
    source: "manual",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...partial,
  };
}

function maf(partial: Partial<MafExperiment> & Pick<MafExperiment, "id" | "ticker">): MafExperiment {
  return {
    status: "attributed",
    evidence: { fillStatus: "unknown", sources: {} },
    attributions: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...partial,
  };
}

{
  // No realized/counterfactual mixing on missed / UPL rows
  const view = computePipelinePerformance({
    learningOutcomes: [
      lo({
        id: "LO-WIN",
        kind: "executed_win",
        ticker: "AAPL",
        tradeId: "H001",
        realizedR: 2,
        realizedPnL: 200,
        counterfactualR: 99, // must be ignored for executed display path
      }),
      lo({
        id: "LO-MISS",
        kind: "missed_opportunity",
        ticker: "AAPL",
        planId: "PLAN-1",
        counterfactualR: -1,
        realizedR: 5, // must NOT enter realized totals
        realizedPnL: 500,
      }),
      lo({
        id: "LO-UPL",
        kind: "unexecuted_plan_loss",
        ticker: "MSFT",
        planId: "PLAN-2",
        counterfactualR: -1,
        realizedPnL: -999,
      }),
    ],
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: [],
  });

  assert.equal(view.summaryCounts.executed_trades, 1);
  assert.equal(view.summaryCounts.missed_opportunities, 1);
  assert.equal(view.summaryCounts.unexecuted_plan_losses, 1);
  assert.equal(view.realized.tradeCount, 1);
  assert.equal(view.realized.wins, 1);
  assert.equal(view.realized.losses, 0);
  assert.equal(view.realized.realizedRSum, 2);
  assert.equal(view.realized.realizedPnLSum, 200);
  // Missed + UPL counterfactual only
  assert.equal(view.counterfactual.counterfactualRSum, -2);
  assert.equal(view.counterfactual.triggeredPlansWithoutTrade, 0);
  assert.equal(view.counterfactual.thesisFailureRate, null);

  const miss = view.rows.find((r) => r.learningOutcomeId === "LO-MISS");
  assert.ok(miss);
  assert.equal(miss!.realizedR, null);
  assert.equal(miss!.realizedPnL, null);
  assert.equal(miss!.counterfactualR, -1);

  const win = view.rows.find((r) => r.learningOutcomeId === "LO-WIN");
  assert.ok(win);
  assert.equal(win!.counterfactualR, null);
  assert.equal(win!.realizedR, 2);
}

{
  // P0: triggered-without-trade + thesis failure rate surface (Scout ledger only)
  const view = computePipelinePerformance({
    learningOutcomes: [
      lo({
        id: "LO-TRIG",
        kind: "unexecuted_plan_loss",
        ticker: "TSLA",
        planId: "PLAN-TRIG",
        entryReached: true,
        counterfactualR: -1,
      }),
      lo({
        id: "LO-TRIG2",
        kind: "missed_opportunity",
        ticker: "TSLA",
        planId: "PLAN-TRIG2",
        entryReached: true,
        counterfactualR: 0.5,
      }),
    ],
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: [
      maf({
        id: "MAF-T",
        ticker: "TSLA",
        attributions: [
          {
            component: "thesis_quality",
            classification: "failure",
            aiInterpretationConfidence: 70,
            reasoning: "weak thesis",
          },
        ],
      }),
      maf({
        id: "MAF-T2",
        ticker: "TSLA",
        attributions: [
          {
            component: "thesis_quality",
            classification: "good",
            aiInterpretationConfidence: 60,
            reasoning: "ok",
          },
        ],
      }),
    ],
  });
  assert.equal(view.counterfactual.triggeredPlansWithoutTrade, 2);
  assert.equal(view.counterfactual.thesisEvaluationCount, 2);
  assert.equal(view.counterfactual.thesisFailureCount, 1);
  assert.equal(view.counterfactual.thesisFailureRate, 0.5);
  assert.equal(view.realized.tradeCount, 0);
  assert.equal(view.realized.realizedPnLSum, 0);
}

{
  // Missed Scouts excluded from Trade win/loss statistics
  const view = computePipelinePerformance({
    learningOutcomes: [
      lo({
        id: "LO-M1",
        kind: "missed_opportunity",
        ticker: "NVDA",
        planId: "PLAN-M",
        counterfactualR: 3,
      }),
      lo({
        id: "LO-M2",
        kind: "missed_opportunity",
        ticker: "NVDA",
        planId: "PLAN-M2",
        counterfactualR: 2,
      }),
    ],
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: [],
  });
  assert.equal(view.realized.tradeCount, 0);
  assert.equal(view.realized.wins, 0);
  assert.equal(view.realized.losses, 0);
  assert.equal(view.realized.realizedRSum, 0);
  assert.equal(view.realized.realizedPnLSum, 0);
  assert.equal(view.summaryCounts.missed_opportunities, 2);
  assert.ok(view.counterfactual.scoutEvaluatedCount >= 2);
}

{
  // Filters: ticker, outcome, executed mode, component
  const experiments: MafExperiment[] = [
    maf({
      id: "MAF-1",
      ticker: "AAPL",
      tradeId: "H010",
      playbookId: "PB-1",
      primaryDragComponent: "stop_quality",
      attributions: [
        {
          component: "stop_quality",
          classification: "failure",
          aiInterpretationConfidence: 80,
          reasoning: "stop too tight",
        },
      ],
    }),
  ];
  const outcomes: LearningOutcome[] = [
    lo({
      id: "LO-A",
      kind: "executed_loss",
      ticker: "AAPL",
      tradeId: "H010",
      playbookId: "PB-1",
      mafExperimentId: "MAF-1",
      realizedR: -1,
      realizedPnL: -100,
    }),
    lo({
      id: "LO-B",
      kind: "expired",
      ticker: "MSFT",
      planId: "PLAN-X",
      playbookId: "PB-2",
    }),
  ];

  const byTicker = computePipelinePerformance({
    learningOutcomes: outcomes,
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: experiments,
    filters: { ticker: "AAPL" },
  });
  assert.equal(byTicker.rows.length, 1);
  assert.equal(byTicker.rows[0].ticker, "AAPL");

  const nonExec = computePipelinePerformance({
    learningOutcomes: outcomes,
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: experiments,
    filters: { executedMode: "non_executed" },
  });
  assert.equal(nonExec.summaryCounts.executed_trades, 0);
  assert.equal(nonExec.summaryCounts.expired_plans, 1);

  const byComponent = computePipelinePerformance({
    learningOutcomes: outcomes,
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: experiments,
    filters: { pipelineComponent: "stop_quality" },
  });
  assert.equal(byComponent.rows.length, 1);
  assert.equal(byComponent.rows[0].primaryDragComponent, "stop_quality");
  assert.ok(
    byComponent.repeatedDragComponents.some((r) => r.component === "stop_quality")
  );
}

{
  // Drill-down identity
  const view = computePipelinePerformance({
    learningOutcomes: [
      lo({
        id: "LO-D",
        kind: "executed_win",
        ticker: "TSLA",
        tradeId: "H099",
        planId: "PLAN-99",
        observationId: "OBS-99",
        mafExperimentId: "MAF-99",
        realizedR: 1,
      }),
    ],
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: [
      maf({
        id: "MAF-99",
        ticker: "TSLA",
        tradeId: "H099",
        primaryDragComponent: "entry_quality",
        attributions: [],
      }),
    ],
  });
  const row = view.rows[0];
  assert.equal(row.tradeId, "H099");
  assert.equal(row.planId, "PLAN-99");
  assert.equal(row.observationId, "OBS-99");
  assert.equal(row.learningOutcomeId, "LO-D");
  assert.equal(row.mafExperimentId, "MAF-99");
  assert.equal(row.href, "/trades/H099");
}

{
  // Empty state
  const empty = computePipelinePerformance({
    learningOutcomes: [],
    plans: [],
    trades: [],
    observations: [],
    mafExperiments: [],
  });
  assert.equal(empty.empty, true);
  assert.equal(empty.rows.length, 0);
  for (const bucket of PIPELINE_OUTCOME_BUCKETS) {
    assert.equal(empty.summaryCounts[bucket], 0);
  }
}

{
  // Pending observations + cancelled/expired plans without LO
  const plans: TradePlan[] = [
    {
      id: "PLAN-EXP",
      ticker: "AMD",
      status: "expired",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    },
    {
      id: "PLAN-SKIP",
      ticker: "AMD",
      status: "skipped",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    },
  ];
  const observations: ObservationRecord[] = [
    {
      id: "OBS-P",
      ticker: "AMD",
      status: "observing",
      startedAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
      durationDays: 90,
      createdAt: "2026-07-01T00:00:00.000Z",
      lastUpdatedAt: "2026-07-01T00:00:00.000Z",
      planId: "PLAN-OBS",
    },
  ];
  const view = computePipelinePerformance({
    learningOutcomes: [],
    plans,
    trades: [] as Trade[],
    observations,
    mafExperiments: [],
  });
  assert.equal(view.summaryCounts.expired_plans, 1);
  assert.equal(view.summaryCounts.cancelled_plans, 1);
  assert.equal(view.summaryCounts.observations_pending, 1);
  assert.equal(view.pendingObservationCount, 1);
  assert.equal(
    view.rows.find((r) => r.planId === "PLAN-EXP")?.href,
    "/planning?plan=PLAN-EXP"
  );
}

{
  assert.equal(isRealizedOutcomeBucket("executed_trades"), true);
  assert.equal(isRealizedOutcomeBucket("missed_opportunities"), false);
  assert.equal(isCounterfactualOutcomeBucket("unexecuted_plan_losses"), true);
  assert.equal(PIPELINE_PERFORMANCE_COMPONENTS.length, 7);
}

{
  // Mobile layout + wiring markers (no new route)
  const hub = readFileSync(
    join(root, "app/components/insights-preview/PreviewInsightsHub.tsx"),
    "utf8"
  );
  const ui = readFileSync(
    join(root, "app/components/insights-preview/PreviewPipelinePerformance.tsx"),
    "utf8"
  );
  const page = readFileSync(
    join(root, "app/(trading)/(nav)/stats/page.tsx"),
    "utf8"
  );
  assert.match(hub, /Pipeline Performance/);
  assert.match(hub, /tab=pipeline/);
  assert.match(ui, /data-insights-pipeline-performance/);
  assert.match(ui, /data-pipeline-filters/);
  assert.match(ui, /data-pipeline-empty/);
  assert.match(ui, /data-pipeline-realized/);
  assert.match(ui, /data-pipeline-counterfactual/);
  assert.match(ui, /data-pipeline-triggered-without-trade/);
  assert.match(ui, /data-pipeline-thesis-failure-rate/);
  assert.match(ui, /min-h-11/);
  assert.match(ui, /sm:grid-cols-2/);
  assert.match(ui, /overflow-x-auto/);
  assert.match(page, /getLearningOutcomes/);
  assert.match(page, /getMafExperiments/);
  assert.match(page, /getObservations/);
  assert.match(page, /getPlans/);
  assert.doesNotMatch(page, /app\/\(trading\).*\/insights\/page/);
  assert.doesNotMatch(hub, /create table|maf_experiments/);

  const planning = readFileSync(
    join(root, "app/components/planning-preview/PreviewPlanning.tsx"),
    "utf8"
  );
  assert.match(planning, /data-scout-learning-queue/);
  assert.match(planning, /planNeedsLearningSyncRepair/);
  assert.match(planning, /data-scout-needs-outcome/);
}

console.log("test-insights-pipeline-30-2c: ok");
