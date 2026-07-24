"use client";

import Link from "next/link";
import {
  ARGUS_RELATION_TYPES,
  ARGUS_UNIT_TYPES,
  type ArgusGroup,
  type ArgusRelation,
  type ArgusRelationType,
  type ArgusUnit,
  type ArgusUnitType,
} from "@/lib/argusforge/argus-graph-types";

type Props = {
  selectedIds: string[];
  unit: ArgusUnit | null;
  relations: ArgusRelation[];
  unitsById: Map<string, ArgusUnit>;
  groups: ArgusGroup[];
  onClearSelection: () => void;
  onRemoveRelation: (relationId: string) => void;
  onSetUnitType: (unitId: string, type: ArgusUnitType) => void;
  onSetRelationType: (relationId: string, type: ArgusRelationType) => void;
  onCreateGroup: () => void;
  onRenameGroup: (groupId: string, label: string) => void;
  onToggleCollapse: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
};

export function ArgusSelectionPanel({
  selectedIds,
  unit,
  relations,
  unitsById,
  groups,
  onClearSelection,
  onRemoveRelation,
  onSetUnitType,
  onSetRelationType,
  onCreateGroup,
  onRenameGroup,
  onToggleCollapse,
  onRemoveGroup,
}: Props) {
  const multi = selectedIds.length > 1;

  if (selectedIds.length === 0) {
    return (
      <aside className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-500">
        <p>Select a unit. Shift/Cmd+click for multi-select. Drag handles to relate.</p>
        {groups.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Groups
            </p>
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.id} className="rounded-lg border border-zinc-800 px-2 py-2">
                  <input
                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                    value={g.label}
                    onChange={(e) => onRenameGroup(g.id, e.target.value)}
                    aria-label="Group label"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wide text-zinc-400"
                      onClick={() => onToggleCollapse(g.id)}
                    >
                      {g.collapsed ? "Expand" : "Collapse"}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wide text-red-400/80"
                      onClick={() => onRemoveGroup(g.id)}
                    >
                      Remove group
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-600">{g.memberIds.length} members</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    );
  }

  if (multi) {
    return (
      <aside
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
        aria-label="Multi-selection"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Selected
            </p>
            <p className="text-sm font-semibold text-zinc-50">{selectedIds.length} units</p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
        <button
          type="button"
          onClick={onCreateGroup}
          className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-100"
        >
          Create group from selection
        </button>
        <ul className="max-h-40 space-y-1 overflow-auto text-xs text-zinc-400">
          {selectedIds.map((id) => (
            <li key={id} className="truncate">
              {unitsById.get(id)?.label ?? id}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (!unit) {
    return (
      <aside className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-500">
        Selection unavailable (filtered or collapsed).
        <button type="button" onClick={onClearSelection} className="mt-2 block text-xs text-sky-400">
          Clear
        </button>
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

      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Type
        </span>
        <select
          className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          value={unit.unitType}
          onChange={(e) => onSetUnitType(unit.id, e.target.value as ArgusUnitType)}
        >
          {ARGUS_UNIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs leading-relaxed text-zinc-400">{unit.preview}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
        <dt className="text-zinc-600">Source</dt>
        <dd className="text-zinc-300">{unit.source}</dd>
        <dt className="text-zinc-600">Kind</dt>
        <dd className="text-zinc-300">{unit.kind}</dd>
        <dt className="text-zinc-600">Manual type</dt>
        <dd className="text-zinc-300">{unit.typeManual ? "yes" : "no"}</dd>
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
          <p className="text-xs text-zinc-600">None — connect handles on the graph.</p>
        ) : (
          <ul className="space-y-2">
            {linked.map((r) => {
              const otherId = r.sourceUnitId === unit.id ? r.targetUnitId : r.sourceUnitId;
              const other = unitsById.get(otherId);
              return (
                <li key={r.id} className="rounded-lg border border-zinc-800 px-2 py-2">
                  <p className="truncate text-xs text-zinc-300">→ {other?.label ?? otherId}</p>
                  <select
                    className="mt-1 min-h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-zinc-200"
                    value={r.type}
                    onChange={(e) =>
                      onSetRelationType(r.id, e.target.value as ArgusRelationType)
                    }
                  >
                    {ARGUS_RELATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveRelation(r.id)}
                    className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500 hover:text-red-400"
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
