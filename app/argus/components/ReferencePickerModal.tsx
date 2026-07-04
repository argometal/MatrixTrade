"use client";

import { useMemo, useState, useTransition } from "react";
import type { Entity, EntityType } from "@/lib/argus/types";
import { createEntityInlineAction, type CreatedEntityResult } from "@/app/argus/actions";
import {
  createInputToReferenceKind,
  entityKindLabel,
  entityNotesForDisplay,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { CAPTURE, REFERENCES, REFERENCE_PICKER } from "@/lib/argus/ux-copy";
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
  /** After inline create — picker closes. Return false to skip default select behavior. */
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
  defaultCreateKind?: ReferenceKind;
  createButtonLabel?: string;
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
      <span className="shrink-0 text-xs text-zinc-500">{entityKindLabel(entity)}</span>
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
  onEntityCreated,
  defaultCreateKind = "person",
  createButtonLabel,
}: ReferencePickerModalProps) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const allEntities = buckets.alphabetical;
  const hasReferences = allEntities.length > 0;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allEntities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        entityKindLabel(e).toLowerCase().includes(q)
    );
  }, [allEntities, query]);

  const recentList =
    buckets.recent.length > 0 ? buckets.recent : buckets.frequent.length > 0 ? buckets.frequent : [];

  const visible = query.trim() ? searchResults : recentList;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function handleCreateSave(data: { name: string; entityType: EntityType; notes: string }) {
    setCreateError(null);
    startCreate(async () => {
      try {
        const kind = createInputToReferenceKind(data.entityType, data.notes);
        const entity = await createEntityInlineAction(kind, data.name, entityNotesForDisplay(data.notes));
        setCreateOpen(false);
        onClose();

        if (onEntityCreated) {
          const handled = await onEntityCreated(entity);
          if (handled === false) return;
        }

        if (!selectedIds.includes(entity.id)) {
          onChange([...selectedIds, entity.id]);
        }
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Could not create");
        setCreateOpen(true);
      }
    });
  }

  if (!open) return null;

  const createLabel = createButtonLabel ?? `+ ${REFERENCES.createNew}`;

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
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              className="mt-3 w-full rounded-xl border border-teal-800/60 bg-teal-950/40 py-2 text-sm font-medium text-teal-300 hover:bg-teal-900/40"
            >
              {createLabel}
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
                  <p className="mt-1 text-xs text-zinc-600">{createLabel} to add one.</p>
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
              disabled={selectedIds.length === 0}
              className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
            >
              {CAPTURE.done}
            </button>
          </div>
        </div>
      </div>

      <ReferenceCreateModal
        open={createOpen}
        defaultKind={defaultCreateKind}
        onCancel={() => {
          if (!isCreating) setCreateOpen(false);
        }}
        onSave={handleCreateSave}
        saveLabel={isCreating ? "Saving…" : undefined}
        error={createError ?? undefined}
      />
    </>
  );
}
