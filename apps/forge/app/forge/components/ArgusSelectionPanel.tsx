"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ARGUS_EVIDENCE_TYPES,
  ARGUS_RELATION_TYPES,
  type ArgusEvidenceType,
  type ArgusGroup,
  type ArgusRecurrenceCandidate,
  type ArgusRelation,
  type ArgusRelationType,
  type ArgusUnit,
} from "@/lib/argusforge/argus-graph-types";

type Props = {
  selectedIds: string[];
  unit: ArgusUnit | null;
  relations: ArgusRelation[];
  unitsById: Map<string, ArgusUnit>;
  groups: ArgusGroup[];
  recurrence: ArgusRecurrenceCandidate[];
  onClearSelection: () => void;
  onRemoveRelation: (relationId: string) => void;
  onSetEvidenceType: (unitId: string, type: ArgusEvidenceType) => void;
  onSetRelationType: (relationId: string, type: ArgusRelationType) => void;
  onSetUnitConfirmed: (unitId: string, confirmed: boolean) => void;
  onSetRelationConfirmed: (relationId: string, confirmed: boolean) => void;
  onAddTag: (unitId: string, tag: string) => void;
  onRemoveTag: (unitId: string, tag: string) => void;
  onAddTagToSelection: (tag: string) => void;
  onCreateGroup: () => void;
  onCreateRelationBetweenTwo: () => void;
  onExportSelection: (format: "json" | "md") => void;
  onRenameGroup: (groupId: string, label: string) => void;
  onToggleCollapse: (groupId: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onConfirmRecurrence: (id: string) => void;
  onDismissRecurrence: (id: string) => void;
  /** Chaos decks available as move targets for a Chaos-backed fragment unit. */
  deckMoveTargets?: Array<{ id: string; label: string }>;
  onMoveFragmentToDeck?: (chaosItemId: string, targetDeckId: string) => void;
};

export function ArgusSelectionPanel(props: Props) {
  const {
    selectedIds,
    unit,
    relations,
    unitsById,
    groups,
    recurrence,
    onClearSelection,
  } = props;
  const [tagDraft, setTagDraft] = useState("");
  const multi = selectedIds.length > 1;
  const openRecurrence = recurrence.filter((c) => c.status === "open");

  if (selectedIds.length === 0) {
    return (
      <aside className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-500">
        <p className="text-xs">Select units. Shift/Cmd+click multi. Connect handles to relate.</p>
        {openRecurrence.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
              Recurrence ({openRecurrence.length})
            </p>
            <ul className="max-h-48 space-y-2 overflow-auto">
              {openRecurrence.map((c) => (
                <li key={c.id} className="rounded-lg border border-zinc-800 px-2 py-2 text-xs">
                  <p className="text-zinc-300">{c.reason}</p>
                  <p className="text-[10px] text-zinc-500">
                    {c.confidence} ·{" "}
                    {c.unitIds.map((id) => unitsById.get(id)?.label ?? id).join(", ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[10px] uppercase text-emerald-400"
                      onClick={() => props.onConfirmRecurrence(c.id)}
                    >
                      Confirm + repeats
                    </button>
                    <button
                      type="button"
                      className="text-[10px] uppercase text-zinc-500"
                      onClick={() => props.onDismissRecurrence(c.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {groups.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Groups
            </p>
            {groups.map((g) => (
              <div key={g.id} className="rounded-lg border border-zinc-800 px-2 py-2">
                <input
                  className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                  value={g.label}
                  onChange={(e) => props.onRenameGroup(g.id, e.target.value)}
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    className="text-[10px] uppercase text-zinc-400"
                    onClick={() => props.onToggleCollapse(g.id)}
                  >
                    {g.collapsed ? "Expand" : "Collapse"}
                  </button>
                  <button
                    type="button"
                    className="text-[10px] uppercase text-red-400/80"
                    onClick={() => props.onRemoveGroup(g.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
    );
  }

  if (multi) {
    const common = (() => {
      const lists = selectedIds.map((id) => unitsById.get(id)?.tags ?? []);
      if (lists.length === 0) return [] as string[];
      return lists[0]!.filter((t) => lists.every((l) => l.includes(t)));
    })();
    return (
      <aside className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="flex justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-50">{selectedIds.length} selected</p>
          <button type="button" onClick={onClearSelection} className="text-xs text-zinc-500">
            Clear
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
          Common tags: {common.length ? common.join(", ") : "(none)"}
        </p>
        <div className="flex gap-2">
          <input
            className="min-h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
            placeholder="Add tag to selection"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
          />
          <button
            type="button"
            className="min-h-10 rounded-lg border border-zinc-700 px-3 text-xs text-zinc-200"
            onClick={() => {
              props.onAddTagToSelection(tagDraft);
              setTagDraft("");
            }}
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={props.onCreateGroup}
          className="min-h-10 w-full rounded-lg border border-zinc-700 text-xs font-medium text-zinc-100"
        >
          Create group
        </button>
        {selectedIds.length === 2 ? (
          <button
            type="button"
            onClick={props.onCreateRelationBetweenTwo}
            className="min-h-10 w-full rounded-lg border border-zinc-700 text-xs font-medium text-zinc-100"
          >
            Create related_to between pair
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-10 flex-1 rounded-lg border border-zinc-800 text-xs text-zinc-400"
            onClick={() => props.onExportSelection("json")}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="min-h-10 flex-1 rounded-lg border border-zinc-800 text-xs text-zinc-400"
            onClick={() => props.onExportSelection("md")}
          >
            Export MD
          </button>
        </div>
      </aside>
    );
  }

  if (!unit) {
    return (
      <aside className="rounded-xl border border-zinc-800 p-3 text-xs text-zinc-500">
        Selection hidden by filter/collapse.{" "}
        <button type="button" onClick={onClearSelection} className="text-sky-400">
          Clear
        </button>
      </aside>
    );
  }

  const linked = relations.filter(
    (r) => r.sourceUnitId === unit.id || r.targetUnitId === unit.id
  );

  return (
    <aside className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Unit</p>
          <h3 className="truncate text-sm font-semibold text-zinc-50">{unit.label}</h3>
          <p className="text-[10px] text-zinc-500">
            {unit.confirmed ? "confirmed" : "provisional"}
          </p>
        </div>
        <button type="button" onClick={onClearSelection} className="text-xs text-zinc-500">
          Clear
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Evidence type</span>
        <select
          className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
          value={unit.evidenceType}
          onChange={(e) =>
            props.onSetEvidenceType(unit.id, e.target.value as ArgusEvidenceType)
          }
        >
          {ARGUS_EVIDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="min-h-10 w-full rounded-lg border border-zinc-700 text-xs text-zinc-200"
        onClick={() => props.onSetUnitConfirmed(unit.id, !unit.confirmed)}
      >
        {unit.confirmed ? "Mark provisional" : "Confirm unit"}
      </button>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">Tags</p>
        <div className="flex flex-wrap gap-1">
          {unit.tags.map((t) => (
            <button
              key={t}
              type="button"
              className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300"
              onClick={() => props.onRemoveTag(unit.id, t)}
              title="Remove tag"
            >
              {t} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="min-h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100"
            placeholder="Add tag"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
          />
          <button
            type="button"
            className="min-h-10 rounded-lg border border-zinc-700 px-3 text-xs"
            onClick={() => {
              props.onAddTag(unit.id, tagDraft);
              setTagDraft("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-400">{unit.preview}</p>
      <p className="text-[11px] text-zinc-600">
        Source: {unit.source}
        {unit.chaosItemId ? ` · ${unit.chaosItemId}` : ""}
      </p>

      {unit.source === "chaos" && unit.chaosDeckId && unit.chaosItemId ? (
        <Link
          href={`/forge/deck/${unit.chaosDeckId}/item/${unit.chaosItemId}`}
          className="inline-flex min-h-10 items-center text-xs text-sky-400 underline-offset-2 hover:underline"
        >
          Open in Chaos
        </Link>
      ) : null}

      {unit.source === "chaos" &&
      unit.chaosItemId &&
      props.deckMoveTargets &&
      props.deckMoveTargets.length > 0 &&
      props.onMoveFragmentToDeck ? (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Move fragment to deck
          </span>
          <select
            className="min-h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200"
            defaultValue=""
            onChange={(e) => {
              const targetDeckId = e.target.value;
              if (!targetDeckId || !unit.chaosItemId) return;
              props.onMoveFragmentToDeck?.(unit.chaosItemId, targetDeckId);
              e.target.value = "";
            }}
          >
            <option value="">Choose deck…</option>
            {props.deckMoveTargets.map((deck) => (
              <option
                key={deck.id}
                value={deck.id}
                disabled={deck.id === unit.chaosDeckId}
              >
                {deck.label}
                {deck.id === unit.chaosDeckId ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          Relations ({linked.length})
        </p>
        {linked.map((r) => {
          const otherId = r.sourceUnitId === unit.id ? r.targetUnitId : r.sourceUnitId;
          const dir = r.sourceUnitId === unit.id ? "→" : "←";
          return (
            <div key={r.id} className="rounded-lg border border-zinc-800 px-2 py-2">
              <p className="truncate text-xs text-zinc-300">
                {dir} {unitsById.get(otherId)?.label ?? otherId}
                {!r.confirmed ? " · provisional" : ""}
              </p>
              <select
                className="mt-1 min-h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-zinc-200"
                value={r.type}
                onChange={(e) =>
                  props.onSetRelationType(r.id, e.target.value as ArgusRelationType)
                }
              >
                {ARGUS_RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  className="text-[10px] uppercase text-zinc-400"
                  onClick={() => props.onSetRelationConfirmed(r.id, !r.confirmed)}
                >
                  {r.confirmed ? "Unconfirm" : "Confirm"}
                </button>
                <button
                  type="button"
                  className="text-[10px] uppercase text-red-400/80"
                  onClick={() => props.onRemoveRelation(r.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
