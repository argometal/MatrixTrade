import type { PlanLevelRow, PlanLevelsView } from "@/lib/plan-levels-board";

const rowStyles: Record<
  NonNullable<PlanLevelRow["emphasis"]>,
  { bar: string; text: string; label: string }
> = {
  primary: {
    bar: "bg-violet-500",
    text: "text-violet-200",
    label: "text-violet-400",
  },
  danger: {
    bar: "bg-red-500",
    text: "text-red-300",
    label: "text-red-400",
  },
  success: {
    bar: "bg-emerald-500",
    text: "text-emerald-300",
    label: "text-emerald-400",
  },
  muted: {
    bar: "bg-zinc-600",
    text: "text-zinc-400",
    label: "text-zinc-500",
  },
};

function LevelRow({ row }: { row: PlanLevelRow }) {
  const style = rowStyles[row.emphasis ?? "muted"];
  return (
    <div className="flex items-stretch gap-3">
      <div className={`mt-1 h-full min-h-[2.5rem] w-1 rounded-full ${style.bar}`} />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${style.label}`}>
            {row.label}
          </p>
          <p className={`font-mono text-sm font-semibold ${style.text}`}>{row.value}</p>
        </div>
        {row.detail ? <p className="mt-0.5 text-xs text-zinc-500">{row.detail}</p> : null}
      </div>
    </div>
  );
}

export function PlanLevelsBoard({
  view,
  compact = false,
}: {
  view: PlanLevelsView;
  compact?: boolean;
}) {
  if (view.rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No levels defined yet — add them via Stock Profile or a scout plan.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Strategy</p>
        <p className="mt-1 text-sm text-zinc-200">{view.strategy}</p>
      </div>

      <div className="space-y-1 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        {view.rows.map((row) => (
          <LevelRow key={`${row.kind}-${row.label}`} row={row} />
        ))}
      </div>

      <div className={`grid gap-2 text-xs ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {view.plannedRR !== undefined ? (
          <p className="rounded-lg bg-zinc-900 px-3 py-2 text-zinc-300">
            Plan R:R <span className="font-semibold text-emerald-400">{view.plannedRR.toFixed(1)}R</span>
          </p>
        ) : null}
        {view.minRR !== undefined ? (
          <p className="rounded-lg bg-zinc-900 px-3 py-2 text-zinc-300">
            Min R:R <span className="font-semibold">{view.minRR}R</span>
          </p>
        ) : null}
        {view.invalidation ? (
          <p className="rounded-lg bg-zinc-900 px-3 py-2 text-zinc-400 sm:col-span-2">
            <span className="text-red-400">Stop rule · </span>
            {view.invalidation}
          </p>
        ) : null}
        {view.window ? (
          <p className="rounded-lg bg-zinc-900 px-3 py-2 text-zinc-400">
            Window · {view.window}
          </p>
        ) : null}
      </div>

      {view.source === "profile" ? (
        <p className="text-xs text-amber-500/80">
          Profile levels only — log a scout plan to pin entry, stop, and target for this window.
        </p>
      ) : null}
    </div>
  );
}
