"use client";

import Link from "next/link";
import type { ArgusRelation, ArgusUnit } from "@/lib/argusforge/argus-graph-types";

type Props = {
  unit: ArgusUnit | null;
  relations: ArgusRelation[];
  unitsById: Map<string, ArgusUnit>;
  onRemoveRelation: (relationId: string) => void;
  onClearSelection: () => void;
};

export function ArgusSelectionPanel({
  unit,
  relations,
  unitsById,
  onRemoveRelation,
  onClearSelection,
}: Props) {
  if (!unit) {
    return (
      <aside className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-500">
        Select a unit. Drag between handles to create a visible relation.
      </aside>
    );
  }

  const linked = relations.filter(
    (r) => r.sourceUnitId === unit.id || r.targetUnitId === unit.id
  );

  return (
    <aside
      className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
      aria-label="Selection"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Selected unit
          </p>
          <h3 className="truncate text-sm font-semibold text-zinc-50">{unit.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Clear
        </button>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">{unit.preview}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
        <dt className="text-zinc-600">Source</dt>
        <dd className="text-zinc-300">{unit.source}</dd>
        <dt className="text-zinc-600">Kind</dt>
        <dd className="text-zinc-300">{unit.kind}</dd>
        <dt className="text-zinc-600">Id</dt>
        <dd className="truncate font-mono text-zinc-500">{unit.id}</dd>
      </dl>

      {unit.source === "chaos" && unit.chaosDeckId && unit.chaosItemId ? (
        <Link
          href={`/forge/deck/${unit.chaosDeckId}/item/${unit.chaosItemId}`}
          className="inline-flex min-h-10 items-center text-xs font-medium text-sky-400 underline-offset-2 hover:underline"
        >
          Open in Chaos
        </Link>
      ) : (
        <p className="text-[11px] text-zinc-600">Demo unit — no Chaos source.</p>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Relations ({linked.length})
        </p>
        {linked.length === 0 ? (
          <p className="text-xs text-zinc-600">None yet — connect handles on the graph.</p>
        ) : (
          <ul className="space-y-1.5">
            {linked.map((r) => {
              const otherId = r.sourceUnitId === unit.id ? r.targetUnitId : r.sourceUnitId;
              const other = unitsById.get(otherId);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-2 py-1.5"
                >
                  <span className="truncate text-xs text-zinc-300">
                    link → {other?.label ?? otherId}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveRelation(r.id)}
                    className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
