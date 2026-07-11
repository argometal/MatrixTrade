"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Entity, InboxItem, InboxStatus, Log } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { V2InboxEntityLinkModal } from "@/app/argus/v2/inbox/components/V2InboxEntityLinkModal";
import type { ArgusLinkFilter, ArgusLinkResult } from "@/app/argus/components/ArgusLinkModal";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { INBOX, LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import {
  archiveInboxAction,
  saveInboxLinksAction,
  updateInboxTriageAction,
  type CreatedEntityResult,
} from "@/app/argus/actions";
import { V2InboxDeleteControl } from "@/app/argus/v2/inbox/components/V2InboxDeleteControl";
import { V2InboxEmailBody } from "@/app/argus/v2/inbox/components/V2InboxEmailBody";
import {
  entityToV2InboxDetail,
  effectiveInboxStatus,
  inboxStatusAfterLinkChange,
  inboxStatusDisplay,
  suggestInboxEntities,
  suggestInboxTags,
  type InboxTopicContext,
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

type PanelTab = "email" | "attachments" | "links";
const PANEL_TAB_STORAGE_KEY = "argus-inbox-panel-tab";

function readStoredPanelTab(): PanelTab {
  if (typeof window === "undefined") return "email";
  const stored = sessionStorage.getItem(PANEL_TAB_STORAGE_KEY);
  if (stored === "email" || stored === "attachments" || stored === "links") return stored;
  return "email";
}

export function V2InboxDetailPanel({
  detail,
  buckets,
  tagBuckets,
  linkedEntityRecords,
  topicContext,
  onBack,
  deleteUnlocked,
  deleteAuthUnlocked,
  deleteCodeConfigured,
  totpConfigured,
  deleteAuthConfigured,
  requiresAuthenticator,
  deleteError,
  deleteAuthError,
  totpRequired,
}: {
  detail: DetailBundle;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  linkedEntityRecords: Entity[];
  topicContext: InboxTopicContext;
  onBack?: () => void;
  deleteUnlocked: boolean;
  deleteAuthUnlocked: boolean;
  deleteCodeConfigured: boolean;
  totpConfigured: boolean;
  deleteAuthConfigured: boolean;
  requiresAuthenticator: boolean;
  deleteError?: boolean;
  deleteAuthError?: boolean;
  totpRequired?: boolean;
}) {
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", detail.item.id);
    return `/argus/v2/inbox?${params.toString()}`;
  }, [detail.item.id, searchParams]);
  const [panelTab, setPanelTabState] = useState<PanelTab>("email");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkModalFilter, setLinkModalFilter] = useState<ArgusLinkFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>(detail.item.linkedEntityIds ?? []);
  const [status, setStatus] = useState<InboxStatus>(
    inboxStatusAfterLinkChange(detail.item.status, (detail.item.linkedEntityIds ?? []).length) ??
      effectiveInboxStatus(detail.item)
  );
  const [followUpDate, setFollowUpDate] = useState(detail.item.followUpDate ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(detail.item.topics ?? []);
  const [linkSaving, setLinkSaving] = useState(false);
  const [triageSaving, setTriageSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setPanelTabState(readStoredPanelTab());
  }, []);

  function setPanelTab(tab: PanelTab) {
    setPanelTabState(tab);
    sessionStorage.setItem(PANEL_TAB_STORAGE_KEY, tab);
  }

  useEffect(() => {
    setLinkIds(detail.item.linkedEntityIds ?? []);
    setStatus(
      inboxStatusAfterLinkChange(detail.item.status, (detail.item.linkedEntityIds ?? []).length) ??
        effectiveInboxStatus(detail.item)
    );
    setFollowUpDate(detail.item.followUpDate ?? "");
    setSelectedTags(detail.item.topics ?? []);
    setMenuOpen(false);
  }, [detail.item.id, detail.item.linkedEntityIds, detail.item.status, detail.item.followUpDate, detail.item.topics]);

  const { item, view, attachments, linkedEntities, convertedLog, defaultTitle, defaultBody } = detail;
  const canTriage = item.status === "pending" || item.status === "linked";
  const inboxBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "inbox"), [buckets]);

  const suggestedEntities = useMemo(
    () => suggestInboxEntities(view.subject ?? "", view.textBody, linkedEntityRecords, linkIds, topicContext),
    [view.subject, view.textBody, linkedEntityRecords, linkIds, topicContext]
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
      await saveInboxLinksAction(item.id, ids);
      const nextStatus = inboxStatusAfterLinkChange(status, ids.length);
      if (nextStatus) setStatus(nextStatus);
      router.refresh();
    } finally {
      setLinkSaving(false);
    }
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

  async function confirmEntityLinks(result: ArgusLinkResult) {
    setLinkIds(result.entityIds);
    await persistLinks(result.entityIds);
    setSelectedTags(result.tags);
    await persistTriage({ topics: result.tags });
  }

  function openLinkModal(filter: ArgusLinkFilter = "all") {
    setLinkModalFilter(filter);
    setPickerOpen(true);
  }

  const detailTabs = [
    { id: "email" as const, label: "Email" },
    { id: "attachments" as const, label: `Attachments (${attachments.length})` },
    { id: "links" as const, label: "Links" },
  ];

  const statusDisplay = inboxStatusDisplay(status);

  const linksWorkspace = (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-500">
        Connect this email to people, projects, topics, and events. Status updates when you link or unlink — no manual
        triage.
      </p>

      {convertedLog ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-600">Converted to journal</p>
          <Link href={`/argus/logs/${convertedLog.id}`} className="text-sm text-violet-400 hover:text-violet-300">
            {convertedLog.title}
          </Link>
        </div>
      ) : null}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-100">Linked entities</h3>
        {canTriage ? (
          <p className="mb-3 text-[11px] leading-snug text-zinc-500">{LINK_HIERARCHY.inboxLinkHint}</p>
        ) : (
          <div className="mb-3" />
        )}
        <div className="flex flex-wrap gap-2">
          {selectedLinked.map((entity) => (
            <span
              key={entity.id}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${entityChipClass(entity.kind)}`}
            >
              <Link href={entity.href} className="inline-flex items-center gap-2">
                {entityIcon(entity.kind)} {entity.name}
              </Link>
              {canTriage ? (
                <button
                  type="button"
                  onClick={() => removeLink(entity.id)}
                  className="text-zinc-500 hover:text-zinc-300"
                  aria-label={`Remove ${entity.name}`}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          {canTriage ? (
            <button
              type="button"
              onClick={() => openLinkModal("all")}
              className="rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            >
              + Link
            </button>
          ) : null}
          {canTriage && suggestedEntities.length > 0 ? (
            <button
              type="button"
              onClick={() => void applySuggestedEntities()}
              className="rounded-xl bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30"
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
                className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-violet-500/40 hover:text-violet-300"
                title={entity.matchReason}
              >
                + {entity.name}
                {entity.matchReason ? <span className="text-zinc-600"> · {entity.matchReason}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        {!canTriage && selectedLinked.length === 0 ? (
          <p className="text-sm text-zinc-500">No linked entities.</p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-100">Tags</h3>
        <p className="mb-3 text-[11px] leading-snug text-zinc-500">
          Suggestions are inferred from the email — click to add. Only tags you select are saved.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200"
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
              onClick={() => openLinkModal("tags")}
              className="rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
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
                className="rounded-xl bg-violet-600/20 px-2.5 py-1 text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30"
              >
                ✨ Suggest tags
              </button>
            ) : null}
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => void addSuggestedTag(tag)}
                className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-violet-500/40 hover:text-violet-300"
              >
                + {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {canTriage ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">{INBOX.actions}</h3>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                statusDisplay.tone === "violet"
                  ? "bg-violet-500/15 text-violet-300"
                  : statusDisplay.tone === "amber"
                    ? "bg-amber-500/15 text-amber-300"
                    : statusDisplay.tone === "emerald"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {statusDisplay.label}
            </span>
            <span className="text-[11px] text-zinc-600">
              {linkIds.length > 0 ? `${linkIds.length} linked` : "No links yet"}
            </span>
          </div>
          <label className="block text-xs text-zinc-500">
            Follow up (optional)
            <input
              type="date"
              value={followUpDate}
              disabled={triageSaving}
              onChange={(event) => void changeFollowUpDate(event.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={archiveInboxAction} className="inline">
              <input type="hidden" name="inboxId" value={item.id} />
              <input type="hidden" name="returnTo" value={`/argus/v2/inbox?tab=archived`} />
              <button
                type="submit"
                className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Done — archive
              </button>
            </form>
            <V2InboxDeleteControl
              inboxId={item.id}
              returnTo={returnTo}
              requiresAuthenticator={requiresAuthenticator}
              deleteUnlocked={deleteUnlocked}
              deleteAuthUnlocked={deleteAuthUnlocked}
              deleteCodeConfigured={deleteCodeConfigured}
              totpConfigured={totpConfigured}
              deleteAuthConfigured={deleteAuthConfigured}
              deleteError={deleteError}
              deleteAuthError={deleteAuthError}
              totpRequired={totpRequired}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onBack ? (
        <div className="shrink-0 border-b border-zinc-800/80 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            ← Inbox
          </button>
        </div>
      ) : null}
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-zinc-50">{view.subject || "(No subject)"}</h2>
          <div className="relative hidden shrink-0 items-center gap-2 lg:flex">
            {canTriage ? (
              <button
                type="button"
                onClick={() => openLinkModal("all")}
                className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
              >
                {LINK_HIERARCHY.linkEmail}
              </button>
            ) : null}
            <button type="button" className="text-zinc-600 hover:text-zinc-400" title="Share">
              ↗
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="text-zinc-600 hover:text-zinc-400"
              aria-label="More actions"
            >
              ···
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-zinc-700 text-xs font-bold text-violet-100">
            {senderInitials(view.from)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-zinc-200">{view.from.replace(/<.*>/, "").trim() || view.from}</p>
            {view.to ? <p className="text-xs text-zinc-500">To {view.to}</p> : null}
            <p className="text-xs text-zinc-600">
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
              className={`border-b-2 px-3 py-2 text-xs font-medium ${
                panelTab === t.id
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-36 lg:pb-4">
        {panelTab === "email" ? (
          <div className="space-y-4">
            <dl className="grid gap-1.5 rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-4 py-3 text-xs sm:grid-cols-[5rem_1fr]">
              <dt className="text-zinc-600">Status</dt>
              <dd className="text-zinc-400">{statusDisplay.label}</dd>
              <dt className="text-zinc-600">Source</dt>
              <dd className="text-zinc-400">{item.source}</dd>
              {followUpDate ? (
                <>
                  <dt className="text-zinc-600">Follow up</dt>
                  <dd className="text-zinc-400">{followUpDate}</dd>
                </>
              ) : null}
              {selectedLinked.length > 0 ? (
                <>
                  <dt className="text-zinc-600">Linked</dt>
                  <dd className="text-zinc-400">{selectedLinked.map((e) => e.name).join(" · ")}</dd>
                </>
              ) : null}
            </dl>
            <V2InboxEmailBody textBody={view.textBody} htmlBody={view.htmlBody} />
          </div>
        ) : null}
        {panelTab === "attachments" ? (
          attachments.length === 0 ? (
            <p className="text-sm text-zinc-500">No attachments.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id}>
                  <Link
                    href={`/api/argus/files/${att.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
                  >
                    <span>📎 {att.fileName}</span>
                    <span className="text-xs text-zinc-600">{Math.round(att.sizeBytes / 1024)} KB</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {panelTab === "links" ? linksWorkspace : null}
      </div>

      <div className="border-t border-zinc-800/80 px-5 py-3 text-center text-[11px] text-zinc-600">
        ✨ Created for you by Argus AI
      </div>

      <V2InboxEntityLinkModal
        open={pickerOpen}
        buckets={inboxBuckets}
        tagBuckets={tagBuckets}
        selectedIds={linkIds}
        selectedTags={selectedTags}
        initialFilter={linkModalFilter}
        onClose={() => setPickerOpen(false)}
        onConfirm={(result) => void confirmEntityLinks(result)}
        onEntityCreated={linkCreatedEntity}
      />

      {canTriage ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => openLinkModal("all")}
            className="w-full rounded-xl border border-violet-500/40 bg-violet-600/20 py-3 text-sm font-semibold text-violet-300"
          >
            {LINK_HIERARCHY.linkEmail}
          </button>
        </div>
      ) : null}
    </div>
  );
}
