"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FocusedCaseReport } from "@/lib/focused-case-report";
import {
  PIPELINE_OUTCOME_BUCKETS,
  PIPELINE_OUTCOME_BUCKET_LABELS,
  PIPELINE_PERFORMANCE_COMPONENTS,
  PIPELINE_PERFORMANCE_COMPONENT_LABELS,
  computePipelinePerformance,
  type PipelineExecutedMode,
  type PipelineOutcomeBucket,
  type PipelinePerformanceInput,
  type PipelinePerformanceFilters,
} from "@/lib/insights-pipeline-performance";
import { MAF_COMPONENT_LABELS, type MafComponentId } from "@/lib/maf-types";
import {
  buildInsightsCaseSpineView,
  pickCasesNeedingReview,
  type InsightsCaseFamily,
} from "@/lib/insights-case-spine-view";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";
import type { InsightsCaseCardMetric } from "@/lib/insights-case-spine-types";
import type { DecisionQuality } from "@/lib/case-evaluation-types";
import type { NoEntryDiagnosisClass } from "@/lib/case-diagnosis-types";
import {
  CASE_FAMILY_FILTER_OPTIONS,
  CASE_FAMILY_LABEL,
  CASE_D_SUBTYPE_LABEL,
  NO_ENTRY_DIAGNOSIS_FILTER_OPTIONS,
  NO_ENTRY_DIAGNOSIS_LABEL,
  caseFamilyLabel,
  noEntryDiagnosisLabel,
} from "@/lib/insights-case-labels";
import { aggregatePlaybookDiagnosis } from "@/lib/insights-playbook-diagnosis";
import { MAF_SOURCE_HELP } from "@/lib/insights-maf-join";
import {
  countAcceptedMafJoined,
  formatAcceptedMafDrillCell,
  formatAcceptedMafUi,
  formatHistoricalReconstructionUi,
} from "@/lib/insights-maf-ui";
import { PreviewImprovementPath } from "@/app/components/insights-preview/PreviewImprovementPath";
import type { ImprovementHypothesis } from "@/lib/improvement-hypothesis-types";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { buildInsightsSnapshotBrief } from "@/lib/insights-snapshot";
import { mxtPath } from "@/lib/mxt-paths";
import { composeUnifiedSnapshot } from "@/lib/unified-snapshot-presentation";
import { buildFocusCaseOption } from "@/lib/focus-case-option";
import {
  computeOpportunityParticipationComparison,
  type OpportunityParticipationComparisonRow,
} from "@/lib/opportunity-participation-comparison";
import { computeOpportunitySequenceComparison } from "@/lib/opportunity-sequence-comparison";
import type { MarketRealityCaseWindow } from "@/lib/market-reality-types";

function formatR(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPct(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function tone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-300";
}

function valueTone(label: string, value: string | null | undefined): string {
  if (!value) return "text-zinc-300";
  if (
    label.toLowerCase().includes("consistency") &&
    value.toUpperCase() === "WRONG"
  ) {
    return "text-amber-300";
  }
  if (value.toLowerCase() === "missing") return "text-amber-300";
  return "text-zinc-100";
}

function formatMaybeR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatR(value);
}

function formatMaybeNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(digits)).toString();
}

