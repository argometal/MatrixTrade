"use client";

import type { PlanLevelsView } from "@/lib/plan-levels-board";
import { PlanLevelsBoard } from "./PlanLevelsBoard";

export function PlanLevelsSidePanel({
  view,
  open,
  onClose,
  subtitle,
}: {
  view: PlanLevelsView | null;
  open: boolean;
  onClose: () => void;
  subtitle?: string;
}) {
  if (!open || !view) return null;

  return (
    <aside className="flex max-h-[min(42vh,22rem)] min-h-0 w-full shrink-0 flex-col border-t border-zinc-800 bg-zinc-950/90 lg:max-h-none lg:w-[min(400px,38%)] lg:border-l lg:border-t-0">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Plan map · {view.ticker}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {subtitle ?? "Entry, zones, stop, target — collapsible viewer"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          aria-label="Close plan map"
        >
          Hide
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <PlanLevelsBoard view={view} />
      </div>
    </aside>
  );
}

export function PlanMapToggleButton({
  open,
  onClick,
  view,
}: {
  open: boolean;
  onClick: () => void;
  view: PlanLevelsView | null;
}) {
  if (!view || view.rows.length === 0) return null;

  const rr =
    view.plannedRR !== undefined ? `${view.plannedRR.toFixed(1)}R plan` : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
        open
          ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }`}
    >
      {open ? "Hide plan map" : "Plan map"}
      {rr ? <span className="ml-1.5 opacity-70">· {rr}</span> : null}
    </button>
  );
}

export function PlanMapSummaryLine({ view }: { view: PlanLevelsView }) {
  const parts: string[] = [];
  if (view.layeredEntry) {
    parts.push(`${view.layeredEntry.plan.limits.length} limits`);
    if (view.layeredEntry.highestLimit !== undefined) {
      parts.push(`no chase above $${view.layeredEntry.highestLimit.toFixed(2)}`);
    }
  }
  if (view.plannedRR !== undefined) {
    parts.push(`Plan ${view.plannedRR.toFixed(1)}R (strategy stop)`);
  }
  if (view.minRR !== undefined) parts.push(`min ${view.minRR}R`);
  if (parts.length === 0) return null;
  return <span>{parts.join(" · ")}</span>;
}
