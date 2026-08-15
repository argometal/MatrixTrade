"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GuestLockDateField } from "@/app/components/settings/GuestLockDateField";
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

function formatR(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function tone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-300";
}

export type PipelinePerformancePlaybookOption = {
  id: string;
  name: string;
};

export function PreviewPipelinePerformance({
  input,
  playbooks,
}: {
  input: Omit<PipelinePerformanceInput, "filters">;
  playbooks: PipelinePerformancePlaybookOption[];
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

  const tickers = useMemo(() => {
    const set = new Set<string>();
    for (const lo of input.learningOutcomes) set.add(lo.ticker.toUpperCase());
    for (const p of input.plans) set.add(p.ticker.toUpperCase());
    for (const t of input.trades) set.add(t.ticker.toUpperCase());
    return [...set].sort();
  }, [input]);

  return (
    <div
      className="space-y-6 px-4 py-4 lg:px-6 lg:py-6"
      data-insights-pipeline-performance
    >
      <p className="text-sm text-zinc-500">
        Pipeline component results across executed trades and Scout outcomes.
        Realized P/L stays separate from counterfactual Scout R. Missed Scouts
        are never counted as Trade wins or losses.
      </p>
      <p className="text-[11px] text-zinc-600">
        Future note: Mistakes may become a cross-tab filter instead of a full
        Insights tab.
      </p>

      <section
        className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-2 lg:grid-cols-3"
        data-pipeline-filters
      >
        <GuestLockDateField
          name="pipelineFrom"
          label="From"
          value={from}
          onChange={setFrom}
          max={to || undefined}
        />
        <GuestLockDateField
          name="pipelineTo"
          label="To"
          value={to}
          onChange={setTo}
          min={from || undefined}
        />
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

      {view.empty ? (
        <p
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500"
          data-pipeline-empty
        >
          No drill-down rows match these filters. Summary counts below still show
          (zeros when empty). Record Learning Outcomes or plan outcomes to fill
          the table.
        </p>
      ) : null}

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

      {!view.empty ? (
        <>
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
                  <dd className={`tabular-nums ${tone(view.realized.realizedRSum)}`}>
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
                  <dt className="text-zinc-500">Missed opportunities</dt>
                  <dd
                    className="tabular-nums text-zinc-100"
                    data-pipeline-missed-opportunity-count
                  >
                    {view.counterfactual.missedOpportunityCount}
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
                . Triggered-without-Trade and thesis rates are Scout/MAF metrics — never
                Trade P/L.
              </p>
            </div>
          </section>

          <section data-pipeline-components>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Component attribution distribution
            </h2>
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

          <section data-pipeline-drilldown>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Drill-down
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
                      data-learning-outcome-id={row.learningOutcomeId ?? ""}
                      data-trade-id={row.tradeId ?? ""}
                      data-plan-id={row.planId ?? ""}
                      data-observation-id={row.observationId ?? ""}
                      data-maf-id={row.mafExperimentId ?? ""}
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
                          data-pipeline-drill-href={row.href}
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
