"use client";

import { useState } from "react";
import { JOURNAL_KINDS, JOURNAL_KIND_LABELS } from "@/lib/argus/labels";
import { inferJournalKind } from "@/lib/argus/journal-helpers";
import type { ReferenceKind } from "@/lib/argus/reference-types";
import type { JournalKind } from "@/lib/argus/types";
import { AttachmentField } from "./AttachmentField";
import { EntityPicker, type EntityPickerBuckets } from "./EntityPicker";
import { Field, inputClass, textareaClass } from "./ui";

interface JournalEntryFormProps {
  action: (formData: FormData) => Promise<void>;
  buckets: EntityPickerBuckets;
  submitLabel?: string;
  initial?: {
    title?: string;
    body?: string;
    inboxId?: string;
  };
}

const STEPS = [
  { n: 1, label: "Entity" },
  { n: 2, label: "Write" },
  { n: 3, label: "Details" },
];

export function JournalEntryForm({
  action,
  buckets,
  submitLabel = "Save",
  initial,
}: JournalEntryFormProps) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [entityStepValid, setEntityStepValid] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [eventDate, setEventDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [kindOverride, setKindOverride] = useState<JournalKind | "">("");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateKind, setQuickCreateKind] = useState<ReferenceKind>("person");
  const [quickCreateNotes, setQuickCreateNotes] = useState("");

  const inferredKind = inferJournalKind({
    followUpDate: followUpDate || undefined,
    eventDate: eventDate || undefined,
    kindOverride: kindOverride || undefined,
  });

  function canAdvance(): boolean {
    if (step === 1) return entityStepValid;
    if (step === 2) return title.trim().length > 0 && body.trim().length > 0;
    return true;
  }

  return (
    <form action={action} className="space-y-5">
      {initial?.inboxId && <input type="hidden" name="inboxId" value={initial.inboxId} />}
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}

      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        {STEPS.map((s, i) => (
          <span key={s.n} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-700">→</span>}
            <button
              type="button"
              onClick={() => s.n < step && setStep(s.n)}
              className={`rounded-full px-2.5 py-1 font-medium ${
                step === s.n
                  ? "bg-teal-600/25 text-teal-300"
                  : s.n < step
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-zinc-600"
              }`}
            >
              {s.n}. {s.label}
            </button>
          </span>
        ))}
      </nav>

      {step === 1 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Who is this about?</h2>
            <p className="mt-1 text-sm text-zinc-500">Select one or more entities. Journal never exists alone.</p>
          </div>
          <EntityPicker
            buckets={buckets}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            onValidityChange={setEntityStepValid}
            quickCreateName={quickCreateName}
            onQuickCreateNameChange={setQuickCreateName}
            quickCreateKind={quickCreateKind}
            onQuickCreateKindChange={setQuickCreateKind}
            quickCreateNotes={quickCreateNotes}
            onQuickCreateNotesChange={setQuickCreateNotes}
          />
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep(2)}
            className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">What happened?</h2>
            <p className="mt-1 text-sm text-zinc-500">Capture facts first. Classification comes later.</p>
          </div>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Brief summary"
            />
          </Field>
          <Field label="What happened">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={textareaClass}
              placeholder="Facts only — who, what, when, where."
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-400"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canAdvance()}
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Optional details</h2>
            <p className="mt-1 text-sm text-zinc-500">
              ARGUS will save as{" "}
              <span className="text-teal-400">{JOURNAL_KIND_LABELS[inferredKind]}</span>
              {inferredKind === "log" && " (default)"}
            </p>
          </div>

          <Field label="Event date (optional)">
            <input
              name="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-zinc-600">Set when this is a dated event.</p>
          </Field>

          <Field label="Follow-up date (optional)">
            <input
              name="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-zinc-600">Set when you need to revisit this.</p>
          </Field>

          <Field label="Attachment (optional)">
            <AttachmentField />
          </Field>

          <label className="flex items-center gap-2 rounded-xl border border-violet-900/50 bg-violet-950/20 p-3 text-sm text-violet-200">
            <input type="checkbox" name="private" />
            Private
          </label>

          <details className="rounded-xl border border-zinc-800 p-3">
            <summary className="cursor-pointer text-sm font-medium text-zinc-400">Advanced</summary>
            <div className="mt-3 space-y-3">
              <Field label="Override type">
                <select
                  name="kindOverride"
                  className={inputClass}
                  value={kindOverride}
                  onChange={(e) => setKindOverride(e.target.value as JournalKind | "")}
                >
                  <option value="">Auto ({JOURNAL_KIND_LABELS[inferredKind]})</option>
                  {JOURNAL_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {JOURNAL_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Topics (comma-separated)">
                <input name="topics" className={inputClass} placeholder="networking, project-x..." />
              </Field>
            </div>
          </details>

          <input type="hidden" name="source" value={initial?.inboxId ? "inbox" : "manual"} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-400"
            >
              Back
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-3 font-semibold text-white">
              {submitLabel}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
