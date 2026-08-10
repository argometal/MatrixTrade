"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { appendEventChronicleEntryAction } from "@/app/argus/actions";
import type { V2EventDetail, V2EventInboxOption } from "@/lib/argus/v2/event-browse-utils";
import { V2AttachmentComposer } from "@/app/argus/v2/components/V2AttachmentComposer";
import { V2EventLinkEmailModal } from "./V2EventLinkEmailModal";
import { V2QuickDeliverButton } from "@/app/argus/v2/components/V2QuickDeliverModal";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";
import { V2PrivateEvidenceGate } from "@/app/argus/v2/components/V2PrivateEvidenceGate";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { V2TagPatternBadges } from "@/app/argus/v2/components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "@/app/argus/v2/components/V2RecordRecentEntity";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2DetailCompactHeader } from "@/app/argus/v2/components/V2DetailCompactHeader";
import { V2MobileUnlockedManageBar } from "@/app/argus/v2/components/V2MobileUnlockedManageBar";
import { V2EntityRunbooksTab } from "@/app/argus/v2/components/V2EntityRunbooksTab";
import { V2EntityLinksTab } from "@/app/argus/v2/components/V2EntityLinksTab";
import { V2TrackerTogglePanel } from "@/app/argus/v2/components/V2TrackerTogglePanel";
import {
  V2ChronicleSelectableList,
  chronicleLogIdFromEvidenceId,
} from "@/app/argus/v2/components/V2ChronicleSelectableList";
import { TagPickerModal } from "@/app/argus/components/TagPickerModal";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import { LINK_HIERARCHY, TAGS } from "@/lib/argus/ux-copy";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { libraryRunbooksForRelated, progressForEntity, runbooksForEntity } from "@/lib/argus/runbook-helpers";

type PanelTab = "note" | "chronicle" | "runbooks" | "tags" | "links";

function EvidenceIcon({ kind }: { kind: V2EventDetail["evidence"][0]["kind"] }) {
  if (kind === "email") return <>✉</>;
  if (kind === "photo") return <>📷</>;
  if (kind === "file") return <>📎</>;
  return <>📓</>;
}

