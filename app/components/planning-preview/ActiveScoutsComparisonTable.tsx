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
import {
  SCOUT_ALLOCATION_FUNDING_LABELS,
  SCOUT_ALLOCATION_RELATIONSHIP_LABELS,
} from "@/lib/scout-allocation-types";
import { useScoutAllocationSelection } from "./ScoutAllocationProvider";

const SORT_OPTIONS: Array<{ key: ScoutMonetarySortKey; label: string }> = [
  { key: "ticker", label: "Ticker" },
  { key: "potentialR", label: "R potencial" },
  { key: "potentialProfit", label: "Ganancia potencial" },
  { key: "assignedLoss", label: "Pérdida asignada" },
  { key: "returnOnCapitalPercent", label: "Retorno sobre capital" },
  { key: "capitalRequired", label: "Capital requerido" },
];

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "Unconfigured";
  return `$${value.toFixed(2)}`;
}

function moneyField(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "Unconfigured";
  return formatUsdMoney(value);
}

export function ActiveScoutsComparisonTable({
  plans,
  onFocusPlan,
}: {
  plans: TradePlan[];
  onFocusPlan?: (planId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<ScoutMonetarySortKey>("ticker");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const {
    impactsByPlanId,
    isSelected,
    add,
    remove,
    move,
    selectionOrder,
    candidates,
    relationshipsFor,
  } = useScoutAllocationSelection();

  const rows = useMemo(() => {
    const built = buildActiveScoutMonetaryRows(plans);
    return sortScoutMonetaryRows(built, sortKey, direction);
  }, [plans, sortKey, direction]);

  const candidateById = useMemo(
    () => new Map(candidates.map((c) => [c.planId, c])),
    [candidates]
  );

  const focusId = selectionOrder[0];
  const pairs = useMemo(
    () => (focusId ? relationshipsFor(focusId) : []),
    [focusId, relationshipsFor]
  );
  const relationshipByOtherPlanId = useMemo(() => {
    const m = new Map<string, (typeof pairs)[number]>();
    for (const p of pairs) m.set(p.otherPlanId, p);
    return m;
  }, [pairs]);

  if (rows.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
      data-scout-compare-allocation
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">
            Scouts activos — comparación
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Funding before/after selection and relationship from the shared
            allocation simulator.
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

      {/* Mobile cards */}
      <ul className="mt-4 space-y-2 md:hidden">
        {rows.map((row) => {
          const impact = impactsByPlanId.get(row.planId);
          const cand = candidateById.get(row.planId);
          const selected = isSelected(row.planId);
          const order = selectionOrder.indexOf(row.planId);
          return (
            <li
              key={`${row.planId}-m`}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">
                  {row.ticker}{" "}
                  <span className="text-zinc-500">{row.planId}</span>
                </span>
                {selected ? (
                  <span className="text-[10px] text-emerald-300">
                    Selected #{order + 1}
                  </span>
                ) : null}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-zinc-400">
                <div>
                  <dt>Capital</dt>
                  <dd className="text-zinc-200">
                    {moneyField(row.capitalRequired)}
                  </dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd className="text-zinc-200">
                    {moneyField(row.assignedLoss)}
                  </dd>
                </div>
                <div>
                  <dt>Funding now</dt>
                  <dd className="text-zinc-200">
                    {cand
                      ? SCOUT_ALLOCATION_FUNDING_LABELS[cand.fundingDecision]
                      : "Unassessed"}
                  </dd>
                </div>
                <div>
                  <dt>After selection</dt>
                  <dd className="text-zinc-200">
                    {impact
                      ? SCOUT_ALLOCATION_FUNDING_LABELS[impact.afterDecision]
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt>Relationship</dt>
                  <dd className="text-zinc-200">
                    {impact && row.planId !== focusId
                      ? relationshipByOtherPlanId.get(row.planId)
                        ? SCOUT_ALLOCATION_RELATIONSHIP_LABELS[
                            relationshipByOtherPlanId.get(row.planId)!.relationship
                          ]
                        : SCOUT_ALLOCATION_RELATIONSHIP_LABELS[impact.relationship]
                      : "Unassessed"}
                  </dd>
                </div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    selected ? remove(row.planId) : add(row.planId)
                  }
                  className="rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200"
                >
                  {selected ? "Remove" : "Add"}
                </button>
                {selected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => move(row.planId, "up")}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      onClick={() => move(row.planId, "down")}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300"
                    >
                      Move down
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => onFocusPlan?.(row.planId)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300"
                >
                  Focus
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-2">Sel</th>
              <th className="pb-2 pr-2">Ord</th>
              <th className="pb-2 pr-3">Ticker</th>
              <th className="pb-2 pr-3">Plan</th>
              <th className="pb-2 pr-3">Capital</th>
              <th className="pb-2 pr-3">Risk</th>
              <th className="pb-2 pr-3">R:R</th>
              <th className="pb-2 pr-3">Funding now</th>
              <th className="pb-2 pr-3">After</th>
              <th className="pb-2 pr-3">Relationship</th>
              <th className="pb-2 pr-3">Reservation</th>
              <th className="pb-2 pr-3">Blockers</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((row) => {
              const impact = impactsByPlanId.get(row.planId);
              const cand = candidateById.get(row.planId);
              const selected = isSelected(row.planId);
              const order = selectionOrder.indexOf(row.planId);
              return (
                <tr
                  key={`${row.planId}-${row.ticker}`}
                  className="border-t border-zinc-800/80"
                >
                  <td className="py-2 pr-2">{selected ? "●" : "○"}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {selected ? order + 1 : "—"}
                  </td>
                  <td className="py-2 pr-3 font-medium text-zinc-100">
                    {row.ticker}
                  </td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/mta/planning?plan=${encodeURIComponent(row.planId)}`}
                      className="text-violet-300 hover:underline"
                    >
                      {row.planId}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {moneyField(row.capitalRequired)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {moneyField(row.assignedLoss)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatPotentialR(row.potentialR)}
                  </td>
                  <td className="py-2 pr-3">
                    {cand
                      ? SCOUT_ALLOCATION_FUNDING_LABELS[cand.fundingDecision]
                      : "Unassessed"}
                  </td>
                  <td className="py-2 pr-3">
                    {impact
                      ? SCOUT_ALLOCATION_FUNDING_LABELS[impact.afterDecision]
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {impact && row.planId !== focusId
                      ? relationshipByOtherPlanId.get(row.planId)
                        ? SCOUT_ALLOCATION_RELATIONSHIP_LABELS[
                            relationshipByOtherPlanId.get(row.planId)!.relationship
                          ]
                        : SCOUT_ALLOCATION_RELATIONSHIP_LABELS[impact.relationship]
                      : "Unassessed"}
                  </td>
                  <td className="py-2 pr-3">
                    {cand?.existingReservationId ?? "—"}
                  </td>
                  <td className="py-2 pr-3 max-w-[10rem] truncate text-zinc-500">
                    {cand?.blockingReasons[0] ?? "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          selected ? remove(row.planId) : add(row.planId)
                        }
                        className="rounded border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-200"
                      >
                        {selected ? "Remove" : "Add"}
                      </button>
                      {selected ? (
                        <>
                          <button
                            type="button"
                            onClick={() => move(row.planId, "up")}
                            className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px]"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => move(row.planId, "down")}
                            className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px]"
                          >
                            ↓
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onFocusPlan?.(row.planId)}
                        className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px]"
                      >
                        Focus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 hidden text-[10px] text-zinc-600 md:block">
        Also: entrada {formatPrice(rows[0]?.entry)} · retorno{" "}
        {formatReturnOnCapitalPercent(rows[0]?.returnOnCapitalPercent ?? 0)}{" "}
        (see monetary columns in Scout metrics elsewhere).
      </p>
    </section>
  );
}
