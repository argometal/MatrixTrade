/**
 * Insights → Pipeline Snapshot (MXT 029).
 * AI-readable product context — not a UI dump, not a parallel metrics engine.
 * Reuses buildInsightsCaseSpineView + computePipelinePerformance + aggregatePlaybookDiagnosis.
 */

import {
  CASE_D_SUBTYPE_LABEL,
  CASE_FAMILY_LABEL,
  NO_ENTRY_DIAGNOSIS_LABEL,
  caseFamilyLabel,
  noEntryDiagnosisLabel,
} from "./insights-case-labels";
import {
  buildInsightsCaseSpineView,
  pickCasesNeedingReview,
  type InsightsCaseSpineFilters,
} from "./insights-case-spine-view";
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
  planId: string,
  los: LearningOutcome[]
): LearningOutcome | undefined {
  const key = planId.toUpperCase();
  return los.find((lo) => lo.planId?.toUpperCase() === key);
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
    if (byId) return byId;
  }
  const key = planId.toUpperCase();
  return observations.find((o) => o.planId?.toUpperCase() === key);
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
    if (byLo) return byLo;
  }
  const key = planId.toUpperCase();
  return experiments.find(
    (e) => e.planId?.toUpperCase() === key && !e.tradeId
  );
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

  const lo = findLo(row.planId, input.pipelineInput.learningOutcomes);
  const obs = findObs(row.planId, lo, input.pipelineInput.observations);
  const maf = findMaf(row.planId, lo, input.pipelineInput.mafExperiments);
  const plan = findPlan(row.planId, input.pipelineInput.plans);

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
): string {
  const pbName = playbookNameFromAggregate(r.playbookId, playbookLearning);
  const evalFlag = isEvaluableCase(r) ? "evaluable" : "insufficient/indet";
  return [
    `${r.ticker} · ${r.planId} · ${r.playbookId ?? "—"} · ${pbName}`,
    caseFamilyLabel(r.family),
    `dx=${diagnosisChip(r)}`,
    `eq=${r.equationId}`,
    `DQ=${r.decisionQuality}`,
    `EQ=${r.executionQuality}`,
    `Reality=${r.reality}`,
    `T0=${r.t0Available ? "yes" : "missing"}`,
    `LO=${r.loKind ?? "—"}`,
    `realizedR=${fmtR(r.realizedR)}`,
    `cfR=${fmtR(r.counterfactualR)}`,
    evalFlag,
    r.mafAttribution
      ? `MAF=${r.mafAttribution.mafExperimentId}/${r.mafAttribution.primaryDragComponent ?? "—"}`
      : "MAF=—",
    r.stockThesisId ? `ST=${r.stockThesisId}` : "ST=—",
    r.caseHref ? `href=${r.caseHref}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function formatInsightsSnapshotBrief(model: InsightsSnapshotModel): string {
  const lines: string[] = [];
  const { caseView, pipeline, playbookLearning, focus } = model;
  const agg = caseView.aggregate;
  const entryParticipation = caseView.rows.filter(
    (r) => r.participation === "entry"
  ).length;
  const noEntryParticipation = caseView.rows.filter(
    (r) => r.participation === "no_entry"
  ).length;
  const review = pickCasesNeedingReview(caseView.rows, 12);

  lines.push(`SCOPE: ${model.scopeLabel}`);
  lines.push(`GENERATED: ${model.generatedAt}`);
  lines.push(
    "SOURCE: buildInsightsCaseSpineView + computePipelinePerformance + aggregatePlaybookDiagnosis"
  );
  lines.push(
    "PURPOSE: AI context for Insights → Pipeline (semantics + IDs) — not a screenshot transcript."
  );
  lines.push("");
  lines.push("--- CANONICAL DISTINCTIONS (do not collapse) ---");
  lines.push(
    "Case classification ≠ MAF attribution. Accepted MAF may exist while Case remains Insufficient Evidence / Missing T0."
  );
  lines.push(
    "Realized R/P&L ≠ Counterfactual / Planned R. CF R is never portfolio P/L."
  );
  lines.push(
    "Missing T0 ≠ permission to reconstruct or inherit another Plan's T0 (even under shared Stock File). Controlled repair: Apply thesis-t0-repair."
  );
  lines.push(
    "Known Outcome ≠ Case automatically evaluable. Plans under one Stock File stay independent Cases."
  );
  lines.push("");

  lines.push("--- 1. DECISION UNIVERSE ---");
  lines.push(`activeFilters: ${model.scopeLabel}`);
  lines.push(`totalCases: ${caseView.cards.totalCases.numerator}`);
  lines.push(
    `missingT0: ${caseView.rows.filter((r) => !r.t0Available).length}`
  );
  lines.push(
    `withT0: ${caseView.rows.filter((r) => r.t0Available).length}`
  );
  lines.push(
    `participation: entry=${entryParticipation} no_entry=${noEntryParticipation} (diagnosis entryUniverse=${agg.entryUniverse} noEntryUniverse=${agg.noEntryUniverse})`
  );
  lines.push(
    `condition: ${agg.currentCondition.code} — ${agg.currentCondition.statement}`
  );
  lines.push("");

  lines.push("--- 2. CASE ACCOUNTING ---");
  lines.push(
    `A=${caseView.cards.familyA.numerator} (${fmtPct(caseView.cards.familyA.rate)}) · B=${caseView.cards.familyB.numerator} (${fmtPct(caseView.cards.familyB.rate)}) · C=${caseView.cards.familyC.numerator} (${fmtPct(caseView.cards.familyC.rate)}) · D=${caseView.cards.familyD.numerator} (${fmtPct(caseView.cards.familyD.rate)}) · Insufficient=${caseView.cards.indeterminate.numerator} (${fmtPct(caseView.cards.indeterminate.rate)})`
  );
  lines.push(
    `labels: A=${CASE_FAMILY_LABEL.A} | B=${CASE_FAMILY_LABEL.B} | C=${CASE_FAMILY_LABEL.C} | D=${CASE_FAMILY_LABEL.D} | ?=${CASE_FAMILY_LABEL.INDETERMINATE}`
  );
  lines.push("");

  lines.push("--- 3. NO-ENTRY FILTER QUALITY ---");
  lines.push(
    `denominator: family B in filter = ${caseView.cards.familyB.numerator}`
  );
  lines.push(
    `GoodFilter=${caseView.cards.goodFilter.numerator} (${fmtPct(caseView.cards.goodFilter.rate)}) · OverOpt=${caseView.cards.overOptimization.numerator} (${fmtPct(caseView.cards.overOptimization.rate)}) · Insufficient=${caseView.cards.noEntryIndeterminate.numerator} (${fmtPct(caseView.cards.noEntryIndeterminate.rate)})`
  );
  lines.push(
    `labels: ${NO_ENTRY_DIAGNOSIS_LABEL.GOOD_FILTER} | ${NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION} | ${NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE}`
  );
  lines.push("");

  lines.push("--- 4. DECISION / EXECUTION / REALITY ---");
  lines.push(
    `decisionQuality: ${formatCountMap(countBy(caseView.rows, (r) => r.decisionQuality))}`
  );
  lines.push(
    `executionQuality: ${formatCountMap(countBy(caseView.rows, (r) => r.executionQuality))}`
  );
  lines.push(
    `realityRelationship: ${formatCountMap(countBy(caseView.rows, (r) => r.reality))}`
  );
  lines.push("");

  lines.push("--- 5. CASES NEEDING REVIEW ---");
  lines.push(
    "Priority heuristic mirrors Pipeline UI (Missing T0, Over-Opt, D, DQ/EQ gaps, unlinkage). Max 12."
  );
  if (review.length === 0) {
    lines.push("(none)");
  } else {
    for (const { row, score } of review) {
      lines.push(
        [
          `score=${score}`,
          `${row.ticker} · ${row.planId}`,
          caseFamilyLabel(row.family),
          `dx=${diagnosisChip(row)}`,
          `eq=${row.equationId}`,
          `reason=${row.diagnosisReason}`,
          `T0=${row.t0Available ? "yes" : "missing"}`,
          `realizedR=${fmtR(row.realizedR)}`,
          `cfR=${fmtR(row.counterfactualR)}`,
          row.linkage
            ? `link thesis=${row.linkage.planThesis} playbook=${row.linkage.planPlaybook} trade=${row.linkage.tradePlan}`
            : "link=—",
          `href=${row.caseHref}`,
        ].join(" | ")
      );
    }
  }
  lines.push("");

  lines.push("--- 6. COMPONENT ATTRIBUTION / MAF ---");
  lines.push(
    "NOTE: accepted MAF aggregates — independent of Case family. Audit Case quality before interpreting."
  );
  for (const c of pipeline.componentDistribution) {
    lines.push(
      `${c.label}: evaluated=${c.evaluationCount} weakOrFail=${c.failureCount} primaryDrag=${c.dragCount}`
    );
  }
  if (pipeline.repeatedDragComponents.length === 0) {
    lines.push("repeatedPrimaryDrag: (none)");
  } else {
    lines.push(
      `repeatedPrimaryDrag: ${pipeline.repeatedDragComponents
        .map((c) => `${c.label}=${c.count}`)
        .join(" · ")}`
    );
  }
  lines.push("");

  lines.push("--- 7. CASE DRILL-DOWN (filtered Case spine) ---");
  lines.push(
    "Each row keeps Family · Diagnosis · DQ · EQ · Reality · LO · Realized R · CF/Planned R · MAF separate."
  );
  if (caseView.rows.length === 0) {
    lines.push("(none)");
  } else {
    for (const r of caseView.rows) {
      lines.push(formatCaseRow(r, playbookLearning));
    }
  }
  lines.push("");

  lines.push("--- 8. PLAYBOOK LEARNING ---");
  if (playbookLearning.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of playbookLearning) {
      lines.push(
        [
          p.playbookName,
          `(${p.playbookId ?? "—"})`,
          `cases=${p.cases}`,
          `evaluable=${p.evaluableCases}`,
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

  lines.push("--- 9. LEARNING OUTCOME / PATH ACCOUNTING ---");
  lines.push(
    "Ledger: LO / plan-outcome rows. Realized R never includes CF R."
  );
  for (const bucket of PIPELINE_OUTCOME_BUCKETS) {
    lines.push(
      `${PIPELINE_OUTCOME_BUCKET_LABELS[bucket]}: ${pipeline.summaryCounts[bucket]}`
    );
  }
  lines.push(
    `realized: trades=${pipeline.realized.tradeCount} RSum=${fmtR(pipeline.realized.realizedRSum)} PnLSum=${pipeline.realized.realizedPnLSum}`
  );
  lines.push(
    `counterfactual: scoutEvaluated=${pipeline.counterfactual.scoutEvaluatedCount} UPL=${pipeline.counterfactual.unexecutedPlanLossCount} cfRSum=${fmtR(pipeline.counterfactual.counterfactualRSum)} (NOT portfolio P/L)`
  );
  if (pipeline.rows.length === 0) {
    lines.push("pathRows: (none)");
  } else {
    for (const row of pipeline.rows) {
      lines.push(
        [
          `${row.ticker} · ${row.label}`,
          `outcome=${PIPELINE_OUTCOME_BUCKET_LABELS[row.outcomeType]}`,
          row.primaryDragComponent
            ? `drag=${MAF_COMPONENT_LABELS[row.primaryDragComponent] ?? row.primaryDragComponent}`
            : "drag=—",
          `realizedR=${fmtR(row.realizedR)}`,
          `cfR=${fmtR(row.counterfactualR)}`,
          row.planId ? `plan=${row.planId}` : null,
          row.tradeId ? `trade=${row.tradeId}` : null,
        ]
          .filter(Boolean)
          .join(" | ")
      );
    }
  }
  lines.push("");

  lines.push("--- 10. FOCUS CASE ---");
  if (model.focusMissing) {
    lines.push("focusPlanId requested but not found in Case spine.");
  } else if (!focus) {
    lines.push("(none — set Focus plan on Pipeline, or pass focusPlanId)");
  } else {
    lines.push(`planId: ${focus.planId}`);
    lines.push(`inFilteredUniverse: ${focus.inFilteredUniverse}`);
    lines.push(`ticker: ${focus.ticker}`);
    lines.push(`stockThesisId: ${focus.stockThesisId ?? "—"}`);
    lines.push(
      `playbook (Case/Plan, not Stock): ${focus.playbookName} (${focus.playbookId ?? "—"})`
    );
    lines.push(`family: ${focus.family}`);
    lines.push(`caseDSubtype: ${focus.caseDSubtype ?? "—"}`);
    lines.push(`noEntryDiagnosis: ${focus.noEntryDiagnosis ?? "—"}`);
    lines.push(`equationId: ${focus.equationId}`);
    lines.push(`decisionQuality: ${focus.decisionQuality}`);
    lines.push(`executionQuality: ${focus.executionQuality}`);
    lines.push(`realityRelationship: ${focus.reality}`);
    lines.push(`t0Available: ${focus.t0Available}`);
    if (focus.t0RecordKind) {
      lines.push(`t0RecordKind: ${focus.t0RecordKind}`);
    }
    lines.push(`evaluable: ${focus.evaluable}`);
    if (focus.planGeometry) {
      lines.push(
        `geometry@plan: entry=${focus.planGeometry.plannedEntry ?? "—"} stop=${focus.planGeometry.stopPrice ?? "—"} target=${focus.planGeometry.targetPrice ?? "—"} RR=${focus.planGeometry.plannedRR ?? "—"}`
      );
    }
    lines.push(`LO: ${focus.learningOutcomeId ?? "—"} (${focus.loKind ?? "—"})`);
    lines.push(`OBS: ${focus.observationId ?? "—"}`);
    lines.push(`realizedR: ${fmtR(focus.realizedR)} (portfolio ledger only when filled)`);
    lines.push(
      `counterfactualR: ${fmtR(focus.counterfactualR)} (planned path — NOT portfolio P/L)`
    );
    lines.push(
      `MAF: ${focus.mafExperimentId ?? "—"} status=${focus.mafStatus ?? "—"} source=${focus.mafSource ?? "—"} drag=${focus.mafPrimaryDrag ?? "—"}`
    );
    lines.push(
      `suggestedImprovement: ${focus.suggestedImprovement ?? "(empty)"}`
    );
    if (focus.linkage) {
      lines.push(
        `linkage: tradeId=${focus.linkage.tradeId ?? "—"} thesis=${focus.linkage.planThesis} playbook=${focus.linkage.planPlaybook} tradePlan=${focus.linkage.tradePlan}`
      );
    }
    lines.push(`diagnosisReason: ${focus.diagnosisReason}`);
    lines.push(`caseHref: ${focus.caseHref}`);
  }
  lines.push("");

  lines.push("--- 11. LABEL KEY ---");
  lines.push(`D: ${CASE_FAMILY_LABEL.D}`);
  lines.push(`Over-Opt: ${NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION}`);

  return wrapSnapshotText("Insights Pipeline Snapshot", lines.join("\n"));
}

/** Convenience: model + format. */
export function buildInsightsSnapshotBrief(
  input: InsightsSnapshotBriefInput
): string {
  return formatInsightsSnapshotBrief(buildInsightsSnapshotModel(input));
}
