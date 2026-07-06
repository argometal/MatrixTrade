"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Entity } from "@/lib/argus/types";
import { createEntityInlineAction, type CreatedEntityResult } from "@/app/argus/actions";
import { ReferenceCreateModal } from "@/app/argus/components/ReferenceCreateModal";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { inputClass } from "@/app/argus/components/ui";
import { entityReferenceKind } from "@/lib/argus/link-hierarchy";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import {
  createInputToReferenceKind,
  entityKindLabel,
  entityNotesForDisplay,
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { CAPTURE, LINK_HIERARCHY, REFERENCE_PICKER, REFERENCES } from "@/lib/argus/ux-copy";

const INBOX_KINDS: ReferenceKind[] = ["person", "organization", "project", "topic", "event"];

type KindFilter = ReferenceKind | "all";

const KIND_TAB_LABELS: Record<KindFilter, string> = {
  all: "All",
  person: "People",
  organization: "Orgs",
  project: "Projects",
  topic: "Topics",
  event: "Events",
};

function createLabelForKind(kind: ReferenceKind): string {
  return `+ New ${REFERENCE_KIND_LABELS[kind]}`;
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
    <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <span className="truncate text-sm text-zinc-200">{entity.name}</span>
      <span className="truncate text-right text-xs text-zinc-500">{entityKindLabel(entity)}</span>
    </label>
  );
}

export function V2InboxEntityLinkModal({
  open,
  buckets,
  selectedIds,
  onConfirm,
  onClose,
  onEntityCreated,
}: {
  open: boolean;
  buckets: EntityPickerBuckets;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  useEffect(() => {
    if (open) {
      setDraftIds(selectedIds);
      setQuery("");
      setKindFilter("all");
    }
  }, [open, selectedIds]);

  const allEntities = buckets.alphabetical;
  const activeCreateKind: ReferenceKind =
    kindFilter === "all" ? "person" : kindFilter;

  const filteredEntities = useMemo(() => {
    const byKind =
      kindFilter === "all"
        ? allEntities
        : allEntities.filter((entity) => entityReferenceKind(entity) === kindFilter);

    const q = query.trim().toLowerCase();
    if (!q) return byKind;

    return byKind.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.notes.toLowerCase().includes(q) ||
        entityKindLabel(entity).toLowerCase().includes(q)
    );
  }, [allEntities, kindFilter, query]);

  if (!open) return null;

  function toggle(id: string) {
    setDraftIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function handleCreateSave(data: { name: string; entityType: Entity["type"]; notes: string }) {
    setCreateError(null);
    startCreate(async () => {
      try {
        const kind = createInputToReferenceKind(data.entityType, data.notes);
        const entity = await createEntityInlineAction(kind, data.name, entityNotesForDisplay(data.notes));
        setCreateOpen(false);

        if (onEntityCreated) {
          const handled = await onEntityCreated(entity);
          if (handled === false) {
            if (!draftIds.includes(entity.id)) {
              setDraftIds((current) => [...current, entity.id]);
            }
            return;
          }
        }

        const next = draftIds.includes(entity.id) ? draftIds : [...draftIds, entity.id];
        setDraftIds(next);
        onConfirm(next);
        onClose();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setCreateError(`${layer.toUpperCase()}: ${message}`);
        setCreateOpen(true);
      }
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center sm:p-6"
        onClick={onClose}
      >
        <div
          className="flex max-h-[min(720px,92vh)] min-h-[min(520px,85vh)] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:min-h-[560px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inbox-link-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-zinc-800 px-5 py-4">
            <h3 id="inbox-link-title" className="text-base font-semibold text-zinc-100">
              Link email
            </h3>
            <p className="mt-1.5 text-sm leading-snug text-zinc-500">{LINK_HIERARCHY.inboxLinkHint}</p>
          </div>

          <div className="shrink-0 flex gap-1 overflow-x-auto px-4 pt-3 [scrollbar-gutter:stable]">
            {(["all", ...INBOX_KINDS] as KindFilter[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setKindFilter(kind)}
                className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition ${
                  kindFilter === kind
                    ? "border-violet-500 bg-violet-600/10 text-violet-300"
                    : "border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {KIND_TAB_LABELS[kind]}
              </button>
            ))}
          </div>
          <div className="mx-4 border-b border-zinc-800" />

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
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
              className="w-full rounded-xl border border-violet-800/50 bg-violet-950/30 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-900/30"
            >
              {createLabelForKind(activeCreateKind)}
            </button>

            <p className="text-xs leading-relaxed text-zinc-600">{LINK_HIERARCHY.multiLinkHint}</p>

            <div className="min-h-[240px] flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-2 [scrollbar-gutter:stable] sm:min-h-[320px]">
              {filteredEntities.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-zinc-500">
                  {query.trim() ? REFERENCE_PICKER.typeToSearch : REFERENCE_PICKER.noReferences}
                </p>
              ) : (
                filteredEntities.map((entity) => (
                  <ReferenceRow
                    key={entity.id}
                    entity={entity}
                    checked={draftIds.includes(entity.id)}
                    onToggle={() => toggle(entity.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-5">
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
                onConfirm(draftIds);
                onClose();
              }}
              disabled={draftIds.length === 0}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {CAPTURE.done}
            </button>
          </div>
        </div>
      </div>

      <ReferenceCreateModal
        open={createOpen}
        defaultKind={activeCreateKind}
        allowedKinds={INBOX_KINDS}
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
