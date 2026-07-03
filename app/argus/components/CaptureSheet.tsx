"use client";

import { useEffect, useRef, useState } from "react";
import type { EntityType } from "@/lib/argus/types";
import { CAPTURE, REFERENCES } from "@/lib/argus/ux-copy";
import { AttachmentField } from "./AttachmentField";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";

export interface CaptureInitial {
  body?: string;
  title?: string;
  inboxId?: string;
  entityIds?: string[];
}

interface CaptureSheetProps {
  open: boolean;
  action: (formData: FormData) => Promise<void>;
  buckets: EntityPickerBuckets;
  initial?: CaptureInitial;
  onClose: () => void;
  mode?: "modal" | "embedded";
  autoOpenReference?: boolean;
}

function MetaButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-700/50"
          : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export function CaptureSheet({
  open,
  action,
  buckets,
  initial,
  onClose,
  mode = "modal",
  autoOpenReference = false,
}: CaptureSheetProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.entityIds ?? []);
  const [eventDate, setEventDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(autoOpenReference);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateType, setQuickCreateType] = useState<EntityType>("person");
  const [quickCreateNotes, setQuickCreateNotes] = useState("");

  useEffect(() => {
    if (open) {
      setBody(initial?.body ?? "");
      setTitle(initial?.title ?? "");
      setSelectedIds(initial?.entityIds ?? []);
      setReferenceOpen(autoOpenReference);
    }
  }, [open, initial?.body, initial?.title, initial?.entityIds, autoOpenReference]);

  useEffect(() => {
    if (open && !referenceOpen) {
      const t = setTimeout(() => bodyRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, referenceOpen]);

  if (!open && mode === "modal") return null;

  const canSave = body.trim().length > 0;
  const selectedNames = selectedIds
    .map((id) => buckets.alphabetical.find((e) => e.id === id)?.name)
    .filter(Boolean);
  const linkedLabel = [
    ...selectedNames,
    ...(quickCreateName.trim() ? [quickCreateName.trim()] : []),
  ].join(", ");

  const formContent = (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {initial?.inboxId && <input type="hidden" name="inboxId" value={initial.inboxId} />}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="title" value={title} />
      {!initial?.inboxId && <input type="hidden" name="returnTo" value="journal" />}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
      {quickCreateName.trim() && (
        <>
          <input type="hidden" name="newEntityName" value={quickCreateName.trim()} />
          <input type="hidden" name="newEntityType" value={quickCreateType} />
          <input type="hidden" name="newEntityNotes" value={quickCreateNotes} />
        </>
      )}
      <input type="hidden" name="eventDate" value={eventDate} />
      <input type="hidden" name="followUpDate" value={followUpDate} />
      <input type="hidden" name="source" value={initial?.inboxId ? "inbox" : "manual"} />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={CAPTURE.titlePlaceholder}
        className="w-full border-0 bg-transparent text-[15px] font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
      />

      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={CAPTURE.bodyPlaceholder}
        rows={mode === "embedded" ? 8 : 6}
        className="mt-2 w-full flex-1 resize-none bg-transparent text-[17px] leading-[1.55] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
      />

      {linkedLabel && (
        <p className="mt-1 text-[12px] text-teal-400/90">
          {REFERENCES.linkLabel}: {linkedLabel}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <MetaButton
          active={referenceOpen || selectedIds.length > 0 || Boolean(quickCreateName)}
          onClick={() => setReferenceOpen(true)}
        >
          {CAPTURE.reference}
        </MetaButton>
        <MetaButton active={Boolean(eventDate) || dateOpen} onClick={() => setDateOpen((v) => !v)}>
          {CAPTURE.date}
        </MetaButton>
        <MetaButton active={Boolean(followUpDate) || reminderOpen} onClick={() => setReminderOpen((v) => !v)}>
          {CAPTURE.reminder}
        </MetaButton>
        <MetaButton active={attachmentOpen} onClick={() => setAttachmentOpen((v) => !v)}>
          {CAPTURE.attachment}
        </MetaButton>
      </div>

      {dateOpen && (
        <label className="mt-3 block">
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
          />
        </label>
      )}

      {reminderOpen && (
        <label className="mt-3 block">
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
          />
        </label>
      )}

      {attachmentOpen && (
        <div className="mt-3">
          <AttachmentField />
        </div>
      )}

      <div className="mt-4 flex gap-3 border-t border-zinc-800 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-[15px] text-zinc-400 hover:bg-zinc-800"
        >
          {CAPTURE.cancel}
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="flex-1 rounded-xl bg-teal-600 py-2.5 text-[15px] font-semibold text-white hover:bg-teal-500 disabled:opacity-35"
        >
          {CAPTURE.save}
        </button>
      </div>

      <ReferencePickerModal
        open={referenceOpen}
        buckets={buckets}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        onClose={() => setReferenceOpen(false)}
        pendingNewName={quickCreateName.trim() || undefined}
        onPendingNew={(data) => {
          if (!data) {
            setQuickCreateName("");
            setQuickCreateNotes("");
            return;
          }
          setQuickCreateName(data.name);
          setQuickCreateType(data.entityType);
          setQuickCreateNotes(data.notes);
        }}
      />
    </form>
  );

  if (mode === "embedded") {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-zinc-100">{CAPTURE.title}</h2>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 pb-24 sm:items-center sm:pb-4">
      <div
        className="flex max-h-[min(560px,88vh)] w-full max-w-lg flex-col rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="capture-sheet-title" className="mb-3 text-[13px] font-medium uppercase tracking-wider text-zinc-500">
          {CAPTURE.title}
        </h2>
        {formContent}
      </div>
    </div>
  );
}
