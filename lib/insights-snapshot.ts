/**
 * Insights → Pipeline Snapshot (MXT 029).
 * AI-readable product context — not a UI dump, not a parallel metrics engine.
 * Reuses buildInsightsCaseSpineView + computePipelinePerformance + aggregatePlaybookDiagnosis.
 */

import {
  CASE_D_SUBTYPE_LABEL,
  NO_ENTRY_DIAGNOSIS_LABEL,
  caseFamilyLabel,
  noEntryDiagnosisLabel,
} from "./insights-case-labels";
import {
  buildInsightsCaseSpineView,
  pickCasesNeedingReview,
  type InsightsCaseSpineFilters,
} from "./insights-case-spine-view";
import { resolveLearningOutcomeForPlan } from "./learning-outcome-resolve";
import type {
  InsightsCaseRow,
  InsightsCaseSpineView,
} from "./insights-case-spine-types";
import {
  PIPELINE_OUTCOME_BUCKETS,
  PIPELINE_OUTCOME_BUCKET_LABELS,
  computePipelinePerformance,
  type PipelinePerformanceFilters,
  type PipelinePerformanceInput,
  type PipelinePerformanceView,
} from "./insights-pipeline-performance";
import {
  aggregatePlaybookDiagnosis,
  type PlaybookDiagnosisAggregate,
} from "./insights-playbook-diagnosis";
import type { LearningOutcome } from "./learning-outcome-types";
import type { MafExperiment } from "./maf-types";
import { MAF_COMPONENT_LABELS } from "./maf-types";
import type { ObservationRecord } from "./observation-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import { wrapSnapshotText } from "./snapshot-verification";

export type InsightsSnapshotBriefInput = {
  pipelineInput: PipelinePerformanceInput;
  caseSpine: InsightsCaseRow[];
  /** Pipeline LO/outcome filters (same as Pipeline UI). */
  pipelineFilters?: PipelinePerformanceFilters;
  /** Case equation filters (same as Pipeline Case filters). */
  caseFilters?: InsightsCaseSpineFilters;
  /** Optional Case deep-link (e.g. PLAN-001). */
  focusPlanId?: string;
  playbookNames?: Map<string, string> | Record<string, string>;
  generatedAt?: string;
};

export type InsightsSnapshotFocusTrace = {
  planId: string;
  inFilteredUniverse: boolean;
  ticker: string;
  playbookId: string | null;
  playbookName: string;
  family: string;
  caseDSubtype: string | null;
  noEntryDiagnosis: string | null;
  equationId: string;
  decisionQuality: string;
  reality: string;
  executionQuality: string;
  t0Available: boolean;
  /** original | reconstructed | corrected when freeze present. */
  t0RecordKind?: string | null;
  evaluable: boolean;
  loKind: string | null;
  /** Actual fill result only — never CF. */
  realizedR: number | null;
  /** Planned-path R when evaluable — never portfolio P/L. */
  counterfactualR: number | null;
  learningOutcomeId: string | null;
  observationId: string | null;
  mafExperimentId: string | null;
  mafPrimaryDrag: string | null;
  mafStatus: string | null;
  mafSource: string | null;
  suggestedImprovement: string | null;
  diagnosisReason: string;
  caseHref: string;
  stockThesisId: string | null;
  linkage: {
    tradeId: string | null;
    planThesis: string;
    planPlaybook: string;
    tradePlan: string;
  } | null;
  planGeometry: {
    plannedEntry: number | null;
    stopPrice: number | null;
    targetPrice: number | null;
    plannedRR: number | null;
  } | null;
};

export type InsightsSnapshotModel = {
  generatedAt: string;
  scopeLabel: string;
  pipelineFilters: PipelinePerformanceFilters;
  caseFilters: InsightsCaseSpineFilters;
  caseView: InsightsCaseSpineView;
  pipeline: PipelinePerformanceView;
  playbookLearning: PlaybookDiagnosisAggregate[];
  focus: InsightsSnapshotFocusTrace | null;
  focusMissing: boolean;
};