export function V2EventDetailPanel({
  selected,
  inboxOptions,
  returnTo,
  neighborhood,
  onBack,
  privateConfigured = false,
  privateUnlocked = false,
  allRunbooks = [],
  allProgress = [],
  signalTags = [],
  ...deleteGate
}: {
  selected: V2EventDetail;
  inboxOptions: V2EventInboxOption[];
  returnTo: string;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  onBack?: () => void;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
  allRunbooks?: Runbook[];
  allProgress?: RunbookProgress[];
  signalTags?: string[];
} & V2DeleteGateProps) {
  const router = useRouter();
  const { tagBuckets } = useArgusAdd();
  const [panelTab, setPanelTab] = useState<PanelTab>("note");
  const [composer, setComposer] = useState("");
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [focusTags, setFocusTags] = useState<string[]>(signalTags);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const privateLocked = selected.hasPrivateEvidence && !privateUnlocked;
  const mobileDetail = Boolean(onBack);
  const compactChrome = mobileDetail && panelTab !== "note" && panelTab !== "tags";
  // Bottom manage bar when private unlock is active; otherwise Edit stays in the header.
  const showMobileManageBar = mobileDetail && privateUnlocked;

  useEffect(() => {
    setFocusTags(signalTags);
  }, [signalTags]);

  const lifecycle = (
    <V2EntityLifecycleActions
      entityId={selected.id}
      entityName={selected.name}
      entityKind="event"
      lifecycleStatus={selected.lifecycleStatus}
      returnTo={returnTo}
      hasPrivateEvidence={selected.hasPrivateEvidence}
      privateConfigured={privateConfigured}
      privateUnlocked={privateUnlocked}
      showDelete
      variant="menu"
      {...deleteGate}
    />
  );

  const linkedRunbooks = useMemo(
    () => runbooksForEntity(allRunbooks, selected.id),
    [allRunbooks, selected.id]
  );
  const libraryRunbooks = useMemo(
    () => libraryRunbooksForRelated(allRunbooks, selected.linkedEntityIds),
    [allRunbooks, selected.linkedEntityIds]
  );
  const progressRecords = useMemo(
    () => progressForEntity(allProgress, selected.id),
    [allProgress, selected.id]
  );

  const canSave = composer.trim().length > 0 || pendingFiles.length > 0;

  useEffect(() => {
    setComposer("");
    setEntryTags([]);
    setPendingFiles([]);
    setSaveNote(null);
  }, [selected.id]);

  const eventTagCounts = useMemo(() => {
    const map = new Map<string, { tag: string; count: number }>();
    for (const pattern of selected.tagPatterns) {
      map.set(pattern.tag.toLowerCase(), { tag: pattern.tag, count: pattern.count });
    }
    for (const raw of selected.topicTags) {
      const tag = raw.trim().replace(/\s+/g, " ");
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!map.has(key)) map.set(key, { tag, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [selected.tagPatterns, selected.topicTags]);

  const topicPoolTags = useMemo(() => {
    const evidenceKeys = new Set(eventTagCounts.map((row) => row.tag.toLowerCase()));
    const rows: Array<{ tag: string; count?: number }> = [];
    for (const raw of selected.topicContextTags) {
      const tag = raw.trim().replace(/\s+/g, " ");
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (evidenceKeys.has(key)) continue;
      if (rows.some((r) => r.tag.toLowerCase() === key)) continue;
      rows.push({ tag });
    }
    return rows.sort((a, b) => a.tag.localeCompare(b.tag));
  }, [selected.topicContextTags, eventTagCounts]);

  const noteQuickTags = useMemo(() => {
    const fromTopic = selected.topicContextTags.map((t) => t.trim().replace(/\s+/g, " ")).filter(Boolean);
    const fromEvidence = eventTagCounts.map((r) => r.tag);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tag of [...fromTopic, ...fromEvidence]) {
      const key = tag.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
      if (out.length >= 10) break;
    }
    return out;
  }, [selected.topicContextTags, eventTagCounts]);

  function toggleEntryTag(tag: string) {
    const key = tag.toLowerCase();
    setEntryTags((current) => {
      if (current.some((t) => t.toLowerCase() === key)) {
        return current.filter((t) => t.toLowerCase() !== key);
      }
      return [...current, tag];
    });
  }

  /** Evidence-scoped buckets first (ORDER 001) — not the raw journal-wide list alone. */
  const noteTagBuckets = useMemo(() => {
    const local = noteQuickTags;
    const topicPool = selected.topicContextTags
      .map((t) => t.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    const seen = new Set<string>();
    const merge = (...lists: string[][]) => {
      const out: string[] = [];
      for (const list of lists) {
        for (const tag of list) {
          const key = tag.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(tag);
        }
      }
      return out;
    };
    const recent = local.length > 0 ? local : merge(topicPool).slice(0, 10);
    return {
      recent,
      frequent: recent,
      all: merge(local, topicPool, tagBuckets.all),
    };
  }, [noteQuickTags, selected.topicContextTags, tagBuckets.all]);

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    setSaveNote(null);
    try {
      const formData = new FormData();
      formData.set("eventId", selected.id);
      formData.set("body", composer);
      formData.set("entryTags", entryTags.join(", "));
      for (const file of pendingFiles) {
        formData.append("attachments", file);
      }
      const result = await appendEventChronicleEntryAction(formData);
      setComposer("");
      setEntryTags([]);
      setPendingFiles([]);
      setSaveNote(result.appended ? "Added to chronicle" : "Nothing to save");
      if (result.appended) setPanelTab("chronicle");
      router.refresh();
    } catch {
      setSaveNote("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "note", label: "Note" },
    { id: "chronicle", label: "Chronicle" },
    { id: "runbooks", label: "Runbooks" },
    { id: "tags", label: "Tags" },
    { id: "links", label: "Links" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onBack ? (
        <div className="shrink-0 border-b border-zinc-800/80 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            ← Events
          </button>
        </div>
      ) : null}
      <V2RecordRecentEntity
        id={selected.id}
        kind="event"
        label={selected.name}
        href={`/argus/v2/browse/events?selected=${selected.id}`}
      />
      <div className="shrink-0 border-b border-zinc-800/80 p-5">
        <V2DetailCompactHeader
          mobileDetail={mobileDetail}
          compact={compactChrome}
          title={selected.name}
          subtitle={selected.dateTimeLabel}
          collapsedExtra={
            <>
              {panelTab === "links" ? (
                <V2EntityLinkButton
                  entityId={selected.id}
                  linkedIds={selected.linkedEntityIds}
                  subtitle={LINK_HIERARCHY.inboxLinkHint}
                  className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/25"
                />
              ) : null}
              <V2QuickDeliverButton scopeType="event" scopeId={selected.id} scopeName={selected.name} label="PDF" />
              {/* Compact chrome used to hide Edit; keep rename/delete reachable */}
              {!showMobileManageBar ? lifecycle : null}
            </>
          }
          expanded={
            <>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
                    {selected.lifecycleStatus === "archived" ? (
                      <span
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400"
                        title="Completed uses Archive — out of active triage and metric counts"
                      >
                        Completed
                      </span>
                    ) : null}
                    {selected.lifecycleStatus === "archived" ? (
                      <V2IntelHelpLink topic="event-completed" label="Completed" />
                    ) : null}
                    <div className={showMobileManageBar ? "hidden lg:block" : undefined}>{lifecycle}</div>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{selected.dateTimeLabel}</p>
                  <p className="mt-1.5 text-[11px] text-zinc-600">{selected.description}</p>
                </div>
                {selected.tagPatterns.length > 0 ? (
                  <V2TagPatternBadges
                    patterns={selected.tagPatterns}
                    signalTags={signalTags}
                    className="mt-3"
                  />
                ) : null}
                <div className="flex shrink-0 flex-wrap gap-2">
                  <V2QuickDeliverButton scopeType="event" scopeId={selected.id} scopeName={selected.name} />
                  <button
                    type="button"
                    onClick={() => setEmailOpen(true)}
                    className="rounded-lg border border-sky-500/40 bg-sky-600/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/25"
                  >
                    Link email
                  </button>
                  <V2EntityLinkButton
                    entityId={selected.id}
                    linkedIds={selected.linkedEntityIds}
                    className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
                  />
                  <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
                </div>
              </div>

              {selected.meetingUrl ? (
                <a
                  href={selected.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 inline-flex rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/15"
                >
                  Meeting link ↗
                </a>
              ) : null}

              {selected.projectName && selected.projectHref ? (
                <Link href={selected.projectHref} className="mb-3 block text-sm text-violet-400 hover:text-violet-300">
                  📁 {selected.projectName}
                </Link>
              ) : null}
            </>
          }
        />

        <div className="flex gap-1 border-b border-zinc-800/80">
          {tabs.map((t) => (
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

      <div
        className={`argus-v2-scroll min-h-0 flex-1 overflow-y-auto p-5 ${showMobileManageBar ? "pb-24 lg:pb-5" : ""}`}
      >
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          {panelTab === "note" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-zinc-300">Add to chronicle</p>
                  <V2IntelHelpLink topic="event-note" label="Event Note" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || !canSave}
                    onClick={() => void saveEntry()}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  {saveNote ? <span className="text-xs text-zinc-500">{saveNote}</span> : null}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/5">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={12}
                  placeholder="What happened, who was involved, decisions, open items…"
                  className="w-full resize-y rounded-xl border-0 bg-transparent px-5 py-4 text-[15px] leading-[1.7] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-300">{TAGS.titleOnNote}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{TAGS.pickerHintOnNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTagPickerOpen(true)}
                    className="shrink-0 rounded-lg border border-teal-500/40 bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-900/50"
                  >
                    {entryTags.length > 0 ? `Browse tags (${entryTags.length})` : "Browse / create tags"}
                  </button>
                </div>

                {noteQuickTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {noteQuickTags.map((tag) => {
                      const selectedOnNote = entryTags.some((t) => t.toLowerCase() === tag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleEntryTag(tag)}
                          aria-pressed={selectedOnNote}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                            selectedOnNote
                              ? "bg-teal-950/60 text-teal-100 ring-teal-400/50"
                              : "bg-zinc-950/40 text-zinc-400 ring-zinc-700/80 hover:text-zinc-200"
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-600">
                    {selected.linkedTopics.length === 0
                      ? "No Topic linked — browse to create Evidence Tags on this Note, or Link a Topic for a Topic pool."
                      : "No Topic Tags yet — browse to create one on this Note (does not Flag a Tracker)."}
                  </p>
                )}

                {entryTags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-800/70 pt-2">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">On this note</span>
                    {entryTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-teal-950/40 px-2.5 py-0.5 text-[11px] font-medium text-teal-200 ring-1 ring-teal-500/30"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setEntryTags((current) => current.filter((t) => t !== tag))}
                          className="text-teal-400/80 hover:text-teal-100"
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <V2AttachmentComposer files={pendingFiles} onChange={setPendingFiles} enablePaste />

              <TagPickerModal
                open={tagPickerOpen}
                buckets={noteTagBuckets}
                selectedTags={entryTags}
                onChange={setEntryTags}
                onClose={() => setTagPickerOpen(false)}
                mode="note"
                topicContextTags={selected.topicContextTags}
                topicContextLabel={
                  selected.linkedTopics.length === 1
                    ? `In ${selected.linkedTopics[0].name}`
                    : selected.linkedTopics.length > 1
                      ? TAGS.sectionTopicLinked
                      : selected.linkedTopics.length === 0
                        ? "Link a Topic to unlock Topic pool"
                        : undefined
                }
              />
            </div>
          ) : null}

          {panelTab === "chronicle" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-300">Chronicle</p>
                <V2IntelHelpLink topic="event-chronicle" label="Event Chronicle" />
              </div>
              <V2ChronicleSelectableList
                key={selected.id}
                returnTo={returnTo}
                requiresAuthenticator={false}
                deleteUnlocked={deleteGate.deleteUnlocked}
                deleteAuthUnlocked={deleteGate.deleteAuthUnlocked}
                deleteCodeConfigured={deleteGate.deleteCodeConfigured}
                totpConfigured={deleteGate.totpConfigured}
                deleteAuthConfigured={deleteGate.deleteAuthConfigured}
                deleteError={deleteGate.deleteError}
                deleteAuthError={deleteGate.deleteAuthError}
                totpRequired={deleteGate.totpRequired}
                empty={
                  <p className="text-sm text-zinc-500">
                    No entries yet. Write a note, attach files, or link an email.
                  </p>
                }
                items={selected.evidence.map((item) => ({
                  key: item.id,
                  logId: chronicleLogIdFromEvidenceId(item.id),
                  title: item.title,
                  href: item.href,
                  external: item.kind === "photo",
                  body: (
                    <>
                      <span className="mt-0.5 text-sm text-zinc-500">
                        <EvidenceIcon kind={item.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-100">{item.title}</span>
                        <span className="block text-xs text-zinc-500">{item.meta}</span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600">
                        {item.kind === "journal" ? "note" : item.kind}
                      </span>
                    </>
                  ),
                }))}
              />
            </div>
          ) : null}

          {panelTab === "runbooks" ? (
            <V2EntityRunbooksTab
              level="event"
              entityId={selected.id}
              linkedRunbooks={linkedRunbooks}
              libraryRunbooks={libraryRunbooks}
              progressRecords={progressRecords}
            />
          ) : null}

          {panelTab === "tags" ? (
            <div className="space-y-4">
              <V2TrackerTogglePanel
                evidenceTags={eventTagCounts}
                poolTags={topicPoolTags}
                signalTags={focusTags}
                onSignalTagsChange={setFocusTags}
                surfaceLabel="this Event"
                scopeId={selected.id}
                heading="Tags · Trackers"
                helpTopic="event-tags"
                emptyEvidenceHint="No Tags on this Event’s Notes yet — add them on Note, or Draft below (session only)."
                addPlaceholder="Name a Tag…"
                noteCta={
                  <button
                    type="button"
                    onClick={() => setPanelTab("note")}
                    className="font-medium text-teal-300/90 hover:text-teal-200"
                  >
                    Put Tags on a Note →
                  </button>
                }
              />
            </div>
          ) : null}

          {panelTab === "links" ? (
            <V2EntityLinksTab
              entityId={selected.id}
              linkedIds={selected.linkedEntityIds}
              helpTopic="event-links"
              helpLabel="Event Links"
              intro={LINK_HIERARCHY.inboxLinkHint}
              metrics={[
                { icon: "🏢", label: "Orgs", count: selected.orgCount },
                { icon: "📁", label: "Proj", count: selected.projectCount },
                { icon: "👤", label: "People", count: selected.peopleCount },
                { icon: "🏷", label: "Topics", count: selected.topicCount },
              ]}
              sections={[
                {
                  title: "Topics",
                  linkLabel: "Link topic",
                  initialFilter: "topic",
                  subtitle: "Link Topics so this Event's Notes roll into Topic Chronicle.",
                  entities: selected.linkedTopics.map((t) => ({
                    id: t.id,
                    name: t.name,
                    href: t.href,
                    icon: "🏷",
                  })),
                  tone: "topic",
                },
                {
                  title: "Organizations",
                  linkLabel: "Link org",
                  initialFilter: "organization",
                  subtitle: LINK_HIERARCHY.topicLinkOrgs,
                  entities: selected.linkedOrgs,
                },
                {
                  title: "Projects",
                  linkLabel: "Link project",
                  initialFilter: "project",
                  subtitle: LINK_HIERARCHY.topicLinkProjects,
                  entities: selected.linkedProjects,
                },
                {
                  title: "People",
                  linkLabel: "Link person",
                  initialFilter: "person",
                  subtitle: LINK_HIERARCHY.topicLinkPeople,
                  entities: selected.linkedPeople,
                },
              ]}
              evidenceCounts={[
                { label: "Emails", value: selected.relatedEmails.length },
                { label: "Notes", value: selected.chronicleCount },
                {
                  label: "Photos",
                  value: selected.evidence.filter((e) => e.kind === "photo").length,
                },
              ]}
              neighborhood={neighborhood}
              entityName={selected.name}
            />
          ) : null}
        </V2PrivateEvidenceGate>
      </div>

      <V2MobileUnlockedManageBar
        visible={showMobileManageBar}
        entityId={selected.id}
        entityName={selected.name}
        entityKind="event"
        lifecycleStatus={selected.lifecycleStatus}
        returnTo={returnTo}
        hasPrivateEvidence={selected.hasPrivateEvidence}
        privateConfigured={privateConfigured}
        privateUnlocked={privateUnlocked}
        showDelete
        {...deleteGate}
      />

      <V2EventLinkEmailModal
        open={emailOpen}
        eventId={selected.id}
        options={inboxOptions}
        onClose={() => setEmailOpen(false)}
        onLinked={() => router.refresh()}
      />
    </div>
  );
}
