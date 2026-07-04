"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createEntityInlineAction } from "@/app/argus/actions";
import { createInputToReferenceKind, entityNotesForDisplay, type ReferenceKind } from "@/lib/argus/reference-types";
import type { Entity, Log } from "@/lib/argus/types";
import { ACTIVITY_EDIT, TAGS } from "@/lib/argus/ux-copy";
import { JOURNAL_KIND_LABELS, LOG_SOURCE_LABELS } from "@/lib/argus/labels";
import { EntityChip } from "./Cards";
import { ReferenceCreateModal } from "./ReferenceCreateModal";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
import { TagPickerModal, type TagBuckets } from "./TagPickerModal";
import { inputClass } from "./ui";

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

function initialEventDate(log: Log): string {
  if (log.kind === "event") return log.date.slice(0, 10);
  return "";
}

function initialFollowUpDate(log: Log): string {
  if (log.followUpDate) return log.followUpDate.slice(0, 10);
  if (log.kind === "follow_up") return log.date.slice(0, 10);
  return "";
}

export function ActivityEditPanel({
  log,
  buckets,
  tagBuckets,
  attachments,
  inboxLink,
  action,
}: {
  log: Log;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  attachments: { id: string; fileName: string }[];
  inboxLink?: { id: string; hasRaw: boolean };
  action: (formData: FormData) => Promise<void>;
}) {
  const [title, setTitle] = useState(log.title);
  const [body, setBody] = useState(log.body);
  const [selectedIds, setSelectedIds] = useState<string[]>(log.entityIds);
  const [selectedTags, setSelectedTags] = useState<string[]>(log.topics);
  const [eventDate, setEventDate] = useState(initialEventDate(log));
  const [followUpDate, setFollowUpDate] = useState(initialFollowUpDate(log));
  const [dateOpen, setDateOpen] = useState(Boolean(initialEventDate(log)));
  const [reminderOpen, setReminderOpen] = useState(Boolean(initialFollowUpDate(log)));
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<ReferenceKind>("project");
  const [, startCreate] = useTransition();

  const entityMap = useMemo(
    () => new Map(buckets.alphabetical.map((e) => [e.id, e])),
    [buckets.alphabetical]
  );

  const linkedEntities = selectedIds
    .map((id) => entityMap.get(id))
    .filter((e): e is Entity => Boolean(e));

  const canSave = body.trim().length > 0;

  function openCreate(kind: ReferenceKind) {
    setCreateKind(kind);
    setCreateOpen(true);
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="logId" value={log.id} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="eventDate" value={eventDate} />
      <input type="hidden" name="followUpDate" value={followUpDate} />
      <input type="hidden" name="topics" value={selectedTags.join(", ")} />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-600/20 px-2.5 py-0.5 text-xs text-teal-400">
            {JOURNAL_KIND_LABELS[log.kind]}
          </span>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {LOG_SOURCE_LABELS[log.source]}
          </span>
          {log.classificationStatus === "needs_classification" && (
            <span className="rounded-full bg-amber-600/20 px-2.5 py-0.5 text-xs text-amber-300">
              Needs classification
            </span>
          )}
          {log.private && (
            <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs text-violet-300">
              Private
            </span>
          )}
        </div>

        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{ACTIVITY_EDIT.title}</p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mt-3 w-full border-0 bg-transparent text-[15px] font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Notes"
          className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {ACTIVITY_EDIT.relationships}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <MetaButton
              active={referenceOpen || selectedIds.length > 0}
              onClick={() => setReferenceOpen(true)}
            >
              {ACTIVITY_EDIT.linkTo}
            </MetaButton>
            <MetaButton active={tagsOpen || selectedTags.length > 0} onClick={() => setTagsOpen(true)}>
              {ACTIVITY_EDIT.tags}
            </MetaButton>
            <MetaButton active={Boolean(eventDate) || dateOpen} onClick={() => setDateOpen((v) => !v)}>
              {ACTIVITY_EDIT.date}
            </MetaButton>
            <MetaButton active={Boolean(followUpDate) || reminderOpen} onClick={() => setReminderOpen((v) => !v)}>
              {ACTIVITY_EDIT.reminder}
            </MetaButton>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreate("project")}
              className="rounded-full border border-zinc-700 px-3 py-1 text-[12px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {ACTIVITY_EDIT.newProject}
            </button>
            <button
              type="button"
              onClick={() => openCreate("topic")}
              className="rounded-full border border-zinc-700 px-3 py-1 text-[12px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              {ACTIVITY_EDIT.newTopic}
            </button>
          </div>

          {dateOpen && (
            <label className="mt-3 block">
              <span className="text-xs text-zinc-500">{ACTIVITY_EDIT.date}</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
          )}

          {reminderOpen && (
            <label className="mt-3 block">
              <span className="text-xs text-zinc-500">{ACTIVITY_EDIT.reminder}</span>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
          )}

          {linkedEntities.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[12px] text-teal-400/90">{ACTIVITY_EDIT.linkedLabel}</p>
              <div className="flex flex-wrap gap-2">
                {linkedEntities.map((e) => (
                  <EntityChip key={e.id} entity={e} />
                ))}
              </div>
            </div>
          )}

          {selectedTags.length > 0 && (
            <p className="mt-2 text-[12px] text-teal-400/90">
              {TAGS.linkLabel}: {selectedTags.map((t) => `#${t}`).join(", ")}
            </p>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">{ACTIVITY_EDIT.attachments}</p>
            {attachments.map((att) => (
              <Link
                key={att.id}
                href={`/api/argus/files/${att.id}`}
                className="block text-xs text-teal-500 underline"
              >
                {att.fileName}
              </Link>
            ))}
          </div>
        )}

        {inboxLink && (
          <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            {ACTIVITY_EDIT.fromInbox}:{" "}
            <Link href={`/argus/inbox/${inboxLink.id}`} className="text-teal-500 underline">
              {ACTIVITY_EDIT.viewOriginal}
            </Link>
            {inboxLink.hasRaw && ` · ${ACTIVITY_EDIT.rawPreserved}`}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/argus/journal"
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-center text-[15px] text-zinc-400 hover:bg-zinc-800"
        >
          {ACTIVITY_EDIT.cancel}
        </Link>
        <button
          type="submit"
          disabled={!canSave}
          className="flex-1 rounded-xl bg-teal-600 py-2.5 text-[15px] font-semibold text-white hover:bg-teal-500 disabled:opacity-35"
        >
          {ACTIVITY_EDIT.save}
        </button>
      </div>

      <ReferencePickerModal
        open={referenceOpen}
        buckets={buckets}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        onClose={() => setReferenceOpen(false)}
      />

      <TagPickerModal
        open={tagsOpen}
        buckets={tagBuckets}
        selectedTags={selectedTags}
        onChange={setSelectedTags}
        onClose={() => setTagsOpen(false)}
      />

      <ReferenceCreateModal
        open={createOpen}
        defaultKind={createKind}
        onCancel={() => setCreateOpen(false)}
        onSave={(data) => {
          startCreate(async () => {
            const kind = createInputToReferenceKind(data.entityType, data.notes);
            const entity = await createEntityInlineAction(
              kind,
              data.name,
              entityNotesForDisplay(data.notes)
            );
            setSelectedIds((prev) => [...prev, entity.id]);
            setCreateOpen(false);
          });
        }}
      />
    </form>
  );
}