function playbookNameOf(
  id: string | null | undefined,
  names?: Map<string, string> | Record<string, string>
): string {
  if (!id) return "(no playbook)";
  if (names instanceof Map) return names.get(id) ?? id;
  if (names && names[id]) return names[id]!;
  return id;
}

function scopeLabelFromFilters(
  pipelineFilters: PipelinePerformanceFilters,
  caseFilters: InsightsCaseSpineFilters
): string {
  const parts: string[] = [];
  const ticker = pipelineFilters.ticker ?? caseFilters.ticker;
  if (ticker?.trim()) parts.push(`Ticker:${ticker.trim().toUpperCase()}`);
  else parts.push("Universe");
  const pb = pipelineFilters.playbookId ?? caseFilters.playbookId;
  if (pb) parts.push(`Playbook:${pb}`);
  if (pipelineFilters.from) parts.push(`From:${pipelineFilters.from}`);
  if (pipelineFilters.to) parts.push(`To:${pipelineFilters.to}`);
  if (caseFilters.caseFamily && caseFilters.caseFamily !== "all") {
    parts.push(`Family:${caseFilters.caseFamily}`);
  }
  if (caseFilters.noEntryDiagnosis && caseFilters.noEntryDiagnosis !== "all") {
    parts.push(`NoEntryDx:${caseFilters.noEntryDiagnosis}`);
  }
  if (caseFilters.decisionQuality && caseFilters.decisionQuality !== "all") {
    parts.push(`DQ:${caseFilters.decisionQuality}`);
  }
  if (pipelineFilters.outcomeType && pipelineFilters.outcomeType !== "all") {
    parts.push(`Outcome:${pipelineFilters.outcomeType}`);
  }
  if (pipelineFilters.executedMode && pipelineFilters.executedMode !== "all") {
    parts.push(`ExecMode:${pipelineFilters.executedMode}`);
  }
  if (
    pipelineFilters.pipelineComponent &&
    pipelineFilters.pipelineComponent !== "all"
  ) {
    parts.push(`Component:${pipelineFilters.pipelineComponent}`);
  }
  return parts.join(" · ");
}

function isEvaluableCase(row: InsightsCaseRow): boolean {
  const resolvedEntry =
    row.family === "A" || row.family === "C" || row.family === "D";
  const resolvedNoEntry =
    row.family === "B" &&
    (row.noEntryDiagnosis === "GOOD_FILTER" ||
      row.noEntryDiagnosis === "OVER_OPTIMIZATION");
  return resolvedEntry || resolvedNoEntry;
}

