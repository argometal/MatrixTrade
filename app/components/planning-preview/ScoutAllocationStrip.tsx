"use client";

import Link from "next/link";
import { SCOUT_ALLOCATION_PORTFOLIO_LABELS } from "@/lib/scout-allocation-types";
import { useScoutAllocationSelection } from "./ScoutAllocationProvider";

function money(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "Unconfigured";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ScoutAllocationStrip() {
  const { selectionOrder, simulation, clear } = useScoutAllocationSelection();

  const boardHref =
    selectionOrder.length > 0
      ? `/mxt/scout/capital/allocation?selected=${encodeURIComponent(
          selectionOrder.join(",")
        )}`
      : "/mxt/scout/capital/allocation";

  const selectedCount = selectionOrder.length;

  return (
    <section
      className="rounded-xl border border-sky-500/20 bg-sky-950/10 px-3 py-2"
      data-scout-allocation-strip
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Allocation</span>
          <span className="mx-1.5 text-zinc-700">·</span>
          <span>
            Selected {selectedCount}
            <span className="mx-1 text-zinc-700">·</span>
            Total {money(simulation.totalSelectedExposure)}
            <span className="mx-1 text-zinc-700">·</span>
            Capital left {money(simulation.remainingCapital)}
            <span className="mx-1 text-zinc-700">·</span>
            Risk left {money(simulation.remainingRiskRoom)}
          </span>
          {selectedCount > 0 ? (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-300/70">
              {SCOUT_ALLOCATION_PORTFOLIO_LABELS[simulation.portfolioStatus]}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <Link
            href={boardHref}
            className="text-sky-300/90 hover:text-sky-200 hover:underline"
          >
            Allocation Board
          </Link>
          <button
            type="button"
            onClick={clear}
            disabled={selectedCount === 0}
            className="text-zinc-500 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
