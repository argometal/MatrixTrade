"use client";

/**
 * AF-safe level snapshot — CHANGE 24-47: counts are actionable filters.
 */

import { AF_LABEL, AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";
import type { levelSnapshot } from "@/lib/argusforge/af03-repo-store";

type Snapshot = ReturnType<typeof levelSnapshot>;

export type SnapshotActionKey = "realms" | "decks" | "fragments" | "empty";

type Bar = {
  key: keyof Pick<Snapshot, "folders" | "decks" | "items" | "emptyDecks">;
  action: SnapshotActionKey;
  label: string;
  color: string;
};

const BARS: Bar[] = [
  { key: "folders", action: "realms", label: AF_LABEL.realms, color: "bg-sky-500" },
  { key: "decks", action: "decks", label: AF_LABEL.chaosDecks, color: "bg-rose-500" },
  { key: "items", action: "fragments", label: AF_LABEL.fragments, color: "bg-amber-500" },
  { key: "emptyDecks", action: "empty", label: "Empty", color: "bg-zinc-500" },
];

type Props = {
  snapshot: Snapshot;
  activeAction?: SnapshotActionKey | null;
  onSelect?: (action: SnapshotActionKey) => void;
  onClear?: () => void;
};

export function LevelSnapshotChart({
  snapshot,
  activeAction = null,
  onSelect,
  onClear,
}: Props) {
  const max = Math.max(1, ...BARS.map((b) => snapshot[b.key]));

  return (
    <section aria-labelledby="level-snapshot-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="level-snapshot-heading" className="text-base font-semibold text-zinc-100">
          Level snapshot
        </h3>
        {activeAction && onClear ? (
          <button
            type="button"
            className="text-[11px] font-medium text-emerald-400/90"
            onClick={onClear}
          >
            Show all
          </button>
        ) : null}
      </div>
      <p className={`text-[11px] ${AF_TEXT.metadata}`}>Tap a count to filter this level.</p>
      <div className="flex items-end justify-between gap-1.5 border-b border-zinc-800 pb-2 pt-1">
        {BARS.map((b) => {
          const value = snapshot[b.key];
          const heightPct = value === 0 ? 0 : Math.max(8, Math.round((value / max) * 100));
          const active = activeAction === b.action;
          const disabled = value === 0 || !onSelect;
          return (
            <button
              key={b.key}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect?.(b.action)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-default ${
                active ? "bg-zinc-800/80" : "hover:bg-zinc-900/60 disabled:hover:bg-transparent"
              }`}
              title={value === 0 ? `${b.label}: none` : `Filter ${b.label}`}
            >
              <span className="text-[11px] font-semibold tabular-nums text-zinc-200">
                {value > 0 ? value : "—"}
              </span>
              <div className="flex h-20 w-full items-end justify-center">
                {value > 0 ? (
                  <div
                    className={`w-[70%] max-w-8 rounded-sm ${b.color}`}
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className={`h-0.5 w-[70%] max-w-8 rounded-full ${b.color} opacity-40`} />
                )}
              </div>
              <span className={`truncate text-[10px] ${AF_TEXT.metadata}`}>{b.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
