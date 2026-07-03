"use client";

import { useMemo, useState } from "react";
import type { Entity, EntityType } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { CAPTURE, REFERENCES, REFERENCE_PICKER } from "@/lib/argus/ux-copy";
import { FAVORITES_KEY } from "@/lib/argus/journal-helpers";
import { inputClass } from "./ui";
import { ReferenceCreateModal } from "./ReferenceCreateModal";

export interface EntityPickerBuckets {
  recent: Entity[];
  frequent: Entity[];
  alphabetical: Entity[];
}

interface ReferencePickerModalProps {
  open: boolean;
  buckets: EntityPickerBuckets;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm?: () => void;
  pendingNewName?: string;
  onPendingNew: (data: { name: string; entityType: EntityType; notes: string } | null) => void;
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function ReferenceRow({
  entity,
  checked,
  onToggle,
}: {
  entity: Entity;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{entity.name}</span>
      <span className="shrink-0 text-xs text-zinc-500">{ENTITY_TYPE_LABELS[entity.type]}</span>
    </label>
  );
}

export function ReferencePickerModal({
  open,
  buckets,
  selectedIds,
  onChange,
  onClose,
  onConfirm,
  pendingNewName,
  onPendingNew,
}: ReferencePickerModalProps) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [createOpen, setCreateOpen] = useState(false);

  const allEntities = buckets.alphabetical;
  const hasReferences = allEntities.length > 0;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allEntities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }, [allEntities, query]);

  const recentList =
    buckets.recent.length > 0 ? buckets.recent : buckets.frequent.length > 0 ? buckets.frequent : [];

  const visible = query.trim() ? searchResults : recentList;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
        <div
          className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-zinc-800 px-4 py-3">
            <h3 className="text-[15px] font-semibold text-zinc-100">{CAPTURE.reference}</h3>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={REFERENCE_PICKER.searchPlaceholder}
              className={inputClass}
              autoFocus
            />

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-3 w-full rounded-xl border border-teal-800/60 bg-teal-950/40 py-2 text-sm font-medium text-teal-300 hover:bg-teal-900/40"
            >
              + {REFERENCES.createNew}
            </button>

            {!query.trim() && recentList.length > 0 && (
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                {REFERENCE_PICKER.recent}
              </p>
            )}

            <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {!hasReferences && !query.trim() ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500">{REFERENCES.empty}</p>
                  <p className="mt-1 text-xs text-zinc-600">{REFERENCES.emptyHint}</p>
                </div>
              ) : visible.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">
                  {query.trim() ? REFERENCE_PICKER.typeToSearch : REFERENCE_PICKER.noReferences}
                </p>
              ) : (
                visible.map((entity) => (
                  <ReferenceRow
                    key={entity.id}
                    entity={entity}
                    checked={selectedIds.includes(entity.id)}
                    onToggle={() => toggle(entity.id)}
                  />
                ))
              )}
            </div>

            {pendingNewName && (
              <p className="mt-2 text-xs text-teal-400">{REFERENCES.pendingNew(pendingNewName)}</p>
            )}
          </div>

          <div className="flex gap-2 border-t border-zinc-800 p-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {REFERENCES.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-600"
            >
              {CAPTURE.done}
            </button>
          </div>
        </div>
      </div>

      <ReferenceCreateModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSave={(data) => {
          onPendingNew(data);
          setCreateOpen(false);
        }}
      />
    </>
  );
}
