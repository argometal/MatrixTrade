"use client";

import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  buildLayeredEntryScenarios,
  formatLayeredEntrySummary,
  getExecutionExperimentContext,
  getHighestLimitPrice,
} from "@/lib/layered-entry";
import {
  LAYERED_ENTRY_STATUS_LABELS,
  type LayeredEntryPlan,
} from "@/lib/layered-entry-types";
import { computePlannedRR } from "@/lib/plan-risk";

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function LayeredEntryBadge({ entry }: { entry: LayeredEntryPlan }) {
  return (
    <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-300">
      {LAYERED_ENTRY_STATUS_LABELS[entry.status]}
    </span>
  );
}

export function LayeredEntryPanel({
  plan,
  playbook,
  compact = false,
}: {
  plan: TradePlan;
  playbook?: Playbook;
  compact?: boolean;
}) {
  const entry = plan.layeredEntry;
  if (!entry) return null;

  const scenarios = buildLayeredEntryScenarios(entry.limits);
  const highestLimit = getHighestLimitPrice(entry);
  const experiment = getExecutionExperimentContext(playbook);
  const filledCount = entry.limits.filter((l) => l.filled).length;
  const isMissed = entry.status === "missed";

  return (
    <div
      className={`rounded-xl border bg-teal-950/10 ${
        isMissed
          ? "border-amber-500/40"
          : compact
            ? "border-teal-500/20 p-3"
            : "border-teal-500/20 p-4"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={`font-medium text-teal-200 ${compact ? "text-xs" : "text-sm"}`}>
          Layered entry · R / risk
        </p>
        <LayeredEntryBadge entry={entry} />
        <span className="text-xs text-zinc-500">
          {entry.executionMethod.replace(/_/g, " ")}
          {entry.authorizedRiskAmount !== undefined
            ? ` · risk $${entry.authorizedRiskAmount}`
            : ""}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Proposed by human/AI · MtA-calculated R and risk · Final human approval required
      </p>

      {isMissed ? (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          Missed — no chase. All limits failed. Trade cancelled per experiment rule.
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-200/80">
          {experiment?.noChaseRule ??
            "No chase — if all predefined limits miss, trade is cancelled."}
          {highestLimit !== undefined ? (
            <span className="block mt-1 text-zinc-500">
              Highest limit: {formatPrice(highestLimit)} — miss this = trade over
            </span>
          ) : null}
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead>
            <tr className="text-zinc-500">
              <th className="pb-2 pr-3 font-medium">Role</th>
              <th className="pb-2 pr-3 font-medium">Entry</th>
              <th className="pb-2 pr-3 font-medium">Stop</th>
              <th className="pb-2 pr-3 font-medium">Alloc</th>
              <th className="pb-2 pr-3 font-medium">Risk $</th>
              <th className="pb-2 pr-3 font-medium">R</th>
              <th className="pb-2 font-medium">Fill</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {entry.limits.map((limit, index) => (
              <tr key={`${limit.price}-${index}`} className="border-t border-zinc-800/80">
                <td className="py-2 pr-3">
                  {limit.role ?? `L${index + 1}`}
                  {limit.confidence ? (
                    <span className="ml-1 text-zinc-600">{limit.confidence}</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3 font-mono">{formatPrice(limit.price)}</td>
                <td className="py-2 pr-3 font-mono">
                  {formatPrice(limit.stopPrice ?? entry.commonStopPrice ?? plan.stopPrice)}
                </td>
                <td className="py-2 pr-3 tabular-nums text-zinc-500">
                  {limit.allocationPercent}%
                  {entry.sizingMode === "risk_percent" ? " risk" : " pos"}
                </td>
                <td className="py-2 pr-3 tabular-nums text-zinc-500">
                  {limit.derived?.plannedRiskAmount !== undefined
                    ? `$${limit.derived.plannedRiskAmount.toFixed(0)}`
                    : "—"}
                </td>
                <td className="py-2 pr-3 font-mono text-teal-300/90">
                  {limit.derived?.rr !== undefined ? `${limit.derived.rr.toFixed(2)}R` : "—"}
                </td>
                <td className="py-2">
                  {limit.filled ? (
                    <span className="text-emerald-400">Filled</span>
                  ) : entry.status === "missed" ? (
                    <span className="text-amber-400/80">Missed</span>
                  ) : (
                    <span className="text-zinc-600">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Projected outcomes (same thesis)
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-zinc-400">
            {scenarios.map((scenario) => {
              const rr =
                scenario.limitsFilled > 0 &&
                plan.stopPrice !== undefined &&
                plan.targetPrice !== undefined
                  ? computePlannedRR(
                      scenario.averageEntry,
                      plan.stopPrice,
                      plan.targetPrice
                    )?.rr
                  : undefined;
              return (
                <li key={scenario.label} className="flex flex-wrap justify-between gap-2">
                  <span>{scenario.label}</span>
                  <span className="font-mono text-zinc-500">
                    {scenario.limitsFilled > 0
                      ? `avg ${formatPrice(scenario.averageEntry)} · ${scenario.capitalPercent}%`
                      : "no trade"}
                    {rr !== undefined ? ` · ${rr.toFixed(1)}R` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {(entry.averageEntry !== undefined || entry.fillPercent !== undefined) && (
        <p className="mt-3 text-xs text-zinc-400">
          Live: {formatLayeredEntrySummary(entry)}
          {entry.entryImprovementVsFirst !== undefined && entry.entryImprovementVsFirst > 0
            ? ` · +${entry.entryImprovementVsFirst.toFixed(2)} vs L1`
            : ""}
        </p>
      )}

      {!compact && filledCount > 0 && filledCount < entry.limits.length ? (
        <p className="mt-2 text-xs text-teal-300/80">
          Partial fill ({filledCount}/{entry.limits.length}) — same thesis, better avg entry
        </p>
      ) : null}

      {!compact && experiment ? (
        <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-950/20 p-3 text-xs">
          <p className="font-semibold text-violet-300">Execution experiment</p>
          {experiment.hypothesis ? (
            <p className="mt-1 text-zinc-400">{experiment.hypothesis}</p>
          ) : null}
          {experiment.metrics?.length ? (
            <p className="mt-2 text-zinc-600">
              Track after 20–30 trades: {experiment.metrics.slice(0, 5).join(" · ")}
              {experiment.metrics.length > 5 ? " · …" : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
