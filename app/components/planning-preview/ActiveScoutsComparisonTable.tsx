"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TradePlan } from "@/lib/plan-types";
import {
  buildActiveScoutMonetaryRows,
  formatPotentialR,
  formatReturnOnCapitalPercent,
  formatUsdMoney,
  sortScoutMonetaryRows,
  type ScoutMonetarySortKey,
} from "@/lib/scout-monetary-metrics";

const SORT_OPTIONS: Array<{ key: ScoutMonetarySortKey; label: string }> = [
  { key: "ticker", label: "Ticker" },
  { key: "potentialR", label: "R potencial" },
  { key: "potentialProfit", label: "Ganancia potencial" },
  { key: "assignedLoss", label: "Pérdida asignada" },
  { key: "returnOnCapitalPercent", label: "Retorno sobre capital" },
  { key: "capitalRequired", label: "Capital requerido" },
];

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export function ActiveScoutsComparisonTable({ plans }: { plans: TradePlan[] }) {
  const [sortKey, setSortKey] = useState<ScoutMonetarySortKey>("ticker");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const built = buildActiveScoutMonetaryRows(plans);
    return sortScoutMonetaryRows(built, sortKey, direction);
  }, [plans, sortKey, direction]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Scouts activos — comparación</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            R potencial, ganancia potencial y pérdida asignada son métricas separadas. Sin orden
            automático solo por R.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="scout-money-sort" className="text-[11px] text-zinc-500">
            Ordenar por
          </label>
          <select
            id="scout-money-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as ScoutMonetarySortKey)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            aria-label={direction === "asc" ? "Ascending" : "Descending"}
          >
            {direction === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-3">Ticker</th>
              <th className="pb-2 pr-3">Plan</th>
              <th className="pb-2 pr-3">Entrada / avg</th>
              <th className="pb-2 pr-3">Target</th>
              <th className="pb-2 pr-3">Stop</th>
              <th className="pb-2 pr-3">Capital requerido</th>
              <th className="pb-2 pr-3">Pérdida asignada</th>
              <th className="pb-2 pr-3">Ganancia potencial</th>
              <th className="pb-2 pr-3">R potencial</th>
              <th className="pb-2">Retorno sobre capital</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((row) => (
              <tr key={`${row.planId}-${row.ticker}`} className="border-t border-zinc-800/80">
                <td className="py-2 pr-3 font-medium text-zinc-100">{row.ticker}</td>
                <td className="py-2 pr-3">
                  <Link
                    href={`/planning?plan=${encodeURIComponent(row.planId)}`}
                    className="text-violet-300 hover:underline"
                  >
                    {row.planLabel}
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums">{formatPrice(row.entry)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{formatPrice(row.target)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{formatPrice(row.stop)}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">
                  {formatUsdMoney(row.capitalRequired)}
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums">
                  {formatUsdMoney(row.assignedLoss)}
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums">
                  {formatUsdMoney(row.potentialProfit)}
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums text-teal-300/90">
                  {formatPotentialR(row.potentialR)}
                </td>
                <td className="py-2 font-mono tabular-nums">
                  {formatReturnOnCapitalPercent(row.returnOnCapitalPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
