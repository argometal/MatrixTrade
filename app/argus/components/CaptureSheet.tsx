"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { CAPTURE, REFERENCES, TAGS } from "@/lib/argus/ux-copy";
import {
  networkConversationNoteTemplate,
  selectedIncludesPerson,
} from "@/lib/argus/network-dialogue";
import { NetworkConversationPlaybook } from "@/app/argus/v2/network/components/NetworkConversationPlaybook";
import { eventDateFromLinkedEntities } from "@/lib/argus/journal-event-origin";
import {
  inferRegisterKindOverride,
  registerContextHint,
  registerShowsDateField,
} from "@/lib/argus/register-infer";
import { V2AttachmentComposer } from "@/app/argus/v2/components/V2AttachmentComposer";
import type { EntityPickerBuckets } from "./ReferencePickerModal";
import type { TagBuckets } from "./TagPickerModal";

export interface CaptureInitial {
  body?: string;
  title?: string;
  inboxId?: string;
  entityIds?: string[];
  /** @deprecated inferred from links — kept for inbox convert compatibility */
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
  const { openLinkModal } = useArgusAdd();
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const [isProtected, setIsProtected] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const kindOverride = useMemo(
    () =>
      inferRegisterKindOverride(buckets.alphabetical, selectedIds, {
        eventDate,
        followUpDate,
      }),
    [buckets.alphabetical, selectedIds, eventDate, followUpDate]
  );
  const showDateField = useMemo(
    () => registerShowsDateField(buckets.alphabetical, selectedIds),
    [buckets.alphabetical, selectedIds]
  );
  const contextHint = useMemo(
    () => registerContextHint(buckets.alphabetical, selectedIds),
    [buckets.alphabetical, selectedIds]
  );

  useEffect(() => {
    if (open) {
      setBody(initial?.body ?? "");
      setTitle(initial?.title ?? "");
      setSelectedIds(initial?.entityIds ?? []);
      setSelectedTags(initial?.topics ?? []);
      setFollowUpDate(initial?.followUpDate?.slice(0, 10) ?? "");
      setIsProtected(false);
      setProtectedOpen(false);
      setPendingFiles([]);
      const linkedDate = eventDateFromLinkedEntities(buckets.alphabetical, initial?.entityIds ?? []);
      const noteDate = initial?.eventDate?.slice(0, 10) || linkedDate || today;
      setEventDate(noteDate);
    }
  }, [
    open,
    initial?.body,
    initial?.title,
    initial?.entityIds,
    initial?.eventDate,
    initial?.followUpDate,
    initial?.topics,
    today,
    buckets.alphabetical,
  ]);

  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      autoOpenedRef.current = false;
      return;
    }
    if (!autoOpenReference || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openLinkModal({
      title: "Link",
      linkedEntityIds: initial?.entityIds ?? [],
      selectedTags: initial?.topics ?? [],
      onConfirm: (result) => {
        setSelectedIds(result.entityIds);
        setSelectedTags(result.tags);
      },
    });
  }, [open, autoOpenReference, initial?.entityIds, initial?.topics, openLinkModal]);

  useEffect(() => {
    if (!open) return;
    const linkedDate = eventDateFromLinkedEntities(buckets.alphabetical, selectedIds);
    if (linkedDate) setEventDate(linkedDate);
  }, [open, selectedIds, buckets.alphabetical]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => bodyRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  function openLinkPicker() {
    openLinkModal({
      title: "Link",
      linkedEntityIds: selectedIds,
      selectedTags,
      onConfirm: (result) => {
        setSelectedIds(result.entityIds);
        setSelectedTags(result.tags);
      },
    });
  }

  if (!open && mode === "modal") return null;

  const canSave = body.trim().length > 0 || pendingFiles.length > 0;
  const selectedNames = selectedIds
    .map((id) => buckets.alphabetical.find((e) => e.id === id)?.name)
    .filter(Boolean);
  const linkedLabel = selectedNames.join(", ");
  const resolvedEventDate = showDateField ? eventDate || today : eventDate || today;
  const linkedPerson = selectedIncludesPerson(buckets.alphabetical, selectedIds);
  const linkedPersonName = linkedPerson
    ? buckets.alphabetical.find(
        (e) => e.type === "person" && selectedIds.includes(e.id)
      )?.name
    : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const file of pendingFiles) {
      formData.append("attachments", file);
    }
    await action(formData);
    setPendingFiles([]);
    onClose();
  }

  const formContent = (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
      {initial?.inboxId && <input type="hidden" name="inboxId" value={initial.inboxId} />}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="title" value={title} />
      {!initial?.inboxId && <input type="hidden" name="returnTo" value="journal" />}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
      <input type="hidden" name="kindOverride" value={kindOverride} />
      <input type="hidden" name="eventDate" value={resolvedEventDate} />
      <input type="hidden" name="followUpDate" value={followUpDate} />
      <input type="hidden" name="topics" value={selectedTags.join(", ")} />
      {isProtected ? <input type="hidden" name="private" value="on" /> : null}
      <input type="hidden" name="source" value={initial?.inboxId ? "inbox" : "manual"} />

      <p className="mb-3 text-[11px] leading-snug text-zinc-500">{contextHint}</p>

      {linkedPerson ? (
        <div className="mb-3">
          <NetworkConversationPlaybook
            compact
            personName={linkedPersonName}
            onUseTemplate={() => {
              const template = networkConversationNoteTemplate(linkedPersonName);
              setBody((current) => (current.trim() ? current : template));
            }}
          />
        </div>
      ) : null}

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
          active={selectedIds.length > 0 || selectedTags.length > 0}
          onClick={openLinkPicker}
        >
          {CAPTURE.reference}
        </MetaButton>
        {showDateField ? (
          <MetaButton active={Boolean(eventDate) || dateOpen} onClick={() => setDateOpen((v) => !v)}>
            {CAPTURE.date}
          </MetaButton>
        ) : null}
        <MetaButton active={Boolean(followUpDate) || reminderOpen} onClick={() => setReminderOpen((v) => !v)}>
          {CAPTURE.reminder}
        </MetaButton>
        <MetaButton active={attachmentOpen || pendingFiles.length > 0} onClick={() => setAttachmentOpen((v) => !v)}>
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

      {dateOpen && showDateField && (
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

      {attachmentOpen ? (
        <div className="mt-3">
          <V2AttachmentComposer files={pendingFiles} onChange={setPendingFiles} enablePaste />
        </div>
      ) : null}

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
