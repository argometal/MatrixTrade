"use client";

import { useEffect, useRef, useState } from "react";
import { referenceKindToCreateInput, createInputToReferenceKind, type ReferenceKind } from "@/lib/argus/reference-types";
import type { EntityType } from "@/lib/argus/types";
import { COMPOSER, REFERENCES } from "@/lib/argus/ux-copy";
import { AttachmentField } from "./AttachmentField";
import { ReferenceLinkPanel, type EntityPickerBuckets } from "./ReferenceLinkPanel";

export type CaptureIntent = "case" | "evidence" | "event" | "log";

export interface MemoryComposerInitial {
  body?: string;
  title?: string;
  inboxId?: string;
  entityIds?: string[];
}

const INTENT_COPY: Record<
  CaptureIntent,
  { placeholder: string; submitLabel: string; kindOverride?: "follow_up" | "event" | "log" }
> = {
  case: {
    placeholder: COMPOSER.case.placeholder,
    submitLabel: COMPOSER.case.submit,
    kindOverride: "follow_up",
  },
  evidence: {
    placeholder: COMPOSER.evidence.placeholder,
    submitLabel: COMPOSER.evidence.submit,
  },
  event: {
    placeholder: COMPOSER.event.placeholder,
    submitLabel: COMPOSER.event.submit,
    kindOverride: "event",
  },
  log: {
    placeholder: COMPOSER.log.placeholder,
    submitLabel: COMPOSER.log.submit,
  },
};

