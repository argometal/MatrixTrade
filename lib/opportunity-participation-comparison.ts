import type { LearningOutcome, LearningOutcomeKind } from "./learning-outcome-types";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import type { MarketRealityCaseWindow } from "./market-reality-types";
import { analyzeOpportunityConsumption } from "./opportunity-consumption";
import { isDuplicateEconomicObservation } from "./duplicate-observation";
import {
  descriptiveAverage,
  descriptiveMedian,
  descriptiveProportion,
} from "./descriptive-statistics";
import {
  buildCheckpointResearchUniverse,
  buildParticipationResearchUniverse,
  type ResearchUniverseDescriptor,
} from "./research-universe";
import type { PipelinePerformanceFilters } from "./insights-pipeline-performance";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";

export type OpportunityParticipationComparisonSource = {
  plans: TradePlan[];
  trades: Trade[];
  learningOutcomes: LearningOutcome[];
  caseSpine: InsightsCaseRow[];
  realityWindows: MarketRealityCaseWindow[];
};

export type OpportunityParticipationComparisonRow = {
  planId: string;
  ticker: string;
  date: string;
  playbookId: string | null;
  lifecycleStatus: string;
  caseFamily: InsightsCaseRow["family"];
  noEntryDiagnosis: InsightsCaseRow["noEntryDiagnosis"];
  decisionVerdict: string | null;
  windowKind: MarketRealityCaseWindow["windowKind"];
  windowStart: string;
  windowEnd: string;
  observationWindowDays: number | null;
  favorableDisplacementPrice: number | null;
  favorableDisplacementR: number | null;
  plannedRiskPrice: number | null;
  pullbackAfterPeakR: number | null;
  retestedOriginalEntryAfterPeak: boolean | null;
  restoredRRAtDeepestPullback: number | null;
  originalPlanGeometryAvailable: boolean;
  waitEvidenceAvailable: boolean;
  noParticipationObserved: boolean;
  actualExecutionOccurred: boolean;
  actualOleParticipationObserved: boolean;
  actualOlePartialParticipationObserved: boolean;
  actualOleFullParticipationObserved: boolean;
  oleEvidenceAvailable: boolean;
  oleExecutionModel: string | null;
  oleStatus: string | null;
  supportLevelAvailable: boolean;
  familyBState: string | null;
  trendIntegrity: string | null;
  pullbackQuality: string | null;
  lateEntryGeometryAvailable: boolean;
  lateEntryGeometryReason: string | null;
  excludedFromAggregates: boolean;
  exclusionReason: string | null;
  checkpoints: ReturnType<typeof analyzeOpportunityConsumption>["checkpoints"];
};

export type OpportunityParticipationCheckpointAggregate = {
  thresholdR: number;
  reachedCount: number;
  observationWindowEligibleCount: number;
  pullbackObservedCount: number;
  retestObservedCount: number;
  noReturnObservedCount: number;
  targetReachedAfterCount: number;
  stopReachedAfterCount: number;
  oleAnnotatedCount: number;
  lateGeometryAvailableCount: number;
  averagePullbackDepthR: number | null;
  medianPullbackDepthR: number | null;
  averageTimeToPullbackMs: number | null;
  medianTimeToPullbackMs: number | null;
  /** Descriptive proportion within checkpoint observation-window N — not a probability claim. */
  retestObservedProportion: number | null;
  noReturnObservedProportion: number | null;
  researchUniverse: ResearchUniverseDescriptor;
};