function formatMaybeDurationMs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  const totalMinutes = Math.round(value / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function FieldGrid({
  items,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  items: Array<{ label: string; value: string; note?: string | null }>;
  columns?: string;
}) {
  return (
    <dl className={`grid gap-3 ${columns}`}>
      {items.map((item) => (
        <div
          key={`${item.label}:${item.value}:${item.note ?? ""}`}
          className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2"
        >
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
            {item.label}
          </dt>
          <dd className={`mt-1 text-sm ${valueTone(item.label, item.value)}`}>
            {item.value}
          </dd>
          {item.note ? (
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              {item.note}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

function FocusedCaseReportPanel({
  report,
  loading = false,
  error = null,
}: {
  report: FocusedCaseReport | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm text-zinc-500">Loading Case…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4">
        <p className="text-sm text-rose-200">{error}</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm text-zinc-500">Select a Case to load it here.</p>
      </section>
    );
  }

  const timelineItems = report.timeline.items.map((item) => ({
    label: item.label,
    value: item.value ?? "—",
    note: item.note ?? null,
  }));
  const frozenPlanItems = [
    { label: "Entry", value: String(report.frozenPlan.plannedEntry ?? "—") },
    { label: "Original entry", value: String(report.frozenPlan.originalEntry ?? "—") },
    { label: "Stop", value: String(report.frozenPlan.stopPrice ?? "—") },
    { label: "Target", value: String(report.frozenPlan.targetPrice ?? "—") },
    { label: "Support", value: String(report.frozenPlan.supportLevel ?? "—") },
    {
      label: "Recorded R:R",
      value:
        report.frozenPlan.recordedRR == null
          ? "—"
          : report.frozenPlan.recordedRR.toFixed(4),
    },
    {
      label: "Geometric R:R",
      value:
        report.frozenPlan.geometricRR == null
          ? "—"
          : report.frozenPlan.geometricRR.toFixed(4),
    },
    {
      label: "RR consistency",
      value: report.frozenPlan.rrConsistency,
      note:
        report.frozenPlan.rrDifference == null
          ? null
          : `Difference ${report.frozenPlan.rrDifference}`,
    },
  ];
  const realityItems = [
    { label: "Entry reached", value: String(report.reality.entryReached ?? "—") },
    { label: "Stop reached", value: String(report.reality.stopReached ?? "—") },
    { label: "Target reached", value: String(report.reality.targetReached ?? "—") },
    { label: "Event order", value: report.reality.eventOrder ?? "—" },
    { label: "Reality relationship", value: report.reality.relationship ?? "—" },
  ];
  const executionItems = [
    { label: "Trade linked", value: report.execution.tradeLinked ? "true" : "false" },
    { label: "Trade", value: report.execution.tradeId ?? "—" },
    {
      label: "Execution occurred",
      value: report.execution.executionOccurred ? "true" : "false",
    },
    { label: "No-execution reason", value: report.execution.nonExecutionReason ?? "—" },
    { label: "Plan status", value: report.execution.planStatus ?? "—" },
  ];
  const accountingItems = [
    { label: "Realized R", value: formatMaybeR(report.accounting.realizedR) },
    {
      label: "Counterfactual R",
      value: formatMaybeR(report.accounting.counterfactualR),
      note: "Planned path only. Never portfolio P/L.",
    },
    {
      label: "Realized P/L",
      value:
        report.accounting.realizedPnL == null
          ? "—"
          : formatUsd(report.accounting.realizedPnL),
    },
  ];
  const caseItems = [
    { label: "Family", value: report.caseClassification.family ?? "—" },
    { label: "Subtype", value: report.caseClassification.subtype ?? "—" },
    { label: "Diagnosis", value: report.caseClassification.diagnosis ?? "—" },
    { label: "Evaluation code", value: report.caseClassification.evaluationCode ?? "—" },
    { label: "Decision quality", value: report.caseClassification.decisionQuality ?? "—" },
    { label: "Execution quality", value: report.caseClassification.executionQuality ?? "—" },
    {
      label: "Reality relationship",
      value: report.caseClassification.realityRelationship ?? "—",
    },
  ];
  const integrityItems = [
    { label: "T0 provenance", value: report.integrity.t0Provenance ?? "—" },
    {
      label: "Plan-backed",
      value: report.integrity.missingPlan ? "false" : "true",
    },
    { label: "RR consistency", value: report.integrity.rrConsistency },
  ];
  const learningItems = [
    {
      label: "Learning Outcome",
      value: report.learning.learningOutcomeId ?? "—",
      note: report.learning.learningOutcomeKind ?? null,
    },
    {
      label: "Observation",
      value: report.learning.observationId ?? "—",
      note: report.learning.observationKind ?? null,
    },
    {
      label: "MAF",
      value: report.learning.mafId ?? "—",
      note:
        [report.learning.mafStatus, report.learning.mafSource]
          .filter(Boolean)
          .join(" · ") || null,
    },
    {
      label: "Primary drag",
      value: report.learning.mafPrimaryDrag ?? "—",
    },
  ];
  const improvementItems = [
    { label: "Hypothesis", value: report.improvement.hypothesisId ?? "—" },
    { label: "Target component", value: report.improvement.targetComponent ?? "—" },
    { label: "Status", value: report.improvement.status ?? "—" },
    {
      label: "Evidence count",
      value:
        report.improvement.evidenceCount == null
          ? "—"
          : String(report.improvement.evidenceCount),
    },
    { label: "Verdict", value: report.improvement.verdict ?? "—" },
  ];
  const opportunityItems = [
    {
      label: "Planned risk",
      value: formatMaybeNumber(report.opportunityConsumption.plannedRiskPrice),
      note:
        report.opportunityConsumption.plannedRiskPrice == null
          ? null
          : "Original entry minus stop.",
    },
    {
      label: "Favorable displacement",
      value: formatMaybeNumber(report.opportunityConsumption.favorableDisplacementPrice),
      note:
        report.opportunityConsumption.favorableDisplacementR == null
          ? null
          : `${formatMaybeR(report.opportunityConsumption.favorableDisplacementR)} from original-plan risk units without participation`,
    },
    {
      label: "Peak price",
      value: formatMaybeNumber(report.opportunityConsumption.maxFavorablePrice),
      note: report.opportunityConsumption.maxFavorableAt,
    },
    {
      label: "Pullback after peak",
      value: formatMaybeNumber(report.opportunityConsumption.subsequentPullbackPrice),
      note:
        report.opportunityConsumption.subsequentPullbackR == null
          ? report.opportunityConsumption.pullbackLowAfterPeakAt
          : `${formatMaybeR(report.opportunityConsumption.subsequentPullbackR)} · low ${formatMaybeNumber(report.opportunityConsumption.pullbackLowAfterPeak)} @ ${report.opportunityConsumption.pullbackLowAfterPeakAt ?? "—"}`,
    },
    {
      label: "Retested original entry",
      value:
        report.opportunityConsumption.retestedOriginalEntryAfterPeak == null
          ? "—"
          : report.opportunityConsumption.retestedOriginalEntryAfterPeak
            ? "yes"
            : "no",
    },
    {
      label: "Restored R:R on pullback",
      value: formatMaybeR(report.opportunityConsumption.restoredRRAtDeepestPullback),
      note:
        report.opportunityConsumption.restoredOriginalAsymmetryAfterPeak == null
          ? null
          : report.opportunityConsumption.restoredOriginalAsymmetryAfterPeak
            ? "Recovered to original planned asymmetry or better."
            : "Did not recover the original planned asymmetry.",
    },
    {
      label: "Late-entry geometry",
      value: report.opportunityConsumption.lateEntryGeometryAvailable ? "available" : "unavailable",
      note: report.opportunityConsumption.lateEntryGeometryReason,
    },
  ];

  return (
    <section
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
      data-focused-case-report={report.planId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-zinc-100">
            {report.identity.ticker} · {report.planId} · {report.lifecycle.status}
          </p>
          {report.lifecycle.blockingLabels.length ? (
            <p className="mt-1 text-sm text-amber-300">
              Required information missing: {report.lifecycle.blockingLabels.join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Required information is present for analysis.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={report.caseHref}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            Open Case Review
          </Link>
          <Link
            href={mxtPath(`/stats?tab=pipeline&case=${encodeURIComponent(report.planId)}`)}
            className="rounded-lg border border-violet-700/60 px-3 py-1.5 text-violet-300 hover:border-violet-500"
          >
            Stable link
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Case
          </h3>
          <FieldGrid
            items={[
              { label: "Stock File", value: report.identity.stockThesisId ?? "—" },
              {
                label: "Playbook",
                value: report.identity.playbookName ?? report.identity.playbookId ?? "—",
                note: report.identity.playbookId ?? null,
              },
              {
                label: "Decision",
                value: report.identity.decisionVerdict ?? "—",
                note: report.identity.decisionId ?? null,
              },
            ]}
          />
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Timeline
          </h3>
          <FieldGrid items={timelineItems} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Frozen Plan
            </h3>
            {report.frozenPlan.available ? (
              <FieldGrid items={frozenPlanItems} columns="sm:grid-cols-2" />
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No plan-backed frozen geometry exists for this Case.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Reality
            </h3>
            <FieldGrid
              items={realityItems}
              columns="sm:grid-cols-2"
            />
            {report.reality.evidence ? (
              <p className="mt-2 text-[11px] text-zinc-500">
                Evidence: {report.reality.evidence}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Execution
            </h3>
            <FieldGrid items={executionItems} columns="sm:grid-cols-2" />
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Accounting
            </h3>
            <FieldGrid items={accountingItems} columns="sm:grid-cols-2" />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Deterministic Case
            </h3>
            <FieldGrid items={caseItems} columns="sm:grid-cols-2" />
            {report.caseClassification.diagnosisReason ? (
              <p className="mt-2 text-[11px] text-zinc-500">
                Reason: {report.caseClassification.diagnosisReason}
              </p>
            ) : null}
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Integrity
            </h3>
            <FieldGrid items={integrityItems} columns="sm:grid-cols-2" />
            {report.integrity.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] text-amber-300">
                {report.integrity.warnings.map((warning) => (
                  <li key={warning}>Warning: {warning}</li>
                ))}
              </ul>
            ) : null}
            {report.integrity.unresolved.filter((warning) => {
              const normalized = warning.toLowerCase();
              return !normalized.includes("no t0 freeze") && !normalized.includes("missing case inputs: t0_freeze");
            }).length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
                {report.integrity.unresolved
                  .filter((warning) => {
                    const normalized = warning.toLowerCase();
                    return (
                      !normalized.includes("no t0 freeze") &&
                      !normalized.includes("missing case inputs: t0_freeze")
                    );
                  })
                  .map((warning) => (
                  <li key={warning}>Unresolved: {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Learning
            </h3>
            <FieldGrid items={learningItems} columns="sm:grid-cols-2" />
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Improvement
            </h3>
            <FieldGrid items={improvementItems} columns="sm:grid-cols-2" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Opportunity Path
          </h3>
          {report.opportunityConsumption.available ? (
            <>
              <FieldGrid
                items={opportunityItems}
                columns="sm:grid-cols-2 xl:grid-cols-3"
              />
              {report.opportunityConsumption.checkpoints.length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Checkpoint</th>
                        <th className="px-3 py-2 font-medium">Reached</th>
                        <th className="px-3 py-2 font-medium">Path after crossing</th>
                        <th className="px-3 py-2 font-medium">Pullback</th>
                        <th className="px-3 py-2 font-medium">Retest entry</th>
                        <th className="px-3 py-2 font-medium">Restored R:R</th>
                        <th className="px-3 py-2 font-medium">After path</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {report.opportunityConsumption.checkpoints.map((checkpoint) => (
                        <tr
                          key={checkpoint.thresholdR}
                          className="bg-zinc-950/40"
                          data-opportunity-checkpoint={checkpoint.thresholdR}
                        >
                          <td className="px-3 py-2 text-zinc-100">
                            {formatMaybeR(checkpoint.thresholdR)} at {formatMaybeNumber(checkpoint.thresholdPrice)}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">
                            {checkpoint.reached ? `yes · ${checkpoint.reachedAt ?? "—"}` : "no"}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">
                            {checkpoint.subsequentMfeR == null && checkpoint.subsequentMaeR == null
                              ? "—"
                              : `MFE ${formatMaybeR(checkpoint.subsequentMfeR)} · MAE ${formatMaybeR(checkpoint.subsequentMaeR)}`}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">
                            {checkpoint.pullbackDepthR == null
                              ? "—"
                              : `${formatMaybeR(checkpoint.pullbackDepthR)} · low ${formatMaybeNumber(checkpoint.pullbackLowAfterThreshold)} · ${formatMaybeDurationMs(checkpoint.timeToDeepestPullbackMs)}`}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">
                            {checkpoint.retestedOriginalEntry == null
                              ? "—"
                              : checkpoint.retestedOriginalEntry
                                ? "yes"
                                : "no"}
                          </td>
                          <td className="px-3 py-2 text-zinc-300">
                            {formatMaybeR(checkpoint.restoredRRAtPullback)}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            target {checkpoint.targetReachedAfterThreshold == null ? "—" : checkpoint.targetReachedAfterThreshold ? "yes" : "no"}
                            {" · "}
                            stop {checkpoint.stopReachedAfterThreshold == null ? "—" : checkpoint.stopReachedAfterThreshold ? "yes" : "no"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <p className="mt-2 text-[11px] text-zinc-500">
                Observational only. No execution keeps realized R at 0R. Checkpoints are editable hypotheses, not automatic trading rules.
              </p>
              {report.opportunityConsumption.checkpointOrderingLimitation ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  Resolution note: {report.opportunityConsumption.checkpointOrderingLimitation}
                </p>
              ) : null}
              {report.opportunityConsumption.excludedFromAggregates ? (
                <p className="mt-1 text-[11px] text-amber-300">
                  This path is excluded from aggregate learning weight: {report.opportunityConsumption.exclusionReason ?? "excluded"}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              {report.opportunityConsumption.reason ?? "Opportunity path is not available for this Case."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function familyChip(row: InsightsCaseRow): string {
  return caseFamilyLabel(row.family);
}

function diagnosisChip(row: InsightsCaseRow): string {
  if (row.caseDSubtype) {
    return CASE_D_SUBTYPE_LABEL[row.caseDSubtype];
  }
  if (row.family === "B" && row.noEntryDiagnosis) {
    return noEntryDiagnosisLabel(row.noEntryDiagnosis);
  }
  if (row.family === "INDETERMINATE") {
    return NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE;
  }
  return "—";
}

function comparisonDiagnosisLabel(row: OpportunityParticipationComparisonRow): string {
  if (row.noEntryDiagnosis) return noEntryDiagnosisLabel(row.noEntryDiagnosis);
  return CASE_FAMILY_LABEL[row.caseFamily] ?? row.caseFamily;
}

function countBy<T extends string>(
  rows: InsightsCaseRow[],
  pick: (r: InsightsCaseRow) => T
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = pick(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function MetricCard({
  metric,
  active,
  onClick,
  testId,
}: {
  metric: InsightsCaseCardMetric;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const interactive = Boolean(onClick);
  const className = `rounded-xl border px-3 py-3 text-left ${
    active
      ? "border-violet-600/60 bg-violet-950/30"
      : "border-zinc-800 bg-zinc-950/50"
  } ${interactive ? "cursor-pointer hover:border-zinc-600" : ""}`;

  const body = (
    <>
      <p className="text-[10px] font-medium leading-snug tracking-wide text-zinc-500">
        {metric.label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
        {metric.numerator}
        <span className="ml-1 text-xs font-normal text-zinc-500">
          / {metric.denominator}
        </span>
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
        {formatPct(metric.rate)}
      </p>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        data-case-card={testId ?? metric.label}
        aria-pressed={active}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={className} data-case-card={testId ?? metric.label}>
      {body}
    </div>
  );
}

export type PipelinePerformancePlaybookOption = {
  id: string;
  name: string;
};

const DQ_OPTIONS: DecisionQuality[] = [
  "supported",
  "weakly_supported",
  "not_supported",
  "INDETERMINATE",
];

export function PreviewPipelinePerformance({
  input,
  realityWindows,
  playbooks,
  caseSpine = [],
  improvementHypotheses = [],
  persistenceReadOnly = false,
  initialFocusCaseId = "",
}: {
  input: Omit<PipelinePerformanceInput, "filters">;
  realityWindows: MarketRealityCaseWindow[];
  playbooks: PipelinePerformancePlaybookOption[];
  caseSpine?: InsightsCaseRow[];
  improvementHypotheses?: ImprovementHypothesis[];
  persistenceReadOnly?: boolean;
  initialFocusCaseId?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ticker, setTicker] = useState("");
  const [playbookId, setPlaybookId] = useState("");
  const [outcomeType, setOutcomeType] = useState<PipelineOutcomeBucket | "all">(
    "all"
  );
  const [executedMode, setExecutedMode] = useState<PipelineExecutedMode>("all");
  const [pipelineComponent, setPipelineComponent] = useState<
    MafComponentId | "all"
  >("all");
  const [caseFamily, setCaseFamily] = useState<InsightsCaseFamily | "all">(
    "all"
  );
  const [noEntryDiagnosis, setNoEntryDiagnosis] = useState<
    NoEntryDiagnosisClass | "all"
  >("all");
  const [decisionQuality, setDecisionQuality] = useState<
    DecisionQuality | "all"
  >("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [focusPlanId, setFocusPlanId] = useState(initialFocusCaseId);
  const [snapshotCopied, setSnapshotCopied] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [focusedCaseReport, setFocusedCaseReport] = useState<FocusedCaseReport | null>(null);
  const [focusedCaseReportBusy, setFocusedCaseReportBusy] = useState(false);
  const [focusedCaseReportError, setFocusedCaseReportError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: PipelinePerformanceFilters = useMemo(
    () => ({
      from: from.trim() ? `${from.trim()}T00:00:00.000Z` : undefined,
      to: to.trim() ? `${to.trim()}T23:59:59.999Z` : undefined,
      ticker: ticker.trim() || undefined,
      playbookId: playbookId || undefined,
      outcomeType,
      executedMode,
      pipelineComponent,
    }),
    [from, to, ticker, playbookId, outcomeType, executedMode, pipelineComponent]
  );

  const view = useMemo(
    () => computePipelinePerformance({ ...input, filters }),
    [input, filters]
  );

  const caseView = useMemo(
    () =>
      buildInsightsCaseSpineView(caseSpine, {
        from: filters.from,
        to: filters.to,
        ticker: filters.ticker,
        playbookId: filters.playbookId,
        caseFamily,
        noEntryDiagnosis,
        decisionQuality,
      }),
    [
      caseSpine,
      filters.from,
      filters.to,
      filters.ticker,
      filters.playbookId,
      caseFamily,
      noEntryDiagnosis,
      decisionQuality,
    ]
  );

  const tickers = useMemo(() => {
    const set = new Set<string>();
    for (const lo of input.learningOutcomes) set.add(lo.ticker.toUpperCase());
    for (const p of input.plans) set.add(p.ticker.toUpperCase());
    for (const t of input.trades) set.add(t.ticker.toUpperCase());
    for (const r of caseSpine) set.add(r.ticker.toUpperCase());
    return [...set].sort();
  }, [input, caseSpine]);

  const planStatusById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of input.plans) {
      map.set(p.id.toUpperCase(), p.status);
    }
    return map;
  }, [input.plans]);

  const focusPlanOptions = useMemo(() => {
    const byId = new Map<string, InsightsCaseRow>();
    for (const row of caseSpine) {
      const id = row.planId.toUpperCase();
      if (!byId.has(id)) byId.set(id, row);
    }
    return [...byId.values()]
      .map((row) =>
        buildFocusCaseOption({
          row,
          planStatus: planStatusById.get(row.planId.toUpperCase()) ?? null,
        })
      )
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => {
        const t = a.label.localeCompare(b.label);
        return t !== 0 ? t : a.value.localeCompare(b.value);
      });
  }, [caseSpine, planStatusById]);

  const focusPlanRowsById = useMemo(() => {
    const map = new Map<string, InsightsCaseRow>();
    for (const row of caseSpine) {
      const option = buildFocusCaseOption({
        row,
        planStatus: planStatusById.get(row.planId.toUpperCase()) ?? null,
      });
      if (option) map.set(option.value.toUpperCase(), row);
    }
    return map;
  }, [caseSpine, planStatusById]);

  const fvl = caseView.aggregate.falseVirtuousLoop;
  const condition = caseView.aggregate.currentCondition;

  const playbookNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of playbooks) m.set(p.id, p.name);
    return m;
  }, [playbooks]);

  const playbookLearning = useMemo(
    () => aggregatePlaybookDiagnosis(caseView.rows, playbookNames),
    [caseView.rows, playbookNames]
  );

  const dqCounts = useMemo(
    () => countBy(caseView.rows, (r) => r.decisionQuality),
    [caseView.rows]
  );
  const eqCounts = useMemo(
    () => countBy(caseView.rows, (r) => r.executionQuality),
    [caseView.rows]
  );
  const realityCounts = useMemo(
    () => countBy(caseView.rows, (r) => r.reality),
    [caseView.rows]
  );
  const missingT0Count = useMemo(
    () => caseView.rows.filter((r) => !r.t0Available).length,
    [caseView.rows]
  );
  const localMafJoined = useMemo(
    () => countAcceptedMafJoined(caseView.rows),
    [caseView.rows]
  );

  const casesForReview = useMemo(
    () => pickCasesNeedingReview(caseView.rows, 12),
    [caseView.rows]
  );

  function applyFamilyFilter(family: InsightsCaseFamily) {
    setCaseFamily((prev) => (prev === family ? "all" : family));
    if (family !== "B") setNoEntryDiagnosis("all");
  }

  function applyNoEntryFilter(dx: NoEntryDiagnosisClass) {
    setCaseFamily("B");
    setNoEntryDiagnosis((prev) => (prev === dx ? "all" : dx));
  }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (from.trim()) n += 1;
    if (to.trim()) n += 1;
    if (ticker.trim()) n += 1;
    if (playbookId) n += 1;
    if (outcomeType !== "all") n += 1;
    if (executedMode !== "all") n += 1;
    if (caseFamily !== "all") n += 1;
    if (noEntryDiagnosis !== "all") n += 1;
    if (decisionQuality !== "all") n += 1;
    if (pipelineComponent !== "all") n += 1;
    return n;
  }, [
    from,
    to,
    ticker,
    playbookId,
    outcomeType,
    executedMode,
    caseFamily,
    noEntryDiagnosis,
    decisionQuality,
    pipelineComponent,
  ]);

  const pipelineSnapshotText = useMemo(
    () =>
      buildInsightsSnapshotBrief({
        pipelineInput: input,
        caseSpine,
        pipelineFilters: filters,
        caseFilters: {
          from: filters.from,
          to: filters.to,
          ticker: filters.ticker,
          playbookId: filters.playbookId,
          caseFamily,
          noEntryDiagnosis,
          decisionQuality,
        },
        focusPlanId: focusPlanId.trim() || undefined,
        playbookNames,
      }),
    [
      input,
      caseSpine,
      filters,
      caseFamily,
      noEntryDiagnosis,
      decisionQuality,
      focusPlanId,
      playbookNames,
    ]
  );

  const pipelineContextSnapshotText = useMemo(
    () =>
      buildInsightsSnapshotBrief({
        pipelineInput: input,
        caseSpine,
        pipelineFilters: filters,
        caseFilters: {
          from: filters.from,
          to: filters.to,
          ticker: filters.ticker,
          playbookId: filters.playbookId,
          caseFamily,
          noEntryDiagnosis,
          decisionQuality,
        },
        playbookNames,
      }),
    [input, caseSpine, filters, caseFamily, noEntryDiagnosis, decisionQuality, playbookNames]
  );

  const selectedFocusRow = useMemo(
    () =>
      focusPlanRowsById.get(focusPlanId.trim().toUpperCase()) ?? null,
    [focusPlanId, focusPlanRowsById]
  );

  const opportunityComparison = useMemo(
    () =>
      computeOpportunityParticipationComparison({
        source: {
          plans: input.plans,
          trades: input.trades,
          learningOutcomes: input.learningOutcomes,
          caseSpine,
          realityWindows,
        },
        filters: {
          from: filters.from,
          to: filters.to,
          ticker: filters.ticker,
          playbookId: filters.playbookId,
        },
      }),
    [caseSpine, filters.from, filters.playbookId, filters.ticker, filters.to, input.learningOutcomes, input.plans, input.trades, realityWindows]
  );

  const focusedComparisonRow = useMemo(
    () =>
      focusPlanId.trim()
        ? opportunityComparison.rows.find(
            (row) => row.planId.toUpperCase() === focusPlanId.trim().toUpperCase()
          ) ?? null
        : null,
    [focusPlanId, opportunityComparison.rows]
  );

  const opportunitySequence = useMemo(
    () =>
      computeOpportunitySequenceComparison({
        source: {
          plans: input.plans,
          trades: input.trades,
          learningOutcomes: input.learningOutcomes,
          caseSpine,
        },
        filters: {
          from: filters.from,
          to: filters.to,
          ticker: filters.ticker,
          playbookId: filters.playbookId,
        },
      }),
    [caseSpine, filters.from, filters.playbookId, filters.ticker, filters.to, input.learningOutcomes, input.plans, input.trades]
  );

  useEffect(() => {
    const requested = initialFocusCaseId.trim();
    if (!requested) {
      setFocusPlanId("");
      return;
    }
    const match =
      focusPlanOptions.find(
        (option) => option.value.toUpperCase() === requested.toUpperCase()
      ) ?? null;
    if (match) {
      setFocusPlanId(match.value);
      return;
    }
    setFocusPlanId("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("case");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [focusPlanOptions, initialFocusCaseId, pathname, router, searchParams]);

  useEffect(() => {
    setSnapshotError(null);
    setSnapshotCopied(false);
  }, [focusPlanId]);

  useEffect(() => {
    const caseId = focusPlanId.trim();
    if (!caseId) {
      setFocusedCaseReport(null);
      setFocusedCaseReportError(null);
      setFocusedCaseReportBusy(false);
      return;
    }
    let cancelled = false;
    setFocusedCaseReportBusy(true);
    setFocusedCaseReportError(null);
    fetch(
      mxtPath(`/api/matrix/case-report?case=${encodeURIComponent(caseId)}`),
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `HTTP ${response.status}`);
        }
        return (await response.json()) as FocusedCaseReport;
      })
      .then((report) => {
        if (!cancelled) setFocusedCaseReport(report);
      })
      .catch((error) => {
        if (cancelled) return;
        setFocusedCaseReport(null);
        setFocusedCaseReportError(
          error instanceof Error
            ? error.message
            : "Case could not be loaded."
        );
      })
      .finally(() => {
        if (!cancelled) setFocusedCaseReportBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [focusPlanId]);

  function updateFocusCase(nextCaseId: string) {
    setFocusPlanId(nextCaseId);
    const params = new URLSearchParams(searchParams.toString());
    if (nextCaseId.trim()) {
      params.set("case", nextCaseId.trim());
      params.set("tab", "pipeline");
    } else {
      params.delete("case");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function fetchSnapshotText(kind: "case"): Promise<string | null> {
    const caseId = focusPlanId.trim();
    if (!caseId) return null;
    const response = await fetch(
      mxtPath(
        `/api/matrix/case-snapshot?case=${encodeURIComponent(caseId)}&kind=${kind}`
      ),
      {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      }
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `HTTP ${response.status}`);
    }
    return response.text();
  }

  return (
    <div
      className="space-y-6 px-4 py-4 lg:px-6 lg:py-6"
      data-insights-pipeline-performance
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-zinc-500">
          Canonical Learning surface. Focus a Case, inspect state, copy the snapshot you need.
        </p>
        <div className="flex shrink-0 flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
            Focus case
            <select
              value={focusPlanId}
              onChange={(e) => updateFocusCase(e.target.value)}
              className="min-h-9 min-w-[14rem] max-w-[22rem] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm normal-case text-zinc-200"
              data-testid="improvement-focus-plan"
            >
              <option value="">Select case…</option>
              {focusPlanOptions.map((option) => {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            onClick={async () => {
              setSnapshotError(null);
              setSnapshotBusy(true);
              try {
                const caseText = focusPlanId.trim() ? await fetchSnapshotText("case") : null;
                const text = composeUnifiedSnapshot({
                  caseSnapshotText: caseText,
                  insightsSnapshotText: focusPlanId.trim()
                    ? pipelineContextSnapshotText
                    : pipelineSnapshotText,
                });
                const ok = await copyText(text);
                if (ok) {
                  setSnapshotCopied(true);
                  window.setTimeout(() => setSnapshotCopied(false), 2000);
                }
              } catch (error) {
                setSnapshotError(
                  error instanceof Error
                    ? error.message
                    : "Snapshot could not be generated."
                );
              } finally {
                setSnapshotBusy(false);
              }
            }}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-left hover:border-zinc-500 hover:bg-zinc-800"
            data-insights-pipeline-snapshot
            data-testid="insights-snapshot-copy"
          >
            <span className="block text-xs font-medium text-zinc-100">
              {snapshotCopied ? "Copied ✓" : snapshotBusy ? "Generating…" : "Copy Snapshot"}
            </span>
            <span className="mt-0.5 block text-[11px] text-zinc-500">
              {focusPlanId.trim()
                ? "Copy focused Case plus relevant Insights context"
                : "Copy the current Insights context"}
            </span>
          </button>
        </div>
      </div>
      {snapshotError ? (
        <p className="text-xs text-rose-400">{snapshotError}</p>
      ) : null}

      <FocusedCaseReportPanel
        report={focusedCaseReport}
        loading={focusedCaseReportBusy}
        error={focusedCaseReportError}
      />

      <PreviewImprovementPath
        hypotheses={improvementHypotheses}
        caseSpine={caseSpine}
        focusPlanId={focusPlanId}
        persistenceReadOnly={persistenceReadOnly}
        planOptions={Array.from(focusPlanRowsById.values()).map((row) => ({
          planId: row.planId,
          ticker: row.ticker,
          playbookId: row.playbookId ?? null,
          status: planStatusById.get(row.planId.toUpperCase()) ?? "—",
          lifecycleStatus: row.lifecycle.status,
          t0Available: row.t0Available,
          independentEconomicObservation:
            row.independentEconomicObservation !== false,
        }))}
      />

      <section
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40"
        data-pipeline-filters
      >
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
          aria-expanded={filtersOpen}
          data-pipeline-filters-toggle
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-zinc-200">
              Filters
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              {activeFilterCount === 0
                ? "All defaults — expand to refine"
                : `${activeFilterCount} active — expand to edit`}
            </span>
          </span>
          <span
            className={`shrink-0 text-xs font-medium text-zinc-400 transition-transform ${
              filtersOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {filtersOpen ? (
          <div className="grid gap-3 border-t border-zinc-800 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Ticker
          <select
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          >
            <option value="">All</option>
            {tickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Playbook
          <select
            value={playbookId}
            onChange={(e) => setPlaybookId(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          >
            <option value="">All</option>
            {playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Outcome type
          <select
            value={outcomeType}
            onChange={(e) =>
              setOutcomeType(e.target.value as PipelineOutcomeBucket | "all")
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          >
            <option value="all">All</option>
            {PIPELINE_OUTCOME_BUCKETS.map((id) => (
              <option key={id} value={id}>
                {PIPELINE_OUTCOME_BUCKET_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Executed vs non-executed
          <select
            value={executedMode}
            onChange={(e) =>
              setExecutedMode(e.target.value as PipelineExecutedMode)
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          >
            <option value="all">All</option>
            <option value="executed">Executed only</option>
            <option value="non_executed">Non-executed only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Case family
          <select
            value={caseFamily}
            onChange={(e) =>
              setCaseFamily(e.target.value as InsightsCaseFamily | "all")
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
            data-filter-case-family
          >
            {CASE_FAMILY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          No-entry diagnosis
          <select
            value={noEntryDiagnosis}
            onChange={(e) =>
              setNoEntryDiagnosis(
                e.target.value as NoEntryDiagnosisClass | "all"
              )
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
            data-filter-no-entry-diagnosis
          >
            {NO_ENTRY_DIAGNOSIS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500">
          Decision Quality
          <select
            value={decisionQuality}
            onChange={(e) =>
              setDecisionQuality(e.target.value as DecisionQuality | "all")
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
            data-filter-decision-quality
          >
            <option value="all">All</option>
            {DQ_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-zinc-500 sm:col-span-2 lg:col-span-3">
          Pipeline component
          <select
            value={pipelineComponent}
            onChange={(e) =>
              setPipelineComponent(e.target.value as MafComponentId | "all")
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm normal-case text-zinc-200"
          >
            <option value="all">All</option>
            {PIPELINE_PERFORMANCE_COMPONENTS.map((id) => (
              <option key={id} value={id}>
                {PIPELINE_PERFORMANCE_COMPONENT_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
          </div>
        ) : null}
      </section>

      {/* Condición Actual */}
      <section
        className={`rounded-2xl border px-4 py-3 ${
          fvl.suspected
            ? "border-amber-800/60 bg-amber-950/25"
            : condition.code === "INSUFFICIENT_EVIDENCE"
              ? "border-violet-900/50 bg-violet-950/20"
              : "border-zinc-800 bg-zinc-900/40"
        }`}
        data-case-condition-banner
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Condición Actual
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-100">
          {condition.statement}
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          {condition.code} · {fvl.equationId}:{" "}
          {fvl.suspected
            ? `suspected — entryRate=${
                fvl.inputs.entryRate != null
                  ? formatPct(fvl.inputs.entryRate)
                  : "—"
              }, overOpt=${fvl.inputs.overOptimization}/${fvl.inputs.noEntryDiagnosedDenom}`
            : "no false-virtuous-loop suspicion"}
        </p>
      </section>

      {/* Evidence visibility */}
      <section
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
        data-case-evidence-visibility
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Decision universe (filtered)
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Cases {caseView.rows.length} · Missing T0 {missingT0Count} · Entry{" "}
          {caseView.aggregate.entryUniverse} · No Entry{" "}
          {caseView.aggregate.noEntryUniverse}
        </p>
      </section>

      <section
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        data-opportunity-participation-comparison
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Opportunity Participation Comparison
            </h2>
            <p className="mt-1 text-sm text-zinc-300">
              Eligible opportunities {opportunityComparison.eligibleOpportunityCount} · excluded{" "}
              {opportunityComparison.excludedOpportunityCount} · unavailable{" "}
              {opportunityComparison.unavailableOpportunityCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {opportunityComparison.eligibleWindowLabel}
            </p>
            <p
              className="mt-2 text-[11px] text-zinc-500"
              data-research-universe="participation"
            >
              Research universe · unit:{" "}
              {opportunityComparison.researchUniverse.unitLabel} · N=
              {opportunityComparison.researchUniverse.n} · excluded{" "}
              {opportunityComparison.researchUniverse.excluded} · unavailable{" "}
              {opportunityComparison.researchUniverse.unavailable} · claim:{" "}
              {opportunityComparison.researchUniverse.claimLevel}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Full evidence</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunityComparison.alternatives.fullParticipationEvidenceCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Wait evidence</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunityComparison.alternatives.waitEvidenceCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">OLE evidence</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunityComparison.alternatives.oleEvidenceCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Late geometry</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunityComparison.alternatives.lateParticipationGeometryCount}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-opportunity-participation-evidence>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Layered config</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {opportunityComparison.participationEvidence.layeredConfigurationCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Capability/configuration only.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Actual OLE participation</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {opportunityComparison.participationEvidence.actualOleParticipationCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Requires preserved fills, not just OLE support.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Actual partial OLE</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {opportunityComparison.participationEvidence.actualOlePartialParticipationCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Observed partial participation only.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">No participation</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {opportunityComparison.participationEvidence.noParticipationCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Observed no-entry / wait paths in current filter.</p>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800" data-opportunity-participation-closure>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Comparison</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Evidence</th>
                <th className="px-3 py-2 font-medium">Remaining gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(
                [
                  { label: "Full vs OLE", value: opportunityComparison.closures.fullVsOle },
                  { label: "OLE vs wait", value: opportunityComparison.closures.oleVsWait },
                  {
                    label: "Early OLE vs late participation",
                    value: opportunityComparison.closures.earlyOleVsLate,
                  },
                  {
                    label: "OLE after displacement",
                    value: opportunityComparison.closures.oleAfterDisplacement,
                  },
                  {
                    label: "Partial participation + pullback",
                    value: opportunityComparison.closures.partialParticipationPullback,
                  },
                ] as const
              ).map(({ label, value }) => (
                <tr
                  key={label}
                  className="bg-zinc-950/40"
                  data-opportunity-closure-row={label}
                >
                  <td className="px-3 py-2 text-zinc-100">{label}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        value.status === "OBSERVED"
                          ? "text-emerald-300"
                          : value.status === "INSUFFICIENT EVIDENCE"
                            ? "text-amber-300"
                            : "text-zinc-400"
                      }
                    >
                      {value.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{value.evidence}</td>
                  <td className="px-3 py-2 text-zinc-500">{value.gap ?? "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {focusedComparisonRow ? (
          <p className="mt-3 text-xs text-violet-300" data-opportunity-focus-row={focusedComparisonRow.planId}>
            Focused Case in comparison: {focusedComparisonRow.ticker} · {focusedComparisonRow.planId} · displacement{" "}
            {formatMaybeR(focusedComparisonRow.favorableDisplacementR)} · wait evidence{" "}
            {focusedComparisonRow.waitEvidenceAvailable ? "available" : "unavailable"} · late geometry{" "}
            {focusedComparisonRow.lateEntryGeometryAvailable ? "available" : "unavailable"}
          </p>
        ) : null}
        {opportunityComparison.checkpointAggregates.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Checkpoint</th>
                  <th className="px-3 py-2 font-medium">Reached</th>
                  <th className="px-3 py-2 font-medium">Window N</th>
                  <th className="px-3 py-2 font-medium">Pullback</th>
                  <th className="px-3 py-2 font-medium">Retest</th>
                  <th className="px-3 py-2 font-medium">No return observed</th>
                  <th className="px-3 py-2 font-medium">After path</th>
                  <th className="px-3 py-2 font-medium">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {opportunityComparison.checkpointAggregates.map((row) => (
                  <tr
                    key={row.thresholdR}
                    className="bg-zinc-950/40"
                    data-opportunity-comparison-checkpoint={row.thresholdR}
                  >
                    <td className="px-3 py-2 text-zinc-100">{formatMaybeR(row.thresholdR)}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.reachedCount}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.observationWindowEligibleCount}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.pullbackObservedCount}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.retestObservedCount}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.noReturnObservedCount}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      target {row.targetReachedAfterCount} · stop {row.stopReachedAfterCount}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      pullback avg {formatMaybeR(row.averagePullbackDepthR)} · median{" "}
                      {formatMaybeR(row.medianPullbackDepthR)}
                      <div className="text-[10px] text-zinc-600">
                        time avg {formatMaybeDurationMs(row.averageTimeToPullbackMs)} · median{" "}
                        {formatMaybeDurationMs(row.medianTimeToPullbackMs)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No eligible non-executed opportunity paths match the current filter.
          </p>
        )}
        {opportunityComparison.rows.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">Displacement</th>
                  <th className="px-3 py-2 font-medium">Pullback / wait</th>
                  <th className="px-3 py-2 font-medium">0.5R path</th>
                  <th className="px-3 py-2 font-medium">1R path</th>
                  <th className="px-3 py-2 font-medium">Alternatives</th>
                  <th className="px-3 py-2 font-medium">Segmentation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {opportunityComparison.rows.map((row) => {
                  const c05 = row.checkpoints.find((item) => item.thresholdR === 0.5) ?? null;
                  const c10 = row.checkpoints.find((item) => item.thresholdR === 1) ?? null;
                  return (
                    <tr
                      key={row.planId}
                      className="bg-zinc-950/40"
                      data-opportunity-comparison-row={row.planId}
                    >
                      <td className="px-3 py-2 text-zinc-100">
                        <div className="font-mono text-xs">{row.ticker} · {row.planId}</div>
                        <div className="text-[10px] text-zinc-500">
                          {row.lifecycleStatus} · {comparisonDiagnosisLabel(row)} · {row.windowKind}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {formatMaybeR(row.favorableDisplacementR)} · {formatMaybeNumber(row.favorableDisplacementPrice)}
                        <div className="text-[10px] text-zinc-600">
                          risk {formatMaybeNumber(row.plannedRiskPrice)} · {row.windowStart.slice(0, 10)} →{" "}
                          {row.windowEnd.slice(0, 10)} · window {formatMaybeNumber(row.observationWindowDays)}d
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        pullback {formatMaybeR(row.pullbackAfterPeakR)}
                        <div className="text-[10px] text-zinc-600">
                          retest {row.retestedOriginalEntryAfterPeak == null ? "—" : row.retestedOriginalEntryAfterPeak ? "yes" : "no"} · restored R:R{" "}
                          {formatMaybeR(row.restoredRRAtDeepestPullback)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {c05?.reached ? `MFE ${formatMaybeR(c05.subsequentMfeR)} · MAE ${formatMaybeR(c05.subsequentMaeR)}` : "not reached"}
                        <div className="text-[10px] text-zinc-600">
                          retest {c05?.retestedOriginalEntry == null ? "—" : c05.retestedOriginalEntry ? "yes" : "no"} · time{" "}
                          {formatMaybeDurationMs(c05?.timeToDeepestPullbackMs)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {c10?.reached ? `MFE ${formatMaybeR(c10.subsequentMfeR)} · MAE ${formatMaybeR(c10.subsequentMaeR)}` : "not reached"}
                        <div className="text-[10px] text-zinc-600">
                          retest {c10?.retestedOriginalEntry == null ? "—" : c10.retestedOriginalEntry ? "yes" : "no"} · time{" "}
                          {formatMaybeDurationMs(c10?.timeToDeepestPullbackMs)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        full {row.originalPlanGeometryAvailable ? "evidence" : "—"} · wait{" "}
                        {row.waitEvidenceAvailable ? "evidence" : "—"}
                        <div className="text-[10px] text-zinc-600">
                          OLE config {row.oleEvidenceAvailable ? row.oleExecutionModel ?? "yes" : "unavailable"} · actual OLE{" "}
                          {row.actualOleParticipationObserved ? "observed" : "not observed"} · late geometry{" "}
                          {row.lateEntryGeometryAvailable ? "available" : "unavailable"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-zinc-500">
                        PB {row.playbookId ?? "—"} · support {row.supportLevelAvailable ? "yes" : "no"}
                        <br />
                        trend {row.trendIntegrity ?? "—"} · state {row.familyBState ?? "—"}
                        <br />
                        pullback {row.pullbackQuality ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {opportunityComparison.excludedRows.length > 0 ? (
          <p className="mt-2 text-[11px] text-amber-300">
            Excluded from aggregate weight:{" "}
            {opportunityComparison.excludedRows
              .map((row) => `${row.planId}${row.exclusionReason ? ` (${row.exclusionReason})` : ""}`)
              .join(", ")}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-500">
          Checkpoint rows are path observations inside one opportunity, not independent trades or independent opportunities.
        </p>
      </section>

      <section
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        data-opportunity-sequence-accounting
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Opportunity Sequence Accounting
            </h2>
            <p className="mt-1 text-sm text-zinc-300">
              Opportunities {opportunitySequence.eligibleOpportunityCount} · attempts{" "}
              {opportunitySequence.actualAttemptCount} · multi-attempt{" "}
              {opportunitySequence.multiAttemptOpportunityCount}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{opportunitySequence.summaryNote}</p>
            <p
              className="mt-2 text-[11px] text-zinc-500"
              data-research-universe="sequence"
            >
              Research universe · unit: {opportunitySequence.researchUniverse.unitLabel} · N=
              {opportunitySequence.researchUniverse.n} · duplicate zero-weight{" "}
              {opportunitySequence.researchUniverse.excluded} · indeterminate lineage{" "}
              {opportunitySequence.researchUniverse.unavailable} · claim:{" "}
              {opportunitySequence.researchUniverse.claimLevel}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Actual opportunities</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunitySequence.actualExecutedOpportunityCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Indeterminate lineage</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunitySequence.indeterminateLineageCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Duplicate zero-weight</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                {opportunitySequence.duplicateZeroWeightCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Counterfactual in actual R</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">never</p>
            </div>
          </div>
        </div>
        {opportunitySequence.rows.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Opportunity</th>
                  <th className="px-3 py-2 font-medium">Attempt</th>
                  <th className="px-3 py-2 font-medium">Geometry</th>
                  <th className="px-3 py-2 font-medium">Actual R</th>
                  <th className="px-3 py-2 font-medium">Cumulative actual R</th>
                  <th className="px-3 py-2 font-medium">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {opportunitySequence.rows.flatMap((row) =>
                  row.attempts.map((attempt) => (
                    <tr
                      key={`${row.opportunityKey}:${attempt.tradeId}`}
                      className="bg-zinc-950/40"
                      data-opportunity-sequence-row={row.opportunityKey}
                    >
                      <td className="px-3 py-2 text-zinc-100">
                        <div className="font-mono text-xs">
                          {row.ticker} · {row.opportunityKey}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          plans {row.planIds.join(", ")} · lineage{" "}
                          {row.canonicalLineage ? "canonical" : "single-plan"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        #{attempt.attemptNumber} · {attempt.tradeId}
                        <div className="text-[10px] text-zinc-600">
                          {attempt.orderingAvailable ? attempt.orderedAt?.slice(0, 10) : "ordering unavailable"} ·{" "}
                          {attempt.tradeStatus}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        entry {formatMaybeNumber(attempt.plannedEntry)} · stop {formatMaybeNumber(attempt.stopPrice)} · target{" "}
                        {formatMaybeNumber(attempt.targetPrice)}
                        <div className="text-[10px] text-zinc-600">
                          planned R:R {formatMaybeR(attempt.plannedRR)} · {attempt.geometryRelationToPrior.replaceAll("_", " ")}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{formatMaybeR(attempt.realizedR)}</td>
                      <td className="px-3 py-2 text-zinc-100">
                        {formatMaybeR(attempt.cumulativeRealizedR)}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-zinc-500">
                        PB {attempt.playbookId ?? "—"} · support {formatMaybeNumber(attempt.supportLevel)}
                        <br />
                        trend {attempt.trendIntegrity ?? "—"} · state {attempt.familyBState ?? "—"}
                        <br />
                        pullback {attempt.pullbackQuality ?? "—"} · plan {attempt.planId ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No actual plan-linked attempt sequences match the current filter. No-execution Cases remain 0R actual and do not create attempts.
          </p>
        )}
        {opportunitySequence.indeterminateLineage.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3" data-opportunity-sequence-indeterminate>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Indeterminate lineage</p>
            <div className="mt-2 space-y-2">
              {opportunitySequence.indeterminateLineage.map((row) => (
                <div key={`${row.ticker}:${row.stockThesisId ?? "none"}`} className="text-sm text-zinc-300">
                  <span className="font-mono text-xs text-zinc-100">
                    {row.ticker} · {row.stockThesisId ?? "no-stock-thesis"}
                  </span>
                  <div className="text-[11px] text-zinc-500">
                    plans {row.planIds.join(", ")} · {row.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-zinc-500">
          Planned R:R, actual Realized R, counterfactual R, and cumulative actual sequence R remain separate. Counterfactual no-execution outcomes never enter cumulative actual sequence R.
        </p>
      </section>

      {/* Row 1 — Case accounting */}
      <section data-case-accounting>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Case accounting
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard metric={caseView.cards.totalCases} testId="total" />
          <MetricCard
            metric={caseView.cards.familyA}
            active={caseFamily === "A"}
            onClick={() => applyFamilyFilter("A")}
            testId="A"
          />
          <MetricCard
            metric={caseView.cards.familyB}
            active={caseFamily === "B" && noEntryDiagnosis === "all"}
            onClick={() => applyFamilyFilter("B")}
            testId="B"
          />
          <MetricCard
            metric={caseView.cards.familyC}
            active={caseFamily === "C"}
            onClick={() => applyFamilyFilter("C")}
            testId="C"
          />
          <MetricCard
            metric={caseView.cards.familyD}
            active={caseFamily === "D"}
            onClick={() => applyFamilyFilter("D")}
            testId="D"
          />
          <MetricCard
            metric={caseView.cards.indeterminate}
            active={caseFamily === "INDETERMINATE"}
            onClick={() => applyFamilyFilter("INDETERMINATE")}
            testId="INDETERMINATE"
          />
        </div>
      </section>

      {/* Row 2 — No-entry filter quality */}
      <section data-no-entry-filter-quality>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          No-entry filter quality
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MetricCard
            metric={caseView.cards.goodFilter}
            active={noEntryDiagnosis === "GOOD_FILTER"}
            onClick={() => applyNoEntryFilter("GOOD_FILTER")}
            testId="GOOD_FILTER"
          />
          <MetricCard
            metric={caseView.cards.overOptimization}
            active={noEntryDiagnosis === "OVER_OPTIMIZATION"}
            onClick={() => applyNoEntryFilter("OVER_OPTIMIZATION")}
            testId="OVER_OPTIMIZATION"
          />
          <MetricCard
            metric={caseView.cards.noEntryIndeterminate}
            active={
              caseFamily === "B" && noEntryDiagnosis === "INDETERMINATE"
            }
            onClick={() => applyNoEntryFilter("INDETERMINATE")}
            testId="NE_INDETERMINATE"
          />
        </div>
      </section>

      {/* Evaluation lanes (parity with Learning Overview) */}
      <section
        className="grid gap-3 sm:grid-cols-3"
        data-case-evaluation-lanes
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Decision Quality
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {Object.entries(dqCounts).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{k}</span>
                <span className="tabular-nums text-zinc-200">{n}</span>
              </li>
            ))}
            {Object.keys(dqCounts).length === 0 ? (
              <li className="text-zinc-600">—</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Execution Quality
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {Object.entries(eqCounts).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{k}</span>
                <span className="tabular-nums text-zinc-200">{n}</span>
              </li>
            ))}
            {Object.keys(eqCounts).length === 0 ? (
              <li className="text-zinc-600">—</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Reality relationship
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {Object.entries(realityCounts).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{k}</span>
                <span className="tabular-nums text-zinc-200">{n}</span>
              </li>
            ))}
            {Object.keys(realityCounts).length === 0 ? (
              <li className="text-zinc-600">—</li>
            ) : null}
          </ul>
        </div>
      </section>

      {/* Cases needing review */}
      <section
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        data-cases-for-review
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Cases needing review
        </h2>
        {casesForReview.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No review priorities in filter.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Case</th>
                  <th className="px-2 py-2 font-medium">Lifecycle</th>
                  <th className="px-2 py-2 font-medium">Family</th>
                  <th className="px-2 py-2 font-medium">Why</th>
                  <th className="px-2 py-2 font-medium">Link</th>
                  <th className="px-2 py-2 font-medium">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {casesForReview.map(({ row }) => (
                  <tr key={row.planId} className="bg-zinc-950/40">
                    <td className="px-2 py-2 font-mono text-xs text-zinc-300">
                      {row.ticker} · {row.planId}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-300">
                      {row.lifecycle.status}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-200">
                      {familyChip(row)}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-400">
                      {row.lifecycle.blockingLabels.length
                        ? row.lifecycle.blockingLabels.join(", ")
                        : row.noEntryDiagnosis
                          ? diagnosisChip(row)
                          : row.equationId}
                      <div className="font-mono text-[10px] text-zinc-600">
                        {row.equationId}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[10px] text-zinc-500">
                      Thesis {row.linkage?.planThesis ?? "—"} · PB{" "}
                      {row.linkage?.planPlaybook ?? "—"}
                    </td>
                      <td className="px-2 py-2 text-xs">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={mxtPath(
                              `/stats?tab=pipeline&case=${encodeURIComponent(row.planId)}`
                            )}
                            className="text-violet-300 hover:underline"
                          >
                            Insights
                          </Link>
                          <Link
                            href={row.caseHref}
                            className="text-violet-400 hover:underline"
                          >
                            Case
                          </Link>
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {view.empty && caseView.rows.length === 0 ? (
        <p
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500"
          data-pipeline-empty
        >
          No pipeline outcomes or Cases match these filters.
        </p>
      ) : (
        <>
          <section data-pipeline-summary>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Summary by outcome type
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {PIPELINE_OUTCOME_BUCKETS.map((id) => (
                <div
                  key={id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-3"
                  data-pipeline-summary-count={id}
                >
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {PIPELINE_OUTCOME_BUCKET_LABELS[id]}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
                    {view.summaryCounts[id]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
              data-pipeline-realized
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Realized performance (executed trades)
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Trades</dt>
                  <dd className="tabular-nums text-zinc-100">
                    {view.realized.tradeCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">W / L</dt>
                  <dd className="tabular-nums text-zinc-100">
                    {view.realized.wins} / {view.realized.losses}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Realized R (fills only)</dt>
                  <dd
                    className={`tabular-nums ${tone(view.realized.realizedRSum)}`}
                  >
                    {formatR(view.realized.realizedRSum)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Realized P/L</dt>
                  <dd
                    className={`tabular-nums ${tone(view.realized.realizedPnLSum)}`}
                  >
                    {formatUsd(view.realized.realizedPnLSum)}
                  </dd>
                </div>
              </dl>
            </div>
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
              data-pipeline-counterfactual
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Counterfactual / Planned R (Scout — not portfolio P/L)
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Evaluated Scouts</dt>
                  <dd className="tabular-nums text-zinc-100">
                    {view.counterfactual.scoutEvaluatedCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">UPL count</dt>
                  <dd className="tabular-nums text-zinc-100">
                    {view.counterfactual.unexecutedPlanLossCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Triggered, no Trade</dt>
                  <dd
                    className="tabular-nums text-zinc-100"
                    data-pipeline-triggered-without-trade
                  >
                    {view.counterfactual.triggeredPlansWithoutTrade}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Thesis fail rate (MAF)</dt>
                  <dd
                    className="tabular-nums text-zinc-100"
                    data-pipeline-thesis-failure-rate
                  >
                    {view.counterfactual.thesisFailureRate === null
                      ? "—"
                      : `${Math.round(view.counterfactual.thesisFailureRate * 100)}%`}
                    <span className="ml-1 text-[11px] text-zinc-600">
                      ({view.counterfactual.thesisFailureCount}/
                      {view.counterfactual.thesisEvaluationCount})
                    </span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-zinc-500">Counterfactual R (filtered rows)</dt>
                  <dd
                    className={`tabular-nums ${tone(view.counterfactual.counterfactualRSum)}`}
                  >
                    {formatR(view.counterfactual.counterfactualRSum)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-zinc-600">
                Pending observations:{" "}
                <span data-pipeline-pending-obs>
                  {view.pendingObservationCount}
                </span>
                . Triggered-without-Trade and thesis rates are Scout/MAF metrics —
                never Trade P/L.
              </p>
            </div>
          </section>

          <section data-pipeline-components>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Component attribution distribution
            </h2>
            <p className="mt-1 text-[11px] text-zinc-600" data-maf-source-note>
              {MAF_SOURCE_HELP}
              {localMafJoined > 0
                ? ` · ${localMafJoined} Case(s) joined in current filter.`
                : ""}
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Component</th>
                    <th className="px-3 py-2 font-medium">Evaluated</th>
                    <th className="px-3 py-2 font-medium">Weak/Fail</th>
                    <th className="px-3 py-2 font-medium">Primary drag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {view.componentDistribution.map((row) => (
                    <tr key={row.component} className="bg-zinc-950/40">
                      <td className="px-3 py-2 text-zinc-100">{row.label}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">
                        {row.evaluationCount}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">
                        {row.failureCount}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">
                        {row.dragCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section data-pipeline-repeated-drag>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Repeated drag / failure components
            </h2>
            {view.repeatedDragComponents.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                No primary-drag attributions yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {view.repeatedDragComponents.map((row) => (
                  <li
                    key={row.component}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-200">{row.label}</span>
                    <span className="tabular-nums text-zinc-400">
                      {row.count}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-playbook-learning>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Playbook Learning
            </h2>
            {playbookLearning.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No Cases in filter.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Playbook</th>
                      <th className="px-3 py-2 font-medium">Cases</th>
                      <th className="px-3 py-2 font-medium">Evaluable</th>
                      <th className="px-3 py-2 font-medium">
                        {CASE_FAMILY_LABEL.A}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {CASE_FAMILY_LABEL.B}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {CASE_FAMILY_LABEL.C}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {CASE_FAMILY_LABEL.D}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {CASE_FAMILY_LABEL.INDETERMINATE}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {NO_ENTRY_DIAGNOSIS_LABEL.GOOD_FILTER}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {NO_ENTRY_DIAGNOSIS_LABEL.OVER_OPTIMIZATION}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {playbookLearning.map((row) => (
                      <tr
                        key={row.playbookId ?? "__none"}
                        className="bg-zinc-950/40"
                        data-playbook-learning-row={row.playbookId ?? "none"}
                      >
                        <td className="px-3 py-2 text-zinc-100">
                          {row.playbookName}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.cases}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.evaluableCases}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.familyA}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.a)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.familyB}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.b)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.familyC}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.c)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.familyD}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.d)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.indeterminate}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.insufficient)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.goodFilter}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.goodFilter)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.overOptimization}
                          <span className="ml-1 text-[10px] text-zinc-600">
                            {formatPct(row.rates.overOptimization)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section data-historical-recovery>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Historical recovery (pre-MXT)
            </h2>
            {caseView.rows.filter((r) => r.caseOrigin === "historical_trade")
              .length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                No historical trade Cases in filter.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {caseView.rows
                  .filter((r) => r.caseOrigin === "historical_trade")
                  .map((row) => {
                    const accepted = formatAcceptedMafUi(row.mafAttribution);
                    const reconstructed = formatHistoricalReconstructionUi(
                      row.historicalAttribution,
                      row.diagnosisReason
                    );
                    return (
                      <li
                        key={row.caseId}
                        className="rounded-xl border border-amber-900/40 bg-amber-950/15 px-3 py-2 text-sm"
                        data-historical-case={row.caseId}
                        data-accepted-maf={
                          row.mafAttribution?.mafExperimentId ?? ""
                        }
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-mono text-xs text-zinc-200">
                            {row.ticker} · {row.caseId}
                          </span>
                          <div className="flex gap-2">
                            <Link
                              href={mxtPath(
                                `/stats?tab=pipeline&case=${encodeURIComponent(row.planId)}`
                              )}
                              className="text-xs text-violet-300 hover:underline"
                            >
                              Insights
                            </Link>
                            <Link
                              href={row.caseHref}
                              className="text-xs text-violet-400 hover:underline"
                            >
                              Trade
                            </Link>
                          </div>
                        </div>
                        <p
                          className="mt-2 text-xs text-emerald-300/90"
                          data-accepted-maf-line
                        >
                          {accepted.acceptedLine}
                        </p>
                        <p
                          className="text-xs text-emerald-300/70"
                          data-accepted-maf-drag
                        >
                          {accepted.primaryDragLine}
                        </p>
                        {reconstructed ? (
                          <div
                            className="mt-2 border-t border-amber-900/30 pt-2"
                            data-historical-reconstruction
                          >
                            <p className="text-[10px] uppercase tracking-wide text-amber-500/90">
                              {reconstructed.label}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {reconstructed.summary}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-600">
                              {reconstructed.provenanceLine}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>

          {/* Unified Case drill-down */}
          <section data-case-drilldown>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Case drill-down
            </h2>
            <p className="mt-1 text-[11px] text-zinc-600">
              {caseView.rows.length} {caseView.rows.length === 1 ? "Case" : "Cases"} in filter.
            </p>
            {caseView.rows.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No Cases match Case filters.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Ticker</th>
                      <th className="px-3 py-2 font-medium">Plan / Case</th>
                      <th className="px-3 py-2 font-medium">Lifecycle</th>
                      <th className="px-3 py-2 font-medium">Family</th>
                      <th className="px-3 py-2 font-medium">Diagnosis</th>
                      <th className="px-3 py-2 font-medium">DQ</th>
                      <th className="px-3 py-2 font-medium">EQ</th>
                      <th className="px-3 py-2 font-medium">Reality</th>
                      <th className="px-3 py-2 font-medium">Linkage</th>
                      <th className="px-3 py-2 font-medium">Accepted MAF</th>
                      <th className="px-3 py-2 font-medium">Historical</th>
                      <th className="px-3 py-2 font-medium">Outcome</th>
                      <th className="px-3 py-2 font-medium">Realized R</th>
                      <th className="px-3 py-2 font-medium">CF / Planned R</th>
                      <th className="px-3 py-2 font-medium">Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {caseView.rows.map((row) => (
                      <tr
                        key={row.planId}
                        className="bg-zinc-950/40"
                        data-case-row={row.planId}
                        data-case-family={row.family}
                        data-case-diagnosis={row.noEntryDiagnosis ?? ""}
                        title={`${row.equationId}: ${row.diagnosisReason}${
                          row.missingInputs.length
                            ? ` · missing: ${row.missingInputs.join(", ")}`
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2 tabular-nums text-zinc-400">
                          {row.date.slice(0, 10)}
                        </td>
                        <td className="px-3 py-2 text-zinc-100">{row.ticker}</td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                          {row.planId}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-300">
                          {row.lifecycle.status}
                          {row.lifecycle.blockingLabels.length ? (
                            <div className="text-[10px] text-amber-300">
                              {row.lifecycle.blockingLabels.join(", ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-200">
                          {familyChip(row)}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-300">
                          {diagnosisChip(row)}
                          <div className="font-mono text-[10px] text-zinc-600">
                            {row.equationId}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">
                          {row.decisionQuality}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">
                          {row.executionQuality}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">
                          {row.reality}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-zinc-500">
                          T {row.linkage?.planThesis ?? "—"}
                          <br />
                          PB {row.linkage?.planPlaybook ?? "—"}
                          <br />
                          Tr {row.linkage?.tradePlan ?? "—"}
                        </td>
                        <td
                          className="px-3 py-2 text-[10px] text-zinc-300"
                          data-case-accepted-maf={
                            row.mafAttribution?.mafExperimentId ?? ""
                          }
                        >
                          {formatAcceptedMafDrillCell(row.mafAttribution)}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-zinc-400">
                          {row.caseOrigin === "historical_trade" ? (
                            <>
                              <span className="text-amber-400/90">
                                Reconstruction · not accepted
                              </span>
                              <div>
                                {row.historicalAttribution?.components
                                  .slice(0, 2)
                                  .map((c) => `${c.label} (${c.provenance})`)
                                  .join(" · ") || "—"}
                              </div>
                            </>
                          ) : row.historicalAttribution ? (
                            "recon+"
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">
                          {row.outcomeLabel ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.realizedR != null ? formatR(row.realizedR) : "—"}
                          {row.realizedPnL != null
                            ? ` · ${formatUsd(row.realizedPnL)}`
                            : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-zinc-300">
                          {row.counterfactualR != null
                            ? formatR(row.counterfactualR)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={mxtPath(
                                `/stats?tab=pipeline&case=${encodeURIComponent(row.planId)}`
                              )}
                              className="text-violet-300 hover:text-violet-200 hover:underline"
                            >
                              Insights
                            </Link>
                            <Link
                              href={row.caseHref}
                              className="text-violet-400 hover:text-violet-300 hover:underline"
                              data-case-drill-href={row.caseHref}
                            >
                              Case
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Legacy LO drill-down preserved */}
          <section data-pipeline-drilldown>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Learning Outcome drill-down (path accounting)
            </h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Ticker</th>
                    <th className="px-3 py-2 font-medium">Outcome</th>
                    <th className="px-3 py-2 font-medium">Drag</th>
                    <th className="px-3 py-2 font-medium">Realized R</th>
                    <th className="px-3 py-2 font-medium">CF / Planned R</th>
                    <th className="px-3 py-2 font-medium">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {view.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="bg-zinc-950/40"
                      data-pipeline-row={row.id}
                      data-pipeline-outcome={row.outcomeType}
                    >
                      <td className="px-3 py-2 tabular-nums text-zinc-400">
                        {row.date.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 text-zinc-100">{row.ticker}</td>
                      <td className="px-3 py-2 text-zinc-300">{row.label}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {row.primaryDragComponent
                          ? MAF_COMPONENT_LABELS[row.primaryDragComponent]
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">
                        {row.outcomeType === "executed_trades"
                          ? [
                              row.realizedR != null
                                ? formatR(row.realizedR)
                                : null,
                              row.realizedPnL != null
                                ? formatUsd(row.realizedPnL)
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">
                        {row.outcomeType !== "executed_trades" &&
                        row.counterfactualR != null
                          ? formatR(row.counterfactualR)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={row.href}
                          className="text-violet-400 hover:text-violet-300 hover:underline"
                        >
                          {row.tradeId ??
                            row.planId ??
                            row.observationId ??
                            row.learningOutcomeId ??
                            "Open"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
