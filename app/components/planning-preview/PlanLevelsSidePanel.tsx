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
    <aside
      className="flex min-h-0 w-full flex-1 flex-col border-t border-zinc-800 bg-zinc-950/95 lg:max-h-none lg:w-[min(400px,38%)] lg:flex-none lg:border-l lg:border-t-0"
      aria-label={`Plan map for ${view.ticker}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            {view.ticker} · {view.planId ?? "Plan"}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          aria-label="Cerrar mapa del plan"
        >
          Ocultar
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3">
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
    view.executableRR !== undefined && view.executableRR !== null
      ? `${view.executableRR.toFixed(1)}R`
      : view.plannedRR !== undefined
        ? `${view.plannedRR.toFixed(1)}R plan`
        : null;

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
      {open ? "Ocultar mapa" : "Mapa del plan"}
      {rr ? <span className="ml-1.5 opacity-70">· {rr}</span> : null}
    </button>
  );
}

export function PlanMapSummaryLine({ view }: { view: PlanLevelsView }) {
  const parts: string[] = [];
  if (view.layeredEntry) {
    parts.push(`${view.layeredEntry.plan.limits.length} layers`);
  }
  if (view.operationalState) {
    parts.push(view.operationalState.replace(/_/g, " "));
  }
  if (view.nextAction) parts.push(view.nextAction.replace(/_/g, " "));
  if (view.executableRR !== undefined && view.executableRR !== null) {
    parts.push(`Executable ${view.executableRR.toFixed(1)}R`);
  } else if (view.plannedRR !== undefined) {
    parts.push(`Reference ${view.plannedRR.toFixed(1)}R`);
  }
  if (view.minRR !== undefined) parts.push(`min ${view.minRR}R`);
  if (parts.length === 0) return null;
  return <span>{parts.join(" · ")}</span>;
}
