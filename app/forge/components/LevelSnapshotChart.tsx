"use client";

import type { levelSnapshot } from "@/lib/argusforge/af03-repo-store";

type Snapshot = ReturnType<typeof levelSnapshot>;

type Bar = {
  key: keyof Pick<
    Snapshot,
    "folders" | "decks" | "items" | "emptyDecks" | "fresh" | "recentItems"
  >;
  label: string;
  color: string;
};

const BARS: Bar[] = [
  { key: "folders", label: "Folders", color: "bg-sky-500" },
  { key: "decks", label: "Decks", color: "bg-rose-500" },
  { key: "items", label: "Items", color: "bg-amber-500" },
  { key: "emptyDecks", label: "Empty", color: "bg-zinc-500" },
  { key: "fresh", label: "<7d", color: "bg-emerald-500" },
  { key: "recentItems", label: "New", color: "bg-cyan-400" },
];

/**
 * AF-safe level snapshot chart — real counts only, no due/grades/SRS.
 */
export function LevelSnapshotChart({ snapshot }: { snapshot: Snapshot }) {
  const max = Math.max(1, ...BARS.map((b) => snapshot[b.key]));

  return (
    <section aria-labelledby="level-snapshot-heading" className="space-y-3">
      <h3 id="level-snapshot-heading" className="text-base font-semibold text-zinc-100">
        Level snapshot
      </h3>
      <p className="text-[11px] text-zinc-500">
        Stored counts at this level — not review due, not Alexandria grades.
      </p>
      <div className="flex items-end justify-between gap-1.5 border-b border-zinc-800 pb-2 pt-1">
        {BARS.map((b) => {
          const value = snapshot[b.key];
          const heightPct = value === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
          return (
            <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[11px] font-semibold tabular-nums text-zinc-200">
                {value > 0 ? value : ""}
              </span>
              <div className="flex h-20 w-full items-end justify-center">
                {value > 0 ? (
                  <div
                    className={`w-[70%] max-w-8 rounded-sm ${b.color}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${b.label}: ${value}`}
                  />
                ) : (
                  <div className={`h-0.5 w-[70%] max-w-8 rounded-full ${b.color} opacity-40`} />
                )}
              </div>
              <span className="truncate text-[10px] text-zinc-500">{b.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-600">
        Archived decks (global): {snapshot.archivedDecksGlobal} · Older entities at level:{" "}
        {snapshot.older}
      </p>
    </section>
  );
}
