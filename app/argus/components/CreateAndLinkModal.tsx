"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Entity } from "@/lib/argus/types";
import {
  createEntityInlineAction,
  setEntityLinkedIdsAction,
  type CreatedEntityResult,
} from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { inputClass } from "@/app/argus/components/ui";
import { entityReferenceKind, filterEntityPickerBuckets, type LinkSourceKind } from "@/lib/argus/link-hierarchy";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import {
  entityKindLabel,
  entityNotesForDisplay,
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { REFERENCES } from "@/lib/argus/ux-copy";

const ALL_KINDS: ReferenceKind[] = ["person", "organization", "project", "topic", "event"];

type KindFilter = ReferenceKind | "all";

const KIND_TAB_LABELS: Record<KindFilter, string> = {
  all: "All",
  person: "People",
  organization: "Orgs",
  project: "Projects",
  topic: "Topics",
  event: "Events",
};

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

export function CreateAndLinkModal({
  open,
  onClose,
  buckets,
  mode,
  defaultKind = "person",
  allowedKinds = ALL_KINDS,
  linkSource = "create",
  entityId,
  initialLinkedIds = [],
  title,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  buckets: EntityPickerBuckets;
  mode: "create" | "link";
  defaultKind?: ReferenceKind;
  allowedKinds?: ReferenceKind[];
  linkSource?: LinkSourceKind;
  entityId?: string;
  initialLinkedIds?: string[];
  title?: string;
  onCreated?: (entity: CreatedEntityResult) => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [createKind, setCreateKind] = useState<ReferenceKind>(defaultKind);
  const [eventDate, setEventDate] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [draftIds, setDraftIds] = useState<string[]>(initialLinkedIds);
  const [linkCreateOpen, setLinkCreateOpen] = useState(false);
  const [linkCreateKind, setLinkCreateKind] = useState<ReferenceKind>("project");
  const [linkCreateName, setLinkCreateName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveLinkSource: LinkSourceKind = mode === "link" ? "create" : linkSource;

  const filteredBuckets = useMemo(
    () => filterEntityPickerBuckets(buckets, effectiveLinkSource),
    [buckets, effectiveLinkSource]
  );

  useEffect(() => {
    if (open) {
      setName("");
      setNotes("");
      setCreateKind(defaultKind);
      setEventDate(new Date().toISOString().slice(0, 10));
      setQuery("");
      setKindFilter("all");
      setDraftIds(initialLinkedIds);
      setLinkCreateOpen(false);
      setLinkCreateName("");
      setLinkCreateKind("project");
      setError(null);
    }
  }, [open, initialLinkedIds, defaultKind]);

  const filteredEntities = useMemo(() => {
    const byKind =
      kindFilter === "all"
        ? filteredBuckets.alphabetical
        : filteredBuckets.alphabetical.filter(
            (entity) => entityReferenceKind(entity) === kindFilter
          );

    const withoutSelf = entityId
      ? byKind.filter((entity) => entity.id !== entityId)
      : byKind;

    const q = query.trim().toLowerCase();
    if (!q) return withoutSelf;
    return withoutSelf.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.notes.toLowerCase().includes(q) ||
        entityKindLabel(entity).toLowerCase().includes(q)
    );
  }, [filteredBuckets.alphabetical, kindFilter, query, entityId]);

  if (!open) return null;

  const resolvedCreateKind = allowedKinds.length === 1 ? allowedKinds[0]! : createKind;

  function toggle(id: string) {
    setDraftIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") {
          const trimmed = name.trim();
          if (!trimmed) {
            setError("Name is required.");
            return;
          }
          const entity = await createEntityInlineAction(
            resolvedCreateKind,
            trimmed,
            entityNotesForDisplay(notes),
            draftIds,
            resolvedCreateKind === "event" && eventDate ? { startDate: eventDate } : undefined
          );
          onCreated?.(entity);
          onClose();
          return;
        }

        if (!entityId) {
          setError("Entity not found.");
          return;
        }
        await setEntityLinkedIdsAction(entityId, draftIds);
        onClose();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  const resolvedTitle =
    title ??
    (mode === "create"
      ? `New ${REFERENCE_KIND_LABELS[resolvedCreateKind]}`
      : "Link references");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{resolvedTitle}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {mode === "create"
              ? "Capture and link to people, organizations, projects, topics, or events."
              : "Link to people, organizations, projects, topics, or events."}
          </p>
        </div>

        {error ? <p className="px-5 pt-3 text-sm text-amber-400">{error}</p> : null}

        {mode === "create" ? (
          <div className="space-y-3 border-b border-zinc-800 px-5 py-4">
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Name</span>
              <input
                className={`${inputClass} mt-1`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Notes (optional)</span>
              <input
                className={`${inputClass} mt-1`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {allowedKinds.length > 1 ? (
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Type</span>
                <select
                  className={`${inputClass} mt-1`}
                  value={createKind}
                  onChange={(e) => setCreateKind(e.target.value as ReferenceKind)}
                >
                  {allowedKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {REFERENCE_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {mode === "create" && resolvedCreateKind === "event" ? (
              <label className="block">
                <span className="text-xs font-medium text-zinc-500">Event date</span>
                <input
                  type="date"
                  className={`${inputClass} mt-1`}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4 overflow-hidden">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Link to</p>
          <input
            className={`${inputClass} mb-3`}
            placeholder="Search references…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mb-3 flex flex-wrap gap-1">
            {(["all", ...ALL_KINDS] as KindFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setKindFilter(tab)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  kindFilter === tab ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {KIND_TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {mode === "link" ? (
              <button
                type="button"
                onClick={() => setLinkCreateOpen((value) => !value)}
                className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-900/30"
              >
                {linkCreateOpen ? "Cancel new" : "+ New reference"}
              </button>
            ) : null}
          </div>

          {mode === "link" && linkCreateOpen ? (
            <div className="mb-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
                <select
                  className={inputClass}
                  value={linkCreateKind}
                  onChange={(e) => setLinkCreateKind(e.target.value as ReferenceKind)}
                >
                  {ALL_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {REFERENCE_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  placeholder="Name"
                  value={linkCreateName}
                  onChange={(e) => setLinkCreateName(e.target.value)}
                />
                <button
                  type="button"
                  disabled={isPending || !linkCreateName.trim()}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        const created = await createEntityInlineAction(
                          linkCreateKind,
                          linkCreateName.trim(),
                          "",
                          [],
                          linkCreateKind === "event" ? { startDate: eventDate || new Date().toISOString().slice(0, 10) } : undefined
                        );
                        setDraftIds((current) =>
                          current.includes(created.id) ? current : [...current, created.id]
                        );
                        setLinkCreateName("");
                        setLinkCreateOpen(false);
                      } catch (err) {
                        const { layer, message } = formatArgusError(err);
                        setError(`${layer.toUpperCase()}: ${message}`);
                      }
                    });
                  }}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}

          <div className="argus-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-800">
            {filteredEntities.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No matches.</p>
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
          <p className="mt-2 text-xs text-zinc-600">
            {draftIds.length} selected · links are optional
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {REFERENCES.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || (mode === "create" && !name.trim())}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {isPending ? "Saving…" : mode === "create" ? "Capture & link" : "Save links"}
          </button>
        </div>
      </div>
    </div>
  );
}