export type OpportunityParticipationComparisonView = {
  eligibleOpportunityCount: number;
  excludedOpportunityCount: number;
  unavailableOpportunityCount: number;
  eligibleWindowLabel: string;
  researchUniverse: ResearchUniverseDescriptor;
  rows: OpportunityParticipationComparisonRow[];
  excludedRows: OpportunityParticipationComparisonRow[];
  participationEvidence: {
    layeredConfigurationCount: number;
    actualExecutionCount: number;
    noParticipationCount: number;
    actualOleParticipationCount: number;
    actualOlePartialParticipationCount: number;
    actualOleFullParticipationCount: number;
    actualOleTimingEvidenceCount: number;
  };
  closures: {
    fullVsOle: { status: "OBSERVED" | "INSUFFICIENT EVIDENCE" | "UNAVAILABLE"; evidence: string; gap: string | null };
    oleVsWait: { status: "OBSERVED" | "INSUFFICIENT EVIDENCE" | "UNAVAILABLE"; evidence: string; gap: string | null };
    earlyOleVsLate: { status: "OBSERVED" | "INSUFFICIENT EVIDENCE" | "UNAVAILABLE"; evidence: string; gap: string | null };
    oleAfterDisplacement: { status: "OBSERVED" | "INSUFFICIENT EVIDENCE" | "UNAVAILABLE"; evidence: string; gap: string | null };
    partialParticipationPullback: { status: "OBSERVED" | "INSUFFICIENT EVIDENCE" | "UNAVAILABLE"; evidence: string; gap: string | null };
  };
  alternatives: {
    fullParticipationEvidenceCount: number;
    waitEvidenceCount: number;
    oleEvidenceCount: number;
    lateParticipationGeometryCount: number;
  };
  checkpointAggregates: OpportunityParticipationCheckpointAggregate[];
};

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return true;
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

function passesFilters(
  row: { ticker: string; playbookId: string | null; date: string },
  filters: Pick<PipelinePerformanceFilters, "from" | "to" | "ticker" | "playbookId">
): boolean {
  if (filters.ticker && row.ticker.toUpperCase() !== filters.ticker.toUpperCase()) return false;
  if (filters.playbookId && row.playbookId !== filters.playbookId) return false;
  if (!inRange(row.date, filters.from, filters.to)) return false;
  return true;
}

function isExecutedKind(kind: LearningOutcomeKind | null | undefined): boolean {
  return kind === "executed_win" || kind === "executed_loss";
}

function average(values: number[]): number | null {
  return descriptiveAverage(values);
}

function median(values: number[]): number | null {
  return descriptiveMedian(values);
}

function round(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(4));
}

function diffDays(startIso: string | null | undefined, endIso: string | null | undefined): number | null {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Number((((end - start) / 86400000)).toFixed(2));
}

function hasObservationAfterCheckpoint(
  checkpoint: OpportunityParticipationComparisonRow["checkpoints"][number]
): boolean {
  return Boolean(
    checkpoint.subsequentMfeAt ||
      checkpoint.subsequentMaeAt ||
      checkpoint.pullbackLowAfterThresholdAt ||
      checkpoint.targetReachedAfterThreshold !== null ||
      checkpoint.stopReachedAfterThreshold !== null
  );
}

function hasActualOleParticipation(plan: TradePlan): boolean {
  const entry = plan.layeredEntry;
  if (!entry) return false;
  if (entry.filled === true) return true;
  if (typeof entry.fillPercent === "number" && entry.fillPercent > 0) return true;
  return entry.limits.some(
    (limit) =>
      limit.filled === true ||
      (typeof limit.filledQuantity === "number" && limit.filledQuantity > 0)
  );
}

function hasActualOleTimingEvidence(plan: TradePlan): boolean {
  // Prospective fillRecordedAt stamps when a layer first becomes filled.
  // This is participation timing evidence, not OLE performance.
  const entry = plan.layeredEntry;
  if (!entry) return false;
  return entry.limits.some((limit) => typeof limit.fillRecordedAt === "string");
}

