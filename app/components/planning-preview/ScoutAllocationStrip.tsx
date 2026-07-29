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
      ? `/planning/capital/allocation?selected=${encodeURIComponent(
          selectionOrder.join(",")
        )}`
      : "/planning/capital/allocation";

  const selectedCount = selectionOrder.length;

  return (
    <section
      className="rounded-xl border border-sky-500/30 bg-sky-950/20 px-3 py-2"
      data-scout-allocation-strip
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-sky-100">
          <span className="font-semibold text-sky-200">Allocation</span>
          <span className="mx-1.5 opacity-40">·</span>
          <span>
            Selected {selectedCount}
            <span className="mx-1 opacity-40">·</span>
            Total selected {money(simulation.totalSelectedExposure)}
            <span className="mx-1 opacity-40">·</span>
            Capital left {money(simulation.remainingCapital)}
            <span className="mx-1 opacity-40">·</span>
            Risk left {money(simulation.remainingRiskRoom)}
          </span>
          {selectedCount > 0 ? (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-300/80">
              {SCOUT_ALLOCATION_PORTFOLIO_LABELS[simulation.portfolioStatus]}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={boardHref}
            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-100 hover:bg-sky-500/20"
          >
            Review selection
          </Link>
          <button
            type="button"
            onClick={clear}
            disabled={selectedCount === 0}
            className="rounded-md border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
          <Link
            href={boardHref}
            className="rounded-md border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Open Board
          </Link>
        </div>
      </div>
    </section>
  );
}