function countBy(
  rows: InsightsCaseRow[],
  pick: (r: InsightsCaseRow) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = pick(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function formatCountMap(map: Record<string, number>): string {
  const keys = Object.keys(map).sort();
  if (keys.length === 0) return "(none)";
  return keys.map((k) => `${k}=${map[k]}`).join(" · ");
}

function findLo(
  plan: TradePlan | undefined,
  los: LearningOutcome[],
  trades: Trade[]
): LearningOutcome | undefined {
  if (!plan) return undefined;
  return (
    resolveLearningOutcomeForPlan({
      plan,
      learningOutcomes: los,
      trades,
    }) ?? undefined
  );
}

function findObs(
  planId: string,
  lo: LearningOutcome | undefined,
  observations: ObservationRecord[]
): ObservationRecord | undefined {
  if (lo?.observationId) {
    const byId = observations.find(
      (o) => o.id.toUpperCase() === lo.observationId!.toUpperCase()
    );
    return byId;
  }
  const key = planId.toUpperCase();
  const matches = observations.filter(
    (o) => o.planId?.toUpperCase() === key && !o.tradeId
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function findMaf(
  planId: string,
  lo: LearningOutcome | undefined,
  experiments: MafExperiment[]
): MafExperiment | undefined {
  if (lo?.mafExperimentId) {
    const byLo = experiments.find(
      (e) => e.id.toUpperCase() === lo.mafExperimentId!.toUpperCase()
    );
    return byLo;
  }
  const key = planId.toUpperCase();
  const matches = experiments.filter(
    (e) => e.planId?.toUpperCase() === key && !e.tradeId
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function findPlan(planId: string, plans: TradePlan[]): TradePlan | undefined {
  const key = planId.toUpperCase();
  return plans.find((p) => p.id.toUpperCase() === key);
}

function diagnosisChip(row: InsightsCaseRow): string {
  if (row.caseDSubtype) return CASE_D_SUBTYPE_LABEL[row.caseDSubtype];
  if (row.family === "B" && row.noEntryDiagnosis) {
    return noEntryDiagnosisLabel(row.noEntryDiagnosis);
  }
  if (row.family === "INDETERMINATE") {
    return NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE;
  }
  return "—";
}

function buildFocusTrace(input: {
  focusPlanId: string;
  filteredRows: InsightsCaseRow[];
  allRows: InsightsCaseRow[];
  pipelineInput: PipelinePerformanceInput;
  playbookNames?: Map<string, string> | Record<string, string>;
}): InsightsSnapshotFocusTrace | null {
  const key = input.focusPlanId.trim().toUpperCase();
  const inFilter = input.filteredRows.find((r) => r.planId.toUpperCase() === key);
  const row =
    inFilter ?? input.allRows.find((r) => r.planId.toUpperCase() === key);
  if (!row) return null;

  const plan = findPlan(row.planId, input.pipelineInput.plans);
  const lo = findLo(
    plan,
    input.pipelineInput.learningOutcomes,
    input.pipelineInput.trades
  );
  const obs = findObs(row.planId, lo, input.pipelineInput.observations);
  const maf = findMaf(row.planId, lo, input.pipelineInput.mafExperiments);

  const drag = maf?.primaryDragComponent
    ? MAF_COMPONENT_LABELS[maf.primaryDragComponent] ?? maf.primaryDragComponent
    : row.mafAttribution?.primaryDragComponent
      ? MAF_COMPONENT_LABELS[row.mafAttribution.primaryDragComponent] ??
        row.mafAttribution.primaryDragComponent
      : null;

  const suggested = (() => {
    if (!maf) return null;
    const primary = maf.primaryDragComponent
      ? maf.attributions.find((a) => a.component === maf.primaryDragComponent)
      : undefined;
    const fromPrimary = primary?.suggestedImprovement?.trim();
    if (fromPrimary) return fromPrimary;
    const any = maf.attributions.find((a) => a.suggestedImprovement?.trim());
    return any?.suggestedImprovement?.trim() ?? null;
  })();

  return {
    planId: row.planId,
    inFilteredUniverse: Boolean(inFilter),
    ticker: row.ticker,
    playbookId: row.playbookId,
    playbookName: playbookNameOf(row.playbookId, input.playbookNames),
    family: caseFamilyLabel(row.family),
    caseDSubtype: row.caseDSubtype
      ? CASE_D_SUBTYPE_LABEL[row.caseDSubtype]
      : null,
    noEntryDiagnosis: row.noEntryDiagnosis
      ? noEntryDiagnosisLabel(row.noEntryDiagnosis)
      : null,
    equationId: row.equationId,
    decisionQuality: row.decisionQuality,
    reality: row.reality,
    executionQuality: row.executionQuality,
    t0Available: row.t0Available,
    t0RecordKind: row.t0RecordKind ?? null,
    evaluable: isEvaluableCase(row),
    loKind: row.loKind,
    realizedR: row.realizedR,
    counterfactualR: row.counterfactualR,
    learningOutcomeId: lo?.id ?? null,
    observationId: obs?.id ?? lo?.observationId ?? null,
    mafExperimentId: maf?.id ?? row.mafAttribution?.mafExperimentId ?? null,
    mafPrimaryDrag: drag,
    mafStatus: maf?.status ?? null,
    mafSource: row.mafAttribution?.source ?? (maf ? "accepted_maf" : null),
    suggestedImprovement: suggested,
    diagnosisReason: row.diagnosisReason,
    caseHref: row.caseHref,
    stockThesisId: row.stockThesisId,
    linkage: row.linkage
      ? {
          tradeId: row.linkage.tradeId,
          planThesis: row.linkage.planThesis,
          planPlaybook: row.linkage.planPlaybook,
          tradePlan: row.linkage.tradePlan,
        }
      : null,
    planGeometry: plan
      ? {
          plannedEntry: plan.plannedEntry ?? null,
          stopPrice: plan.stopPrice ?? null,
          targetPrice: plan.targetPrice ?? null,
          plannedRR: plan.plannedRR ?? null,
        }
      : null,
  };
}

/** Canonical model — tests assert parity against Pipeline builders. */
export function buildInsightsSnapshotModel(
  input: InsightsSnapshotBriefInput
): InsightsSnapshotModel {
  const pipelineFilters = input.pipelineFilters ?? {};
  const caseFilters: InsightsCaseSpineFilters = {
    from: input.caseFilters?.from ?? pipelineFilters.from,
    to: input.caseFilters?.to ?? pipelineFilters.to,
    ticker: input.caseFilters?.ticker ?? pipelineFilters.ticker,
    playbookId: input.caseFilters?.playbookId ?? pipelineFilters.playbookId,
    caseFamily: input.caseFilters?.caseFamily,
    noEntryDiagnosis: input.caseFilters?.noEntryDiagnosis,
    decisionQuality: input.caseFilters?.decisionQuality,
  };

  const caseView = buildInsightsCaseSpineView(input.caseSpine, caseFilters);
  const pipeline = computePipelinePerformance({
    ...input.pipelineInput,
    filters: pipelineFilters,
  });
  const playbookLearning = aggregatePlaybookDiagnosis(
    caseView.rows,
    input.playbookNames
  );

  let focus: InsightsSnapshotFocusTrace | null = null;
  let focusMissing = false;
  if (input.focusPlanId?.trim()) {
    focus = buildFocusTrace({
      focusPlanId: input.focusPlanId,
      filteredRows: caseView.rows,
      allRows: input.caseSpine,
      pipelineInput: input.pipelineInput,
      playbookNames: input.playbookNames,
    });
    focusMissing = focus == null;
  }

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scopeLabel: scopeLabelFromFilters(pipelineFilters, caseFilters),
    pipelineFilters,
    caseFilters,
    caseView,
    pipeline,
    playbookLearning,
    focus,
    focusMissing,
  };
}

function fmtR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}R`;
}

function fmtPct(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function playbookNameFromAggregate(
  playbookId: string | null,
  playbookLearning: PlaybookDiagnosisAggregate[]
): string {
  const hit = playbookLearning.find((p) => p.playbookId === playbookId);
  if (hit) return hit.playbookName;
  return playbookNameOf(playbookId);
}

function formatCaseRow(
  r: InsightsCaseRow,
  playbookLearning: PlaybookDiagnosisAggregate[]
): string[] {
  const pbName = playbookNameFromAggregate(r.playbookId, playbookLearning);
  const lifecycle = r.lifecycle ?? {
    status: isEvaluableCase(r) ? "COMPLETE" : "INCOMPLETE",
    blockingLabels: r.t0Available ? [] : ["T0"],
  };
  return [
    `${r.ticker} · ${r.planId} · ${lifecycle.status}`,
    `${caseFamilyLabel(r.family)}`,
    lifecycle.blockingLabels.length > 0
      ? `Missing: ${lifecycle.blockingLabels.join(", ")}`
      : `Diagnosis: ${diagnosisChip(r)}`,
    `Outcome: ${r.outcomeLabel ?? r.loKind ?? "—"}`,
    `Realized: ${fmtR(r.realizedR)}`,
    `Counterfactual: ${fmtR(r.counterfactualR)}`,
    r.mafAttribution
      ? `MAF: ${r.mafAttribution.mafExperimentId} · ${
          r.mafAttribution.primaryDragComponent
            ? MAF_COMPONENT_LABELS[r.mafAttribution.primaryDragComponent] ??
              r.mafAttribution.primaryDragComponent
            : "—"
        }`
      : "MAF: none",
    `Decision Quality: ${r.decisionQuality}`,
    `Reality: ${r.reality}`,
    `Playbook: ${pbName}`,
    r.stockThesisId ? `Stock File: ${r.stockThesisId}` : null,
  ].filter(Boolean) as string[];
}

function formatAttentionGroups(review: Array<{ row: InsightsCaseRow; score: number }>): string[] {
  const missingT0 = review.filter(({ row }) => row.lifecycle?.blockingLabels.includes("T0"));
  const historical = review.filter(({ row }) => row.caseOrigin === "historical_trade");
  const other = review.filter(
    ({ row }) =>
      !(row.lifecycle?.blockingLabels.includes("T0")) && row.caseOrigin !== "historical_trade"
  );
  const lines: string[] = [];
  if (missingT0.length > 0) {
    lines.push("Missing T0:");
    lines.push(
      "Common implication: without usable T0, MXT cannot distinguish Good Filter, Over-optimization, or some Case D no-entry paths."
    );
    for (const { row } of missingT0) {
      const extras = row.lifecycle.blockingLabels.filter((label) => label !== "T0");
      lines.push(
        `- ${row.planId}${extras.length ? ` · also missing ${extras.join(" + ")}` : ""}`
      );
    }
    lines.push("");
  }
  if (historical.length > 0) {
    lines.push("Insufficient historical evidence:");
    for (const { row } of historical) {
      lines.push(`- ${row.caseId.replace(/^HIST:/, "")}`);
    }
    lines.push("");
  }
  if (other.length > 0) {
    lines.push("Other review:");
    for (const { row } of other) {
      lines.push(`- ${row.planId} · ${diagnosisChip(row)}`);
    }
  }
  return lines.length === 0 ? ["none"] : lines;
}

export function formatInsightsSnapshotBrief(model: InsightsSnapshotModel): string {
  const lines: string[] = [];
  const { caseView, pipeline, playbookLearning } = model;
  const agg = caseView.aggregate;
  const entryParticipation = caseView.rows.filter((r) => r.participation === "entry").length;
  const noEntryParticipation = caseView.rows.filter((r) => r.participation === "no_entry").length;
  const review = pickCasesNeedingReview(caseView.rows, 12);

  lines.push(`SCOPE: ${model.scopeLabel}`);
  lines.push(`GENERATED: ${model.generatedAt}`);
  lines.push("");

  lines.push("--- 1. UNIVERSE ---");
  lines.push(`Cases: ${caseView.cards.totalCases.numerator}`);
  lines.push(`Complete T0: ${caseView.rows.filter((r) => r.t0Available).length}`);
  lines.push(`Missing T0: ${caseView.rows.filter((r) => !r.t0Available).length}`);
  lines.push("");
  lines.push("Participation:");
  lines.push(`Entry: ${entryParticipation}`);
  lines.push(`No Entry: ${noEntryParticipation}`);
  lines.push("");
  lines.push("Case Accounting:");
  lines.push(`A: ${caseView.cards.familyA.numerator}`);
  lines.push(`B: ${caseView.cards.familyB.numerator}`);
  lines.push(`C: ${caseView.cards.familyC.numerator}`);
  lines.push(`D: ${caseView.cards.familyD.numerator}`);
  lines.push(`Insufficient: ${caseView.cards.indeterminate.numerator}`);
  lines.push("");
  lines.push("Condition:");
  lines.push(`${agg.currentCondition.code}`);
  lines.push(agg.currentCondition.statement);
  lines.push("");
  lines.push("Decision Quality:");
  lines.push(formatCountMap(countBy(caseView.rows, (r) => r.decisionQuality)));
  lines.push("");
  lines.push("Reality:");
  lines.push(formatCountMap(countBy(caseView.rows, (r) => r.reality)));
  lines.push("");

  lines.push("--- 2. CASES ---");
  if (model.focusMissing) {
    lines.push("BLOCKED: current Insights context references a focus case that is not present in the canonical Case universe.");
  } else if (!model.focus) {
    lines.push("No individual Case is selected in the current Insights context.");
  } else {
    const focusRow =
      caseView.rows.find((row) => row.planId.toUpperCase() === model.focus!.planId.toUpperCase()) ??
      null;
    if (!focusRow) {
      lines.push(`Focused Case ${model.focus.planId} is outside the current filter context.`);
    } else {
      lines.push(...formatCaseRow(focusRow, playbookLearning));
    }
  }
  lines.push("");

  lines.push("--- 3. LEARNING ---");
  lines.push(
    "NOTE: accepted MAF aggregates — independent of Case family. Audit Case quality before interpreting."
  );
  lines.push("MAF attribution:");
  for (const c of pipeline.componentDistribution) {
    if (c.evaluationCount === 0 && c.failureCount === 0 && c.dragCount === 0) continue;
    lines.push(
      `${c.label}: evaluated ${c.evaluationCount} · weak/fail ${c.failureCount}${c.dragCount ? ` · primary drag ${c.dragCount}` : ""}`
    );
  }
  if (pipeline.componentDistribution.every((c) => c.evaluationCount === 0 && c.failureCount === 0 && c.dragCount === 0)) {
    lines.push("none");
  }
  lines.push("");
  lines.push("Repeated primary drag:");
  if (pipeline.repeatedDragComponents.length === 0) {
    lines.push("none");
  } else {
    for (const c of pipeline.repeatedDragComponents) {
      lines.push(`${c.label}: ${c.count}`);
    }
  }
  lines.push("");
  lines.push("Playbooks:");
  if (playbookLearning.length === 0) {
    lines.push("none");
  } else {
    for (const p of playbookLearning) {
      lines.push(
        [
          p.playbookName,
          p.playbookId ? `(${p.playbookId})` : "(none)",
          `cases=${p.cases}`,
          `A=${p.familyA}`,
          `B=${p.familyB}`,
          `C=${p.familyC}`,
          `D=${p.familyD}`,
          `Insufficient=${p.indeterminate}`,
          `GoodFilter=${p.goodFilter}`,
          `OverOpt=${p.overOptimization} (${fmtPct(p.rates.overOptimization)})`,
        ].join(" | ")
      );
    }
  }
  lines.push("");
  lines.push("Path Accounting:");
  for (const bucket of PIPELINE_OUTCOME_BUCKETS) {
    lines.push(`${PIPELINE_OUTCOME_BUCKET_LABELS[bucket]}: ${pipeline.summaryCounts[bucket]}`);
  }
  lines.push(`Realized: ${fmtR(pipeline.realized.realizedRSum)}`);
  lines.push(
    `Counterfactual evaluated: ${pipeline.counterfactual.scoutEvaluatedCount} Cases · ${fmtR(pipeline.counterfactual.counterfactualRSum)}`
  );
  lines.push("Counterfactual R is not portfolio P/L.");
  lines.push("");

  lines.push("--- 4. ATTENTION ---");
  lines.push(...formatAttentionGroups(review));
  return wrapSnapshotText("Insights Snapshot", lines.join("\n"));
}

/** Convenience: model + format. */
export function buildInsightsSnapshotBrief(
  input: InsightsSnapshotBriefInput
): string {
  return formatInsightsSnapshotBrief(buildInsightsSnapshotModel(input));
}