export function computeOpportunityParticipationComparison(input: {
  source: OpportunityParticipationComparisonSource;
  filters?: Pick<PipelinePerformanceFilters, "from" | "to" | "ticker" | "playbookId">;
}): OpportunityParticipationComparisonView {
  const filters = input.filters ?? {};
  const byPlanRow = new Map(
    input.source.caseSpine.map((row) => [row.planId.toUpperCase(), row] as const)
  );
  const loByPlan = new Map<string, LearningOutcome>();
  for (const lo of input.source.learningOutcomes) {
    if (!lo.planId) continue;
    if (!loByPlan.has(lo.planId.toUpperCase())) {
      loByPlan.set(lo.planId.toUpperCase(), lo);
    }
  }
  const tradePlanIds = new Set(
    input.source.trades
      .map((trade) => trade.planId?.toUpperCase())
      .filter((value): value is string => Boolean(value))
  );
  const windowsByPlan = new Map<string, MarketRealityCaseWindow[]>();
  for (const window of input.source.realityWindows) {
    const key = window.planId.toUpperCase();
    const existing = windowsByPlan.get(key) ?? [];
    existing.push(window);
    windowsByPlan.set(key, existing);
  }

  let unavailableOpportunityCount = 0;
  const rows: OpportunityParticipationComparisonRow[] = [];
  const excludedRows: OpportunityParticipationComparisonRow[] = [];
  let layeredConfigurationCount = 0;
  let actualExecutionCount = 0;
  let noParticipationCount = 0;
  let actualOleParticipationCount = 0;
  let actualOlePartialParticipationCount = 0;
  let actualOleFullParticipationCount = 0;
  let actualOleTimingEvidenceCount = 0;

  for (const plan of input.source.plans) {
    const spine = byPlanRow.get(plan.id.toUpperCase());
    if (!spine || spine.caseOrigin === "historical_trade") continue;
    if (!passesFilters(
      {
        ticker: plan.ticker,
        playbookId: plan.playbookId ?? null,
        date: spine.date,
      },
      filters
    )) {
      continue;
    }
    const learningOutcome = loByPlan.get(plan.id.toUpperCase()) ?? null;
    const isDuplicate = isDuplicateEconomicObservation({
      plan,
      learningOutcome,
    });
    const executionOccurred =
      tradePlanIds.has(plan.id.toUpperCase()) ||
      isExecutedKind(learningOutcome?.kind) ||
      plan.linkedTradeId != null;
    const actualOleParticipationObserved = hasActualOleParticipation(plan);
    const actualOlePartialParticipationObserved =
      actualOleParticipationObserved &&
      (((plan.layeredEntry?.fillPercent ?? 0) > 0 && (plan.layeredEntry?.fillPercent ?? 0) < 100) ||
        plan.layeredEntry?.status === "partial");
    const actualOleFullParticipationObserved =
      actualOleParticipationObserved &&
      ((plan.layeredEntry?.fillPercent ?? 0) >= 100 || plan.layeredEntry?.status === "full");
    // Duplicates retain historical access but do not inflate participation N.
    if (!isDuplicate) {
      if (plan.layeredEntry) layeredConfigurationCount += 1;
      if (executionOccurred) actualExecutionCount += 1;
      if (!executionOccurred) noParticipationCount += 1;
      if (actualOleParticipationObserved) actualOleParticipationCount += 1;
      if (actualOlePartialParticipationObserved) actualOlePartialParticipationCount += 1;
      if (actualOleFullParticipationObserved) actualOleFullParticipationCount += 1;
      if (hasActualOleTimingEvidence(plan)) actualOleTimingEvidenceCount += 1;
    }
    if (executionOccurred) continue;

    const planWindows = windowsByPlan.get(plan.id.toUpperCase()) ?? [];
    const window =
      planWindows.find((item) => item.windowKind === "retrospective_observation") ??
      planWindows.find((item) => item.windowKind === "original_plan_window") ??
      null;

    const analysis = analyzeOpportunityConsumption({
      window,
      plannedEntry: plan.plannedEntry ?? null,
      stopPrice: plan.stopPrice ?? null,
      targetPrice: plan.targetPrice ?? null,
      plannedRR: plan.plannedRR ?? null,
      executionOccurred: false,
      learningOutcome,
    });
    if (!analysis.available) {
      unavailableOpportunityCount += 1;
      continue;
    }

    const row: OpportunityParticipationComparisonRow = {
      planId: plan.id,
      ticker: plan.ticker,
      date: spine.date,
      playbookId: plan.playbookId ?? null,
      lifecycleStatus: spine.lifecycle.status,
      caseFamily: spine.family,
      noEntryDiagnosis: spine.noEntryDiagnosis,
      decisionVerdict: plan.decision?.verdict ?? spine.verdict ?? null,
      windowKind: analysis.windowKind ?? "retrospective_observation",
      windowStart: analysis.windowStart ?? "",
      windowEnd: analysis.windowEnd ?? "",
      observationWindowDays: diffDays(analysis.windowStart, analysis.windowEnd),
      favorableDisplacementPrice: analysis.favorableDisplacementPrice,
      favorableDisplacementR: analysis.favorableDisplacementR,
      plannedRiskPrice: analysis.plannedRiskPrice,
      pullbackAfterPeakR: analysis.subsequentPullbackR,
      retestedOriginalEntryAfterPeak: analysis.retestedOriginalEntryAfterPeak,
      restoredRRAtDeepestPullback: analysis.restoredRRAtDeepestPullback,
      originalPlanGeometryAvailable: true,
      waitEvidenceAvailable: true,
      noParticipationObserved: true,
      actualExecutionOccurred: false,
      actualOleParticipationObserved,
      actualOlePartialParticipationObserved,
      actualOleFullParticipationObserved,
      oleEvidenceAvailable: Boolean(plan.layeredEntry),
      oleExecutionModel: plan.layeredEntry?.executionModel ?? null,
      oleStatus: plan.layeredEntry?.status ?? null,
      supportLevelAvailable: plan.supportLevel != null,
      familyBState: plan.familyBAssessment?.state ?? null,
      trendIntegrity: plan.familyBAssessment?.trendIntegrity ?? null,
      pullbackQuality: plan.familyBAssessment?.pullbackQuality ?? null,
      lateEntryGeometryAvailable: analysis.lateEntryGeometryAvailable,
      lateEntryGeometryReason: analysis.lateEntryGeometryReason,
      excludedFromAggregates: analysis.excludedFromAggregates,
      exclusionReason: analysis.exclusionReason,
      checkpoints: analysis.checkpoints,
    };
    if (row.excludedFromAggregates) excludedRows.push(row);
    else rows.push(row);
  }

  const checkpointThresholds = Array.from(
    new Set(
      rows.flatMap((row) => row.checkpoints.map((checkpoint) => checkpoint.thresholdR))
    )
  ).sort((a, b) => a - b);

  const checkpointAggregates = checkpointThresholds.map((thresholdR) => {
    const matching = rows
      .map((row) => ({ row, checkpoint: row.checkpoints.find((item) => item.thresholdR === thresholdR) ?? null }))
      .filter(
        (
          item
        ): item is { row: OpportunityParticipationComparisonRow; checkpoint: OpportunityParticipationComparisonRow["checkpoints"][number] } =>
          Boolean(item.checkpoint?.reached)
      );
    const observed = matching.filter((item) => hasObservationAfterCheckpoint(item.checkpoint));
    const pullbackDepths = observed
      .map((item) => item.checkpoint.pullbackDepthR)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const times = observed
      .map((item) => item.checkpoint.timeToDeepestPullbackMs)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const retestObservedCount = matching.filter((item) => item.checkpoint.retestedOriginalEntry === true).length;
    const noReturnObservedCount = observed.filter((item) => item.checkpoint.retestedOriginalEntry === false).length;
    return {
      thresholdR,
      reachedCount: matching.length,
      observationWindowEligibleCount: observed.length,
      pullbackObservedCount: matching.filter((item) => item.checkpoint.laterPullbackObserved === true).length,
      retestObservedCount,
      noReturnObservedCount,
      targetReachedAfterCount: matching.filter((item) => item.checkpoint.targetReachedAfterThreshold === true).length,
      stopReachedAfterCount: matching.filter((item) => item.checkpoint.stopReachedAfterThreshold === true).length,
      oleAnnotatedCount: matching.filter((item) => item.row.oleEvidenceAvailable).length,
      lateGeometryAvailableCount: matching.filter((item) => item.row.lateEntryGeometryAvailable).length,
      averagePullbackDepthR: average(pullbackDepths),
      medianPullbackDepthR: median(pullbackDepths),
      averageTimeToPullbackMs: average(times),
      medianTimeToPullbackMs: median(times),
      retestObservedProportion: descriptiveProportion(retestObservedCount, observed.length),
      noReturnObservedProportion: descriptiveProportion(noReturnObservedCount, observed.length),
      researchUniverse: buildCheckpointResearchUniverse({
        thresholdR,
        reachedCount: matching.length,
        observationWindowEligibleCount: observed.length,
      }),
    };
  });

  const eligibleWindowLabel =
    "Eligible paths require a canonical non-executed modern Case, preserved plan geometry, and a Case-bound Reality window. 'No return observed' is bounded to the preserved window after each checkpoint.";

  return {
    eligibleOpportunityCount: rows.length,
    excludedOpportunityCount: excludedRows.length,
    unavailableOpportunityCount,
    eligibleWindowLabel,
    researchUniverse: buildParticipationResearchUniverse({
      eligibleOpportunityCount: rows.length,
      excludedOpportunityCount: excludedRows.length,
      unavailableOpportunityCount,
      eligibleWindowLabel,
    }),
    rows: rows.sort((a, b) => b.date.localeCompare(a.date) || a.planId.localeCompare(b.planId)),
    excludedRows: excludedRows.sort((a, b) => b.date.localeCompare(a.date) || a.planId.localeCompare(b.planId)),
    participationEvidence: {
      layeredConfigurationCount,
      actualExecutionCount,
      noParticipationCount,
      actualOleParticipationCount,
      actualOlePartialParticipationCount,
      actualOleFullParticipationCount,
      actualOleTimingEvidenceCount,
    },
    closures: {
      fullVsOle: {
        status:
          actualExecutionCount > 0 && actualOleParticipationCount > 0
            ? "OBSERVED"
            : "INSUFFICIENT EVIDENCE",
        evidence: `Full-participation baseline geometry is preserved on ${rows.length} eligible non-executed paths; layered configuration exists on ${layeredConfigurationCount} filtered Cases; actual OLE participation observed on ${actualOleParticipationCount}.`,
        gap:
          actualOleParticipationCount > 0
            ? null
            : "No filtered Case preserves actual OLE participation, so a descriptive full-vs-OLE outcome comparison cannot yet be populated.",
      },
      oleVsWait: {
        status:
          actualOleParticipationCount > 0 && noParticipationCount > 0
            ? "OBSERVED"
            : "INSUFFICIENT EVIDENCE",
        evidence: `No participation is observed on ${noParticipationCount} filtered Cases; actual OLE participation is observed on ${actualOleParticipationCount}; layered configuration without fills exists on ${layeredConfigurationCount}.`,
        gap:
          actualOleParticipationCount > 0
            ? null
            : "Wait/no-participation is present, but no filtered Case preserves actual OLE participation evidence yet.",
      },
      earlyOleVsLate: {
        status: "UNAVAILABLE",
        evidence:
          "OLE fillRecordedAt can preserve participation timing prospectively, but contemporaneous late-entry geometry remains unavailable.",
        gap:
          "Early OLE vs later participation still needs contemporaneous late-entry geometry. Timing alone is insufficient.",
      },
      oleAfterDisplacement: {
        status:
          actualOleParticipationCount > 0 && actualOleTimingEvidenceCount > 0
            ? "INSUFFICIENT EVIDENCE"
            : "UNAVAILABLE",
        evidence: `Actual OLE participation observed on ${actualOleParticipationCount}; timing stamps observed on ${actualOleTimingEvidenceCount}. Displacement-at-participation remains descriptive only when both exist.`,
        gap:
          actualOleParticipationCount > 0 && actualOleTimingEvidenceCount > 0
            ? "Insufficient eligible Cases with both OLE participation and fillRecordedAt to populate a descriptive comparison yet."
            : "Displacement at actual participation time requires preserved OLE participation timing (fillRecordedAt).",
      },
      partialParticipationPullback: {
        status:
          actualOlePartialParticipationCount > 0 && actualOleTimingEvidenceCount > 0
            ? "OBSERVED"
            : "UNAVAILABLE",
        evidence: `Actual partial OLE participation observed on ${actualOlePartialParticipationCount} filtered Cases; timing evidence observed on ${actualOleTimingEvidenceCount}.`,
        gap:
          actualOlePartialParticipationCount > 0 && actualOleTimingEvidenceCount > 0
            ? null
            : "Subsequent pullback after actual partial participation cannot be aligned canonically without actual partial-participation timing evidence.",
      },
    },
    alternatives: {
      fullParticipationEvidenceCount: rows.filter((row) => row.originalPlanGeometryAvailable).length,
      waitEvidenceCount: rows.filter((row) => row.waitEvidenceAvailable).length,
      oleEvidenceCount: rows.filter((row) => row.oleEvidenceAvailable).length,
      lateParticipationGeometryCount: rows.filter((row) => row.lateEntryGeometryAvailable).length,
    },
    checkpointAggregates,
  };
}