interface MemoryComposerProps {
  action: (formData: FormData) => Promise<void>;
  buckets: EntityPickerBuckets;
  initial?: MemoryComposerInitial;
  intent?: CaptureIntent;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  variant?: "inline" | "sheet";
  initialPanel?: "none" | "entity" | "more";
  initialQuickCreateType?: EntityType;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[13px] transition ${
        active
          ? "bg-teal-500/15 text-teal-300"
          : "text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export function MemoryComposer({
  action,
  buckets,
  initial,
  intent = "log",
  submitLabel,
  onCancel,
  autoFocus = true,
  variant = "inline",
  initialPanel = "none",
  initialQuickCreateType,
}: MemoryComposerProps) {
  const copy = INTENT_COPY[intent];
  const resolvedSubmitLabel = submitLabel ?? copy.submitLabel;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initial?.body ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.entityIds ?? []);
  const [eventDate, setEventDate] = useState(intent === "event" ? new Date().toISOString().slice(0, 10) : "");
  const [followUpDate, setFollowUpDate] = useState("");
  const [moreOpen, setMoreOpen] = useState(initialPanel === "more");
  const [linkOpen, setLinkOpen] = useState(initialPanel === "entity" || Boolean(initialQuickCreateType));
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateKind, setQuickCreateKind] = useState<ReferenceKind>(
    initialQuickCreateType === "company"
      ? "organization"
      : initialQuickCreateType === "project"
        ? "project"
        : "person"
  );
  const [quickCreateNotes, setQuickCreateNotes] = useState("");
  const quickCreatePayload = referenceKindToCreateInput(
    quickCreateKind,
    quickCreateName,
    quickCreateNotes
  );

  useEffect(() => {
    if (autoFocus && !linkOpen) bodyRef.current?.focus();
  }, [autoFocus, linkOpen]);

  useEffect(() => {
    if (initialQuickCreateType) {
      setQuickCreateKind(
        initialQuickCreateType === "company"
          ? "organization"
          : initialQuickCreateType === "project"
            ? "project"
            : "person"
      );
      setLinkOpen(true);
    }
  }, [initialQuickCreateType]);

  useEffect(() => {
    if (initialPanel === "entity") setLinkOpen(true);
  }, [initialPanel]);

  const canSave = body.trim().length > 0;
  const selectedNames = selectedIds
    .map((id) => buckets.alphabetical.find((e) => e.id === id)?.name)
    .filter(Boolean);
  const linkedLabel = [
    ...selectedNames,
    ...(quickCreateName.trim() ? [quickCreateName.trim()] : []),
  ].join(", ");

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col">
      {initial?.inboxId && <input type="hidden" name="inboxId" value={initial.inboxId} />}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="title" value={title} />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
      {quickCreateName.trim() && (
        <>
          <input type="hidden" name="newEntityName" value={quickCreateName.trim()} />
          <input type="hidden" name="newEntityType" value={quickCreatePayload.entityType} />
          <input type="hidden" name="newEntityNotes" value={quickCreatePayload.notes} />
        </>
      )}
      <input type="hidden" name="eventDate" value={eventDate} />
      <input type="hidden" name="followUpDate" value={followUpDate} />
      <input type="hidden" name="source" value={initial?.inboxId ? "inbox" : "manual"} />
      {copy.kindOverride && <input type="hidden" name="kindOverride" value={copy.kindOverride} />}

      {variant === "sheet" && (
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="text-[15px] text-zinc-500 hover:text-zinc-300"
          >
            {REFERENCES.cancel}
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="text-[15px] font-semibold text-teal-400 disabled:opacity-30"
          >
            {resolvedSubmitLabel}
          </button>
        </div>
      )}

      <div className={`flex min-h-0 flex-1 ${linkOpen ? "flex-col sm:flex-row" : "flex-col"}`}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={copy.placeholder}
            rows={variant === "sheet" ? 12 : 6}
            className="w-full flex-1 resize-none bg-transparent text-[17px] leading-[1.55] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />

          {linkedLabel && (
            <p className="mb-2 text-[12px] text-teal-400/90">
              {REFERENCES.linkLabel}: {linkedLabel}
            </p>
          )}

          <div className="mt-auto space-y-3 pt-4">
            <div className="flex flex-wrap items-center gap-1 border-t border-zinc-800/60 pt-3">
              <Chip active={linkOpen || selectedIds.length > 0 || Boolean(quickCreateName)} onClick={() => setLinkOpen((v) => !v)}>
                @
              </Chip>
              <button
                type="button"
                onClick={() => setLinkOpen((v) => !v)}
                className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition ${
                  linkOpen || selectedIds.length > 0 || quickCreateName
                    ? "bg-teal-500/15 text-teal-300"
                    : "border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {REFERENCES.link}
              </button>
              <Chip
                active={Boolean(eventDate)}
                onClick={() => {
                  setMoreOpen(true);
                  if (!eventDate) setEventDate(new Date().toISOString().slice(0, 10));
                }}
              >
                Date
              </Chip>
              <Chip active={Boolean(followUpDate)} onClick={() => setMoreOpen(true)}>
                Reminder
              </Chip>
              <Chip active={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                ···
              </Chip>
            </div>

            {moreOpen && (
              <div className="space-y-4 rounded-lg bg-zinc-900/60 p-4">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-600">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Optional — auto from first line"
                    className="mt-1 w-full border-0 border-b border-zinc-800 bg-transparent py-2 text-[15px] text-zinc-200 placeholder:text-zinc-600 focus:border-teal-700 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-600">Occurred</span>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1 w-full bg-transparent text-[14px] text-zinc-300 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-600">Reminder</span>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="mt-1 w-full bg-transparent text-[14px] text-zinc-300 focus:outline-none"
                    />
                  </label>
                </div>
                <AttachmentField />
                <label className="flex items-center gap-2 text-[14px] text-zinc-400">
                  <input type="checkbox" name="private" className="rounded border-zinc-700" />
                  Private
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-600">Topics</span>
                  <input
                    name="topics"
                    placeholder="optional, comma-separated"
                    className="mt-1 w-full border-0 border-b border-zinc-800 bg-transparent py-2 text-[14px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {variant === "inline" && (
              <div className="flex gap-3">
                {onCancel && (
                  <button type="button" onClick={onCancel} className="text-[14px] text-zinc-500 hover:text-zinc-300">
                    {REFERENCES.cancel}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSave}
                  className="ml-auto text-[15px] font-semibold text-teal-400 disabled:opacity-30"
                >
                  {resolvedSubmitLabel}
                </button>
              </div>
            )}
          </div>
        </div>

        {linkOpen && (
          <ReferenceLinkPanel
            open={linkOpen}
            buckets={buckets}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            onClose={() => setLinkOpen(false)}
            pendingNewName={quickCreateName.trim() || undefined}
            onPendingNew={(data) => {
              if (!data) {
                setQuickCreateName("");
                setQuickCreateNotes("");
                return;
              }
              setQuickCreateName(data.name);
              setQuickCreateKind(createInputToReferenceKind(data.entityType, data.notes));
              setQuickCreateNotes(data.notes);
            }}
          />
        )}
      </div>
    </form>
  );
}
