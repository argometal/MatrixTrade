"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Entity, InboxItem, InboxStatus, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { TagPickerModal } from "@/app/argus/components/TagPickerModal";
import { CaptureSheet } from "@/app/argus/components/CaptureSheet";
import { V2InboxEntityLinkModal } from "@/app/argus/v2/inbox/components/V2InboxEntityLinkModal";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { INBOX, LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import {
  archiveInboxAction,
  convertInboxAction,
  setInboxLinksAction,
  updateInboxTriageAction,
  type CreatedEntityResult,
} from "@/app/argus/actions";
import {
  entityToV2InboxDetail,
  suggestInboxEntities,
  suggestInboxTags,
  type V2InboxDetailEntity,
} from "@/lib/argus/v2/inbox-loaders";

type DetailBundle = {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  linkedEntities: V2InboxDetailEntity[];
  convertedLog?: Log;
  defaultTitle: string;
  defaultBody: string;
};

function senderInitials(from: string): string {
  const name = from.replace(/<.*>/, "").trim() || from;
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function entityChipClass(kind: V2InboxDetailEntity["kind"]): string {
  if (kind === "project") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (kind === "organization") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (kind === "topic") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (kind === "event") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-zinc-700 bg-zinc-800/80 text-zinc-300";
}

function entityIcon(kind: V2InboxDetailEntity["kind"]): string {
  if (kind === "project") return "📁";
  if (kind === "organization") return "🏢";
  if (kind === "topic") return "🏷";
  if (kind === "event") return "📅";
  return "👤";
}

export function V2InboxDetailPanel({
  detail,
  buckets,
  tagBuckets,
  linkedEntityRecords,
}: {
  detail: DetailBundle;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
}) {
  const [panelTab, setPanelTab] = useState<"email" | "details" | "attachments" | "related">("email");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>(detail.item.linkedEntityIds ?? []);
  const [status, setStatus] = useState<InboxStatus>(detail.item.status);
  const [followUpDate, setFollowUpDate] = useState(detail.item.followUpDate ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(detail.item.topics ?? []);
  const [linkSaving, setLinkSaving] = useState(false);
  const [triageSaving, setTriageSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLinkIds(detail.item.linkedEntityIds ?? []);
    setStatus(detail.item.status);
    setFollowUpDate(detail.item.followUpDate ?? "");
    setSelectedTags(detail.item.topics ?? []);
    setShowConvert(false);
    setMenuOpen(false);
    setPanelTab("email");
  }, [detail.item.id, detail.item.linkedEntityIds, detail.item.status, detail.item.followUpDate, detail.item.topics]);

  const { item, view, attachments, linkedEntities, convertedLog, defaultTitle, defaultBody } = detail;
  const canTriage = item.status === "pending" || item.status === "linked";
  const inboxBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "inbox"), [buckets]);
  const returnTo = `/argus/v2/inbox?selected=${item.id}`;

  const suggestedEntities = useMemo(
    () => suggestInboxEntities(view.subject ?? "", view.textBody, linkedEntityRecords, linkIds),
    [view.subject, view.textBody, linkedEntityRecords, linkIds]
  );

  const entityRecordMap = useMemo(
    () => new Map(linkedEntityRecords.map((entity) => [entity.id, entity])),
    [linkedEntityRecords]
  );

  const resolveDetailEntity = entityToV2InboxDetail;

  const selectedLinked = linkIds
    .map((id) => {
      const fromServer = linkedEntities.find((entity) => entity.id === id);
      if (fromServer) return fromServer;
      const entity = entityRecordMap.get(id);
      return entity ? resolveDetailEntity(entity) : undefined;
    })
    .filter((entity): entity is V2InboxDetailEntity => Boolean(entity));

  const suggestedTags = useMemo(
    () =>
      suggestInboxTags(view.subject ?? "", view.textBody, selectedLinked).filter((tag) => !selectedTags.includes(tag)),
    [view.subject, view.textBody, selectedLinked, selectedTags]
  );

  async function persistTriage(patch: {
    status?: InboxStatus;
    followUpDate?: string | null;
    topics?: string[];
  }) {
    setTriageSaving(true);
    try {
      await updateInboxTriageAction(item.id, patch);
      router.refresh();
    } finally {
      setTriageSaving(false);
    }
  }

  async function changeStatus(next: InboxStatus) {
    setStatus(next);
    await persistTriage({ status: next });
  }

  async function changeFollowUpDate(next: string) {
    setFollowUpDate(next);
    await persistTriage({ followUpDate: next || null });
  }

  async function addSuggestedTag(tag: string) {
    if (selectedTags.includes(tag)) return;
    const next = [...selectedTags, tag];
    setSelectedTags(next);
    await persistTriage({ topics: next });
  }

  async function removeTag(tag: string) {
    const next = selectedTags.filter((value) => value !== tag);
    setSelectedTags(next);
    await persistTriage({ topics: next });
  }

  async function applySuggestedTags() {
    const next = [...selectedTags];
    for (const tag of suggestedTags.slice(0, 5)) {
      if (!next.includes(tag)) next.push(tag);
    }
    if (next.length === selectedTags.length) return;
    setSelectedTags(next);
    await persistTriage({ topics: next });
  }

  async function persistLinks(ids: string[]) {
    setLinkSaving(true);
    try {
      const formData = new FormData();
      formData.set("inboxId", item.id);
      formData.set("returnTo", returnTo);
      for (const id of ids) formData.append("entityIds", id);
      await setInboxLinksAction(formData);
    } finally {
      setLinkSaving(false);
    }
  }

  function submitLinks() {
    void persistLinks(linkIds);
  }

  async function removeLink(id: string) {
    const next = linkIds.filter((value) => value !== id);
    setLinkIds(next);
    await persistLinks(next);
  }

  async function addSuggestedEntity(entity: V2InboxDetailEntity) {
    if (linkIds.includes(entity.id)) return;
    const next = [...linkIds, entity.id];
    setLinkIds(next);
    await persistLinks(next);
  }

  async function applySuggestedEntities() {
    const next = [...linkIds];
    for (const entity of suggestedEntities.slice(0, 3)) {
      if (!next.includes(entity.id)) next.push(entity.id);
    }
    if (next.length === linkIds.length) return;
    setLinkIds(next);
    await persistLinks(next);
  }

  async function linkCreatedEntity(entity: CreatedEntityResult): Promise<false> {
    const next = [...linkIds, entity.id];
    setLinkIds(next);
    await persistLinks(next);
    return false;
  }

  async function confirmEntityLinks(ids: string[]) {
    setLinkIds(ids);
    await persistLinks(ids);
  }

  const detailTabs = [
    { id: "email" as const, label: "Email" },
    { id: "details" as const, label: "Details" },
    { id: "attachments" as const, label: `Attachments (${attachments.length})` },
    { id: "related" as const, label: "Related" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-zinc-50">{view.subject || "(No subject)"}</h2>
          <div className="relative flex shrink-0 items-center gap-2">
            {canTriage ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-sm font-semibold text-violet-300 hover:bg-violet-600/25"
              >
                + Link
              </button>
            ) : null}
            <button type="button" className="text-zinc-400 hover:text-zinc-400" title="Share">
              ↗
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="text-zinc-400 hover:text-zinc-400"
              aria-label="More actions"
            >
              ···
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
                {canTriage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowConvert(true);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    {INBOX.convertRecord}
                  </button>
                ) : null}
                {convertedLog ? (
                  <Link
                    href={`/argus/logs/${convertedLog.id}`}
                    className="block rounded-lg px-3 py-2 text-sm text-violet-400 hover:bg-zinc-800"
                    onClick={() => setMenuOpen(false)}
                  >
                    View journal record
                  </Link>
                ) : null}
                <Link
                  href={`/argus/inbox/${item.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
                  onClick={() => setMenuOpen(false)}
                >
                  Open legacy view
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-zinc-700 text-sm font-bold text-violet-100">
            {senderInitials(view.from)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-zinc-200">{view.from.replace(/<.*>/, "").trim() || view.from}</p>
            {view.to ? <p className="text-sm text-zinc-400">To {view.to}</p> : null}
            <p className="text-sm text-zinc-400">
              {new Date(view.receivedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-b border-zinc-800/80">
          {detailTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanelTab(t.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                panelTab === t.id
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {panelTab === "email" ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{view.textBody}</div>
        ) : null}
        {panelTab === "details" ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-[6rem_1fr]">
            <dt className="text-zinc-400">From</dt>
            <dd className="text-zinc-200">{view.from}</dd>
            <dt className="text-zinc-400">To</dt>
            <dd className="text-zinc-200">{view.to || "—"}</dd>
            <dt className="text-zinc-400">Status</dt>
            <dd className="text-zinc-200">{INBOX_STATUS_LABELS[status]}</dd>
            <dt className="text-zinc-400">Follow up</dt>
            <dd className="text-zinc-200">{followUpDate || "—"}</dd>
            <dt className="text-zinc-400">Source</dt>
            <dd className="text-zinc-200">{item.source}</dd>
          </dl>
        ) : null}
        {panelTab === "attachments" ? (
          attachments.length === 0 ? (
            <p className="text-sm text-zinc-400">No attachments.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id}>
                  <Link
                    href={`/api/argus/files/${att.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
                  >
                    <span>📎 {att.fileName}</span>
                    <span className="text-sm text-zinc-400">{Math.round(att.sizeBytes / 1024)} KB</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {panelTab === "related" ? (
          selectedLinked.length === 0 && !convertedLog ? (
            <p className="text-sm text-zinc-400">No linked entities yet.</p>
          ) : (
            <ul className="space-y-2">
              {selectedLinked.map((entity) => (
                <li key={entity.id}>
                  <Link href={entity.href} className="text-sm text-violet-400 hover:text-violet-300">
                    {entity.label}: {entity.name}
                  </Link>
                </li>
              ))}
              {convertedLog ? (
                <li>
                  <Link href={`/argus/logs/${convertedLog.id}`} className="text-sm text-violet-400 hover:text-violet-300">
                    Journal: {convertedLog.title}
                  </Link>
                </li>
              ) : null}
            </ul>
          )
        ) : null}

        <div className="mt-6 space-y-5 border-t border-zinc-800/80 pt-6">
          <div>
            <h3 className="mb-1 text-base font-semibold text-zinc-100">Linked entities</h3>
            {canTriage ? (
              <p className="mb-3 text-sm leading-snug text-zinc-400">{LINK_HIERARCHY.inboxLinkHint}</p>
            ) : (
              <div className="mb-3" />
            )}
            <div className="flex flex-wrap gap-2">
              {selectedLinked.map((entity) => (
                <span
                  key={entity.id}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${entityChipClass(entity.kind)}`}
                >
                  <Link href={entity.href} className="inline-flex items-center gap-2">
                    {entityIcon(entity.kind)} {entity.name}
                  </Link>
                  {canTriage ? (
                    <button
                      type="button"
                      onClick={() => removeLink(entity.id)}
                      className="text-zinc-400 hover:text-zinc-300"
                      aria-label={`Remove ${entity.name}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {canTriage && suggestedEntities.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void applySuggestedEntities()}
                  className="rounded-xl bg-violet-600/20 px-3 py-2 text-sm font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30"
                >
                  ✨ Suggest entities
                </button>
              ) : null}
            </div>
            {canTriage && suggestedEntities.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedEntities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => void addSuggestedEntity(entity)}
                    className="rounded-full border border-zinc-800 px-2 py-0.5 text-sm text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                  >
                    + {entity.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="mb-1 text-base font-semibold text-zinc-100">Tags</h3>
            <p className="mb-3 text-sm leading-snug text-zinc-400">
              Suggestions are inferred from the email — click to add. Only tags you select are saved.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-sm text-violet-200"
                >
                  {tag}
                  {canTriage ? (
                    <button
                      type="button"
                      onClick={() => void removeTag(tag)}
                      className="text-violet-400/70 hover:text-violet-200"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {canTriage ? (
                <button
                  type="button"
                  onClick={() => setTagPickerOpen(true)}
                  className="rounded-md border border-dashed border-zinc-700 px-2 py-1 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                >
                  + Add tag
                </button>
              ) : null}
            </div>
            {canTriage && suggestedTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {suggestedTags.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => void applySuggestedTags()}
                    className="rounded-xl bg-violet-600/20 px-2.5 py-1 text-sm font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30"
                  >
                    ✨ Suggest tags
                  </button>
                ) : null}
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => void addSuggestedTag(tag)}
                    className="rounded-full border border-zinc-800 px-2 py-0.5 text-sm text-zinc-400 hover:border-violet-500/40 hover:text-violet-300"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {canTriage ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
              <h3 className="mb-3 text-base font-semibold text-zinc-100">{INBOX.actions}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-zinc-400">
                  Status
                  <select
                    value={status}
                    disabled={triageSaving}
                    onChange={(event) => void changeStatus(event.target.value as InboxStatus)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                  >
                    <option value="pending">Unread</option>
                    <option value="linked">In Progress</option>
                  </select>
                </label>
                <label className="block text-sm text-zinc-400">
                  Follow up
                  <input
                    type="date"
                    value={followUpDate}
                    disabled={triageSaving}
                    onChange={(event) => void changeFollowUpDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitLinks}
                  disabled={linkIds.length === 0 || linkSaving}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  {linkSaving ? "Saving…" : INBOX.saveLink}
                </button>
                <form action={archiveInboxAction} className="inline">
                  <input type="hidden" name="inboxId" value={item.id} />
                  <input type="hidden" name="returnTo" value={`/argus/v2/inbox?tab=archived`} />
                  <button
                    type="submit"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    {INBOX.archive}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setShowConvert(true)}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  {INBOX.convertRecord}
                </button>
              </div>
            </div>
          ) : null}

          {showConvert && canTriage ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
              <p className="mb-2 text-base font-medium text-zinc-200">{INBOX.convertHeading}</p>
              <p className="mb-3 text-sm text-zinc-400">{INBOX.convertHint}</p>
              <CaptureSheet
                open
                action={convertInboxAction}
                buckets={buckets}
                tagBuckets={tagBuckets}
                mode="embedded"
                onClose={() => setShowConvert(false)}
                initial={{
                  title: defaultTitle,
                  body: defaultBody,
                  inboxId: item.id,
                  entityIds: linkIds,
                  topics: selectedTags,
                  followUpDate,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-800/80 px-5 py-3 text-center text-sm text-zinc-400">
        ✨ Created for you by Argus AI
      </div>

      <V2InboxEntityLinkModal
        open={pickerOpen}
        buckets={inboxBuckets}
        selectedIds={linkIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => void confirmEntityLinks(ids)}
        onEntityCreated={linkCreatedEntity}
      />

      <TagPickerModal
        open={tagPickerOpen}
        buckets={tagBuckets}
        selectedTags={selectedTags}
        onChange={(tags) => {
          setSelectedTags(tags);
          void persistTriage({ topics: tags });
        }}
        onClose={() => setTagPickerOpen(false)}
      />
    </div>
  );
}
