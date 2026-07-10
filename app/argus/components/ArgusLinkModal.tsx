"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { Entity } from "@/lib/argus/types";
import { createEntityInlineAction, type CreatedEntityResult } from "@/app/argus/actions";
import { ReferenceCreateModal } from "@/app/argus/components/ReferenceCreateModal";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { inputClass } from "@/app/argus/components/ui";
import { entityReferenceKind } from "@/lib/argus/link-hierarchy";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { useOverlayLock } from "@/lib/argus/use-overlay-lock";
import {
  entityKindLabel,
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { CAPTURE, LINK_HIERARCHY, REFERENCE_PICKER, REFERENCES } from "@/lib/argus/ux-copy";

const LINK_KINDS: ReferenceKind[] = ["person", "organization", "project", "topic", "event"];

export type ArgusLinkFilter = ReferenceKind | "all" | "tags";

export type ArgusLinkResult = {
  entityIds: string[];
  tags: string[];
};

export type ArgusLinkModalProps = {
  open: boolean;
  buckets: EntityPickerBuckets;
  tagBuckets?: TagBuckets;
  title?: string;
  subtitle?: string;
  selectedEntityIds: string[];
  selectedTags?: string[];
  showTags?: boolean;
  excludeEntityIds?: string[];
  initialFilter?: ArgusLinkFilter;
  onConfirm: (result: ArgusLinkResult) => void | Promise<void>;
  onClose: () => void;
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
};

const KIND_TAB_LABELS: Record<ArgusLinkFilter, string> = {
  all: "All",
  person: "People",
  organization: "Orgs",
  project: "Projects",
  topic: "Topics",
  event: "Events",
  tags: "Tags",
};

function createLabelForKind(kind: ReferenceKind): string {
  return `+ New ${REFERENCE_KIND_LABELS[kind]}`;
}

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function tagKey(tag: string): string {
  return tag.toLowerCase();
}

function EntityRow({
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

function TagRow({ tag, checked, onToggle }: { tag: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/60">
      <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
      <span className="text-sm text-zinc-200">#{tag}</span>
    </label>
  );
}

export function ArgusLinkModal({
  open,
  buckets,
  tagBuckets,
  title = "Link",
  subtitle = LINK_HIERARCHY.inboxLinkHint,
  selectedEntityIds,
  selectedTags = [],
  showTags = true,
  excludeEntityIds = [],
  initialFilter = "all",
  onConfirm,
  onClose,
  onEntityCreated,
}: ArgusLinkModalProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ArgusLinkFilter>("all");
  const [draftIds, setDraftIds] = useState<string[]>(selectedEntityIds);
  const [draftTags, setDraftTags] = useState<string[]>(selectedTags);
  const [tagInput, setTagInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useOverlayLock(open);

  const tabs = useMemo(
    () => (showTags && tagBuckets ? (["all", ...LINK_KINDS, "tags"] as ArgusLinkFilter[]) : (["all", ...LINK_KINDS] as ArgusLinkFilter[])),
    [showTags, tagBuckets]
  );

  useEffect(() => {
    if (open) {
      setDraftIds(selectedEntityIds);
      setDraftTags(selectedTags);
      setQuery("");
      setTagInput("");
      setKindFilter(initialFilter);
      setSaveError(null);
      setSaving(false);
    }
  }, [open, selectedEntityIds, selectedTags, initialFilter]);

  const excluded = useMemo(() => new Set(excludeEntityIds), [excludeEntityIds]);
  const allEntities = useMemo(
    () => buckets.alphabetical.filter((entity) => !excluded.has(entity.id)),
    [buckets.alphabetical, excluded]
  );

  const activeCreateKind: ReferenceKind = kindFilter === "all" || kindFilter === "tags" ? "person" : kindFilter;

  const filteredEntities = useMemo(() => {
    const byKind =
      kindFilter === "all" || kindFilter === "tags"
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

  const tagOptions = useMemo(() => {
    if (!tagBuckets) return [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const tag of [...draftTags, ...tagBuckets.recent, ...tagBuckets.frequent, ...tagBuckets.all]) {
      const key = tagKey(tag);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(normalizeTag(tag));
    }
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((tag) => tag.toLowerCase().includes(q));
  }, [draftTags, tagBuckets, query]);

  function toggleEntity(id: string) {
    setDraftIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function toggleTag(tag: string) {
    const normalized = normalizeTag(tag);
    const key = tagKey(normalized);
    setDraftTags((current) => {
      const exists = current.some((value) => tagKey(value) === key);
      if (exists) return current.filter((value) => tagKey(value) !== key);
      return [...current, normalized];
    });
  }

  function addTagFromInput() {
    const normalized = normalizeTag(tagInput);
    if (!normalized) return;
    toggleTag(normalized);
    setTagInput("");
  }

  function handleEntityCreated(entity: CreatedEntityResult) {
    void (async () => {
      try {
        if (onEntityCreated) {
          const handled = await onEntityCreated(entity);
          if (handled === false) {
            if (!draftIds.includes(entity.id)) {
              setDraftIds((current) => [...current, entity.id]);
            }
            return;
          }
        }
        if (!draftIds.includes(entity.id)) {
          setDraftIds((current) => [...current, entity.id]);
        }
      } catch (err) {
        const { message } = formatArgusError(err);
        setSaveError(message);
      }
    })();
  }

  const canDone = draftIds.length > 0 || draftTags.length > 0;
  const onTagsTab = kindFilter === "tags";

  async function handleDone() {
    if (!canDone || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      await onConfirm({ entityIds: draftIds, tags: draftTags });
      onClose();
    } catch (err) {
      const { message } = formatArgusError(err);
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !mounted) return null;

  const modal = (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
        onClick={onClose}
      >
        <div
          className="flex max-h-[min(720px,92vh)] min-h-[min(520px,85vh)] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:min-h-[560px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="argus-link-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-zinc-800 px-5 py-4">
            <h3 id="argus-link-title" className="text-base font-semibold text-zinc-100">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-snug text-zinc-500">{subtitle}</p>
          </div>

          <div className="shrink-0 flex gap-1 overflow-x-auto px-4 pt-3 [scrollbar-gutter:stable]">
            {tabs.map((kind) => (
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

          {saveError ? (
            <p className="mx-5 mt-3 rounded-lg border border-amber-800/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
              {saveError}
            </p>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={onTagsTab ? "Search tags…" : REFERENCE_PICKER.searchPlaceholder}
              className={inputClass}
              autoFocus
            />

            {!onTagsTab ? (
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
            ) : (
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                  placeholder="Add a tag…"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addTagFromInput}
                  disabled={!tagInput.trim()}
                  className="shrink-0 rounded-xl border border-violet-800/50 bg-violet-950/30 px-4 text-sm font-medium text-violet-300 hover:bg-violet-900/30 disabled:opacity-40"
                >
                  + Tag
                </button>
              </div>
            )}

            <p className="text-xs leading-relaxed text-zinc-600">
              {onTagsTab ? "Select tags to classify this item." : LINK_HIERARCHY.multiLinkHint}
            </p>

            <div className="argus-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-2 [scrollbar-gutter:stable]">
              {onTagsTab ? (
                tagOptions.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-zinc-500">
                    {query.trim() ? "No matching tags." : "No tags yet — type one above."}
                  </p>
                ) : (
                  tagOptions.map((tag) => (
                    <TagRow
                      key={tagKey(tag)}
                      tag={tag}
                      checked={draftTags.some((value) => tagKey(value) === tagKey(tag))}
                      onToggle={() => toggleTag(tag)}
                    />
                  ))
                )
              ) : filteredEntities.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-zinc-500">
                  {query.trim() ? REFERENCE_PICKER.typeToSearch : REFERENCE_PICKER.noReferences}
                </p>
              ) : (
                filteredEntities.map((entity) => (
                  <EntityRow
                    key={entity.id}
                    entity={entity}
                    checked={draftIds.includes(entity.id)}
                    onToggle={() => toggleEntity(entity.id)}
                  />
                ))
              )}
            </div>

            {draftTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {draftTags.map((tag) => (
                  <span
                    key={tagKey(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="text-violet-400/70 hover:text-violet-100"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-zinc-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {REFERENCES.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleDone()}
              disabled={!canDone || saving}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {saving ? "Saving…" : CAPTURE.done}
            </button>
          </div>
        </div>
      </div>
      <ReferenceCreateModal
        open={createOpen}
        defaultKind={activeCreateKind}
        allowedKinds={[activeCreateKind]}
        error={createError ?? undefined}
        onCancel={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSave={(data) => {
          startTransition(async () => {
            try {
              const entity = await createEntityInlineAction(activeCreateKind, data.name, data.notes);
              setCreateOpen(false);
              setCreateError(null);
              handleEntityCreated(entity);
            } catch (err) {
              const { message } = formatArgusError(err);
              setCreateError(message);
            }
          });
        }}
      />
    </>
  );

  return createPortal(modal, document.body);
}
