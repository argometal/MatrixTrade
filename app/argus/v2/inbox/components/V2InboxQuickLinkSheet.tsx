"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Entity } from "@/lib/argus/types";
import { setInboxLinksAction } from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { inputClass } from "@/app/argus/components/ui";
import { entityReferenceKind } from "@/lib/argus/link-hierarchy";
import { entityKindLabel } from "@/lib/argus/reference-types";
import {
  suggestInboxEntities,
  type V2InboxDetailEntity,
} from "@/lib/argus/v2/inbox-loaders";
import { useOverlayLock } from "@/lib/argus/use-overlay-lock";

function entityIcon(kind: V2InboxDetailEntity["kind"]): string {
  if (kind === "project") return "📁";
  if (kind === "organization") return "🏢";
  if (kind === "topic") return "🏷";
  if (kind === "event") return "📅";
  return "👤";
}

export function V2InboxQuickLinkSheet({
  open,
  inboxId,
  subject,
  body,
  linkedIds,
  returnTo,
  buckets,
  linkedEntityRecords,
  onClose,
  onSaved,
}: {
  open: boolean;
  inboxId: string;
  subject: string;
  body: string;
  linkedIds: string[];
  returnTo: string;
  buckets: EntityPickerBuckets;
  linkedEntityRecords: Entity[];
  onClose: () => void;
  onSaved?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>(linkedIds);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useOverlayLock(open);

  useEffect(() => {
    if (!open) return;
    setDraftIds(linkedIds);
    setQuery("");
  }, [open, linkedIds, inboxId]);

  const suggested = useMemo(
    () => suggestInboxEntities(subject, body, linkedEntityRecords, draftIds),
    [subject, body, linkedEntityRecords, draftIds]
  );

  const recent = useMemo(() => buckets.recent.slice(0, 8), [buckets.recent]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return buckets.alphabetical
      .filter(
        (entity) =>
          entity.name.toLowerCase().includes(q) ||
          entity.notes.toLowerCase().includes(q) ||
          entityKindLabel(entity).toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [buckets.alphabetical, query]);

  function toggle(id: string) {
    setDraftIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function save(andNext: boolean) {
    if (draftIds.length === 0) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("inboxId", inboxId);
      formData.set("returnTo", returnTo);
      for (const id of draftIds) formData.append("entityIds", id);
      await setInboxLinksAction(formData);
      onSaved?.(draftIds);
      router.refresh();
      onClose();
      if (andNext) {
        const event = new CustomEvent("argus-inbox-advance", { detail: { inboxId } });
        window.dispatchEvent(event);
      }
    });
  }

  function renderChip(entity: Entity | V2InboxDetailEntity) {
    const id = entity.id;
    const name = entity.name;
    const kind =
      "kind" in entity
        ? entity.kind
        : (entityReferenceKind(entity as Entity) ?? "person");
    const active = draftIds.includes(id);
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggle(id)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
          active
            ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
            : "border-zinc-700 bg-zinc-900 text-zinc-400"
        }`}
      >
        <span>{entityIcon(kind as V2InboxDetailEntity["kind"])}</span>
        {name}
      </button>
    );
  }

  if (!open || !mounted) return null;

  const sheet = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 lg:hidden"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-3xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Quick link email"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700" />
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-100">Link email</h3>
          <p className="mt-1 line-clamp-1 text-sm text-zinc-500">{subject || "No subject"}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, projects, topics…"
            className={`${inputClass} mb-4`}
            autoFocus
          />

          {query.trim() ? (
            <div className="flex flex-wrap gap-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-zinc-500">No matches.</p>
              ) : (
                filtered.map((entity) => renderChip(entity))
              )}
            </div>
          ) : (
            <>
              {suggested.length > 0 ? (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Suggested
                  </p>
                  <div className="flex flex-wrap gap-2">{suggested.map((entity) => renderChip(entity))}</div>
                </div>
              ) : null}
              {recent.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((entity) => renderChip(entity))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {draftIds.length > 0 ? (
            <p className="mt-4 text-xs text-violet-300">{draftIds.length} selected</p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={draftIds.length === 0 || isPending}
            className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={draftIds.length === 0 || isPending}
            className="flex-[1.2] rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save &amp; next
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
