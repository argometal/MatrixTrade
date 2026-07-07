"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CAPTURE, REFERENCES, TAGS } from "@/lib/argus/ux-copy";
import { allowedCreateKinds, filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { eventDateFromLinkedEntities } from "@/lib/argus/journal-event-origin";
import { AttachmentField } from "./AttachmentField";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
import { TagPickerModal, type TagBuckets } from "./TagPickerModal";

export interface CaptureInitial {
  body?: string;
  title?: string;
  inboxId?: string;
  entityIds?: string[];
  entryType?: "log" | "note";
  eventDate?: string;
  followUpDate?: string;
  topics?: string[];
}

interface CaptureSheetProps {
  open: boolean;
  action: (formData: FormData) => Promise<void>;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
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
  tagBuckets,
  initial,
  onClose,
  mode = "modal",
  autoOpenReference = false,
}: CaptureSheetProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.entityIds ?? []);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(autoOpenReference);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [entryType, setEntryType] = useState<"log" | "note">(initial?.entryType ?? "note");

  const logBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "log"), [buckets]);
  const logCreateKinds = allowedCreateKinds("log");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const kindOverride = entryType === "note" ? "event" : "log";

  useEffect(() => {
    if (open) {
      setBody(initial?.body ?? "");
      setTitle(initial?.title ?? "");
      setSelectedIds(initial?.entityIds ?? []);
      setSelectedTags(initial?.topics ?? []);
      setFollowUpDate(initial?.followUpDate?.slice(0, 10) ?? "");
      setIsProtected(false);
      setProtectedOpen(false);
      setEntryType(initial?.entryType ?? "note");
      const noteDate =
        initial?.eventDate?.slice(0, 10) ||
        eventDateFromLinkedEntities(buckets.alphabetical, initial?.entityIds ?? []) ||
        today;
      setEventDate((initial?.entryType ?? "note") === "note" ? noteDate : "");
      setReferenceOpen(autoOpenReference);
      setTagsOpen(false);
    }
  }, [open, initial?.body, initial?.title, initial?.entityIds, initial?.entryType, initial?.eventDate, initial?.followUpDate, initial?.topics, autoOpenReference, today, buckets.alphabetical]);

  function selectEntryType(type: "log" | "note") {
    setEntryType(type);
    if (type === "note") {
      const linkedDate = eventDateFromLinkedEntities(buckets.alphabetical, selectedIds);
      setEventDate(linkedDate || today);
    } else {
      setEventDate("");
      setDateOpen(false);
    }
  }

  useEffect(() => {
    if (!open || entryType !== "note") return;
    const linkedDate = eventDateFromLinkedEntities(buckets.alphabetical, selectedIds);
    if (linkedDate) setEventDate(linkedDate);
  }, [open, entryType, selectedIds, buckets.alphabetical]);

  useEffect(() => {
    if (open && !referenceOpen && !tagsOpen) {
      const t = setTimeout(() => bodyRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, referenceOpen, tagsOpen]);

  if (!open && mode === "modal") return null;

  const canSave = body.trim().length > 0;
  const selectedNames = selectedIds
    .map((id) => buckets.alphabetical.find((e) => e.id === id)?.name)
    .filter(Boolean);
  const linkedLabel = selectedNames.join(", ");

  const formContent = (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {initial?.inboxId && <input type="hidden" name="inboxId" value={initial.inboxId} />}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="title" value={title} />
      {!initial?.inboxId && <input type="hidden" name="returnTo" value="journal" />}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
      <input type="hidden" name="kindOverride" value={kindOverride} />
      <input type="hidden" name="eventDate" value={entryType === "note" ? eventDate || today : eventDate} />
      <input type="hidden" name="followUpDate" value={followUpDate} />
      <input type="hidden" name="topics" value={selectedTags.join(", ")} />
      {isProtected ? <input type="hidden" name="private" value="on" /> : null}
      <input type="hidden" name="source" value={initial?.inboxId ? "inbox" : "manual"} />

      <div className="mb-3 flex gap-2 rounded-xl bg-zinc-900/80 p-1">
        <button
          type="button"
          onClick={() => selectEntryType("log")}
          className={`flex-1 rounded-lg px-3 py-2 text-left transition ${
            entryType === "log"
              ? "bg-teal-600/20 text-teal-200 ring-1 ring-teal-700/50"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <span className="block text-[14px] font-medium">{CAPTURE.log}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{CAPTURE.logHint}</span>
        </button>
        <button
          type="button"
          onClick={() => selectEntryType("note")}
          className={`flex-1 rounded-lg px-3 py-2 text-left transition ${
            entryType === "note"
              ? "bg-teal-600/20 text-teal-200 ring-1 ring-teal-700/50"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <span className="block text-[14px] font-medium">{CAPTURE.note}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{CAPTURE.noteHint}</span>
        </button>
      </div>

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

      {selectedTags.length > 0 && (
        <p className="mt-1 text-[12px] text-teal-400/90">
          {TAGS.linkLabel}: {selectedTags.map((t) => `#${t}`).join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <MetaButton
          active={referenceOpen || selectedIds.length > 0}
          onClick={() => setReferenceOpen(true)}
        >
          {CAPTURE.reference}
        </MetaButton>
        <MetaButton active={tagsOpen || selectedTags.length > 0} onClick={() => setTagsOpen(true)}>
          {CAPTURE.tags}
        </MetaButton>
        {entryType === "note" ? (
          <MetaButton active={Boolean(eventDate) || dateOpen} onClick={() => setDateOpen((v) => !v)}>
            {CAPTURE.date}
          </MetaButton>
        ) : null}
        <MetaButton active={Boolean(followUpDate) || reminderOpen} onClick={() => setReminderOpen((v) => !v)}>
          {CAPTURE.reminder}
        </MetaButton>
        <MetaButton active={attachmentOpen} onClick={() => setAttachmentOpen((v) => !v)}>
          {CAPTURE.attachment}
        </MetaButton>
        <MetaButton active={isProtected || protectedOpen} onClick={() => setProtectedOpen((v) => !v)}>
          {CAPTURE.protected}
        </MetaButton>
      </div>

      {protectedOpen ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isProtected}
            onChange={(e) => setIsProtected(e.target.checked)}
            className="rounded border-zinc-700"
          />
          {CAPTURE.protected}
        </label>
      ) : null}

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
        buckets={logBuckets}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        onClose={() => setReferenceOpen(false)}
        allowedCreateKinds={logCreateKinds}
        listMode="all"
      />

      <TagPickerModal
        open={tagsOpen}
        buckets={tagBuckets}
        selectedTags={selectedTags}
        onChange={setSelectedTags}
        onClose={() => setTagsOpen(false)}
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
