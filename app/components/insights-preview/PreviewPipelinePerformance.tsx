"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  type InsightsCaseFamily,
} from "@/lib/insights-case-spine-view";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";
import type { InsightsCaseCardMetric } from "@/lib/insights-case-spine-types";
import type { DecisionQuality } from "@/lib/case-evaluation-types";
import type { NoEntryDiagnosisClass } from "@/lib/case-diagnosis-types";
import {
  CASE_FAMILY_FILTER_OPTIONS,
  CASE_FAMILY_LABEL,
  NO_ENTRY_DIAGNOSIS_FILTER_OPTIONS,
  NO_ENTRY_DIAGNOSIS_LABEL,
  caseFamilyLabel,
  noEntryDiagnosisLabel,
} from "@/lib/insights-case-labels";
import { aggregatePlaybookDiagnosis } from "@/lib/insights-playbook-diagnosis";
import { MAF_SOURCE_HELP } from "@/lib/insights-maf-join";

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

function familyChip(row: InsightsCaseRow): string {
  return caseFamilyLabel(row.family);
}

function diagnosisChip(row: InsightsCaseRow): string {
  if (row.family === "B" && row.noEntryDiagnosis) {
    return noEntryDiagnosisLabel(row.noEntryDiagnosis);
  }
  if (row.family === "INDETERMINATE") {
    return NO_ENTRY_DIAGNOSIS_LABEL.INDETERMINATE;
  }
  return "—";
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
  playbooks,
  caseSpine = [],
}: {
  input: Omit<PipelinePerformanceInput, "filters">;
  playbooks: PipelinePerformancePlaybookOption[];
  caseSpine?: InsightsCaseRow[];
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
    () => caseView.rows.filter((r) => r.mafAttribution?.source === "local_json").length,
    [caseView.rows]
  );

  const casesForReview = useMemo(() => {
    const scored = caseView.rows.map((row) => {
      let score = 0;
      if (!row.t0Available) score += 100;
      if (row.noEntryDiagnosis === "OVER_OPTIMIZATION") score += 50;
      if (row.noEntryDiagnosis === "INDETERMINATE") score += 25;
      if (row.family === "D") score += 45;
      if (row.decisionQuality === "INDETERMINATE") score += 40;
      if (row.executionQuality === "violated") score += 35;
      if (row.linkage?.planThesis === "UNLINKED") score += 20;
      if (row.linkage?.planPlaybook === "UNLINKED") score += 10;
      return { row, score };
    });
    return scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.row.planId.localeCompare(b.row.planId))
      .slice(0, 12);
  }, [caseView.rows]);

  function applyFamilyFilter(family: InsightsCaseFamily) {
    setCaseFamily((prev) => (prev === family ? "all" : family));
    if (family !== "B") setNoEntryDiagnosis("all");
  }

  function applyNoEntryFilter(dx: NoEntryDiagnosisClass) {
    setCaseFamily("B");
    setNoEntryDiagnosis((prev) => (prev === dx ? "all" : dx));
  }

  return (
    <div
      className="space-y-6 px-4 py-4 lg:px-6 lg:py-6"
      data-insights-pipeline-performance
    >
      <p className="text-sm text-zinc-500">
        Canonical Learning surface: Plan → T0 → Reality → Case equation →
        diagnosis. Realized P/L stays separate from counterfactual Scout R.
        Missed Scouts are never counted as Trade wins or losses.
      </p>

      <section
        className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-2 lg:grid-cols-3"
        data-pipeline-filters
      >
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
        <p className="mt-1 text-[11px] text-zinc-500">
          {condition.code} · {fvl.equationId}:{" "}
          {fvl.suspected
            ? `suspected — entryRate=${
                fvl.inputs.entryRate != null
                  ? formatPct(fvl.inputs.entryRate)
                  : "—"
              }, overOpt=${fvl.inputs.overOptimization}/${fvl.inputs.noEntryDiagnosedDenom}`
            : "no false-virtuous-loop suspicion"}
          {" · "}
          Cards use <span className="text-zinc-400">CURRENT FILTERED</span>{" "}
          Case universe ({caseView.rows.length}).
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
        <p className="mt-1 text-[11px] text-zinc-600">
          Missing T0 Cases correctly fall to Insufficient Evidence — do not
          interpret high No Entry alone as conservatism.
        </p>
      </section>

      {/* Row 1 — Case accounting */}
      <section data-case-accounting>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Case accounting
        </h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          Equations from the Learning engine. B = No Entry (see filter quality).
          Rates vs filtered total Cases. Use ? Help for family meanings.
        </p>
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
        <p className="mt-1 text-[11px] text-zinc-600">
          Denominator = No Entry Cases in filtered universe (
          {caseView.aggregate.noEntryUniverse}). Good Filter vs Missed /
          Over-Optimized Entry — equations, not narrative. Later price alone does
          not prove a missed entry.
        </p>
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
        <p className="mt-1 text-[11px] text-zinc-600">
          Priority queue: missing T0, over-optimization suspicion, D failures,
          UNLINKED thesis/playbook. Open Case Review for equation evidence.
        </p>
        {casesForReview.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No review priorities in filter.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Case</th>
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
                    <td className="px-2 py-2 text-xs text-zinc-200">
                      {familyChip(row)}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-400">
                      {!row.t0Available
                        ? "Missing T0"
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
                    <td className="px-2 py-2">
                      <Link
                        href={row.caseHref}
                        className="text-violet-400 hover:underline"
                      >
                        Case
                      </Link>
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
                  <dt className="text-zinc-500">Realized R</dt>
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
                Counterfactual performance (Scout — not P/L)
              </h2>
              <p className="mt-1 text-[11px] text-zinc-600">
                Counterfactual R is hypothetical plan-path magnitude. It is not
                realized P/L, not Decision Quality, and not proof that a No Entry
                was wrong.
              </p>
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
            <p className="mt-1 text-[11px] text-zinc-600">
              Case family rates by playbook from the filtered Case spine. Zero
              evaluable Cases is valid when evidence is insufficient — no
              manufactured rates.
            </p>
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

          {/* Unified Case drill-down */}
          <section data-case-drilldown>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Case drill-down
            </h2>
            <p className="mt-1 text-[11px] text-zinc-600">
              Showing {caseView.rows.length}{" "}
              {caseView.rows.length === 1 ? "Case" : "Cases"} (filtered). Family and
              Diagnosis stay distinct. Record opens Case Review.
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
                      <th className="px-3 py-2 font-medium">Family</th>
                      <th className="px-3 py-2 font-medium">Diagnosis</th>
                      <th className="px-3 py-2 font-medium">DQ</th>
                      <th className="px-3 py-2 font-medium">EQ</th>
                      <th className="px-3 py-2 font-medium">Reality</th>
                      <th className="px-3 py-2 font-medium">Linkage</th>
                      <th className="px-3 py-2 font-medium">Outcome</th>
                      <th className="px-3 py-2 font-medium">Realized</th>
                      <th className="px-3 py-2 font-medium">Counterfactual</th>
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
                        <td className="px-3 py-2">
                          <Link
                            href={row.caseHref}
                            className="text-violet-400 hover:text-violet-300 hover:underline"
                            data-case-drill-href={row.caseHref}
                          >
                            Case
                          </Link>
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
                    <th className="px-3 py-2 font-medium">Realized</th>
                    <th className="px-3 py-2 font-medium">Counterfactual</th>
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
