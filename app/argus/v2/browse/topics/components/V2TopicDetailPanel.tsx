"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { V2EvidenceStreamKind } from "@/lib/argus/v2/evidence-stream";
import type { V2TopicDetail, V2TopicLinkedEntity } from "@/lib/argus/v2/topic-browse-utils";
import { V2QuickDeliverButton } from "@/app/argus/v2/components/V2QuickDeliverModal";
import { V2BinderTagsTab } from "@/app/argus/v2/components/V2BinderTagsTab";
import { V2TopicAliasEditor } from "./V2TopicAliasEditor";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";
import { V2PrivateEvidenceGate } from "@/app/argus/v2/components/V2PrivateEvidenceGate";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { V2TagPatternBadges } from "@/app/argus/v2/components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "@/app/argus/v2/components/V2RecordRecentEntity";
import { V2DetailCompactHeader } from "@/app/argus/v2/components/V2DetailCompactHeader";
import { V2MobileUnlockedManageBar } from "@/app/argus/v2/components/V2MobileUnlockedManageBar";
import { V2EntityRunbooksTab } from "@/app/argus/v2/components/V2EntityRunbooksTab";
import {
  V2EntityLinksTab,
  type V2LinksEntity,
} from "@/app/argus/v2/components/V2EntityLinksTab";
import {
  V2ChronicleSelectableList,
  chronicleLogIdFromEvidenceId,
} from "@/app/argus/v2/components/V2ChronicleSelectableList";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import { V2EvidenceMixDonut } from "@/app/argus/v2/components/V2EvidenceMixDonut";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { libraryRunbooksForRelated, progressForEntity, runbooksForEntity } from "@/lib/argus/runbook-helpers";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "@/app/argus/v2/components/tag-manage-list";

/** Topic = evidence binder → Chronicle only (Timeline stays on Org/Project). */
type PanelTab = "chronicle" | "runbooks" | "links" | "tags";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "chronicle", label: "Chronicle" },
  { id: "runbooks", label: "Runbooks" },
  { id: "links", label: "Links" },
  { id: "tags", label: "Tags" },
];

function splitLinkedByKind(linked: V2TopicLinkedEntity[]) {
  const orgs: V2TopicLinkedEntity[] = [];
  const projects: V2TopicLinkedEntity[] = [];
  const people: V2TopicLinkedEntity[] = [];
  const other: V2TopicLinkedEntity[] = [];
  for (const entity of linked) {
    if (entity.icon === "🏢") orgs.push(entity);
    else if (entity.icon === "📁") projects.push(entity);
    else if (entity.icon === "👤") people.push(entity);
    else if (entity.icon === "📅") continue;
    else other.push(entity);
  }
  return { orgs, projects, people, other };
}

function EvidenceIcon({ kind }: { kind: V2EvidenceStreamKind }) {
  if (kind === "email") return <>✉</>;
  if (kind === "photo") return <>📷</>;
  if (kind === "file") return <>📎</>;
  return <>📓</>;
}

function MetricPill({
  icon,
  label,
  count,
  onClick,
}: {
  icon: string;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="text-[11px] leading-none" aria-hidden>
        {icon}
      </span>
      <span className="mt-1 text-[11px] font-semibold tabular-nums leading-none text-violet-300/90">
        {count}
      </span>
      <span className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">{label}</span>
    </>
  );
  if (!onClick) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-900/50 px-2 py-2 ring-1 ring-zinc-800/70">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-lg bg-zinc-900/50 px-2 py-2 ring-1 ring-zinc-800/70 transition hover:ring-violet-500/40"
    >
      {body}
    </button>
  );
}

export function V2TopicDetailPanel({
  selected,
  neighborhood,
  returnTo,
  onBack,
  privateConfigured = false,
  privateUnlocked = false,
  allRunbooks = [],
  allProgress = [],
  signalTags = [],
  ...deleteGate
}: {
  selected: V2TopicDetail;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  returnTo: string;
  onBack?: () => void;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
  allRunbooks?: Runbook[];
  allProgress?: RunbookProgress[];
  signalTags?: string[];
} & V2DeleteGateProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>("chronicle");
  const [focusTags, setFocusTags] = useState<string[]>(signalTags);
  const [inspectEventId, setInspectEventId] = useState<string | null>(null);
  const privateLocked = selected.hasPrivateEvidence && !privateUnlocked;

  useEffect(() => {
    setFocusTags(signalTags);
  }, [signalTags, selected.id]);

  useEffect(() => {
    setInspectEventId(null);
  }, [selected.id]);

  const inspectEvent = useMemo(() => {
    if (!inspectEventId) return null;
    const linked = selected.linkedEvents.find((event) => event.id === inspectEventId);
    if (!linked) return null;
    const rollup = selected.eventEvidenceTags.find((event) => event.id === inspectEventId);
    return {
      ...linked,
      tags: rollup?.tags ?? [],
      noteCount: rollup?.noteCount ?? 0,
      emailCount: rollup?.emailCount ?? 0,
      eventTagCount: rollup?.eventTags?.length ?? 0,
      noteTagCount: rollup?.noteTags?.length ?? 0,
    };
  }, [inspectEventId, selected.linkedEvents, selected.eventEvidenceTags]);

  const inspectEventMix = useMemo(() => {
    if (!inspectEvent) return [];
    const segments = [
      {
        key: "notes",
        label: "Notes",
        value: inspectEvent.noteCount,
        color: "#a78bfa",
      },
      {
        key: "emails",
        label: "Emails",
        value: inspectEvent.emailCount,
        color: "#38bdf8",
      },
      {
        key: "event-tags",
        label: "Event tags",
        value: inspectEvent.eventTagCount,
        color: "#fb7185",
      },
      {
        key: "note-tags",
        label: "Note tags",
        value: inspectEvent.noteTagCount,
        color: "#fbbf24",
      },
    ];
    return segments.filter((seg) => seg.value > 0);
  }, [inspectEvent]);
  const mobileDetail = Boolean(onBack);
  const compactChrome = mobileDetail;
  const showMobileManageBar = mobileDetail && privateUnlocked;
  const attachmentCount = selected.fileCount + selected.photoCount;
  const { orgs: linkedOrgs, projects: linkedProjects, people: linkedPeople, other: linkedOther } =
    useMemo(() => splitLinkedByKind(selected.linkedEntities), [selected.linkedEntities]);

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

  const lifecycle = (
    <V2EntityLifecycleActions
      entityId={selected.id}
      entityName={selected.name}
      entityKind="topic"
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onBack ? (
        <div className="shrink-0 border-b border-zinc-800/80 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            ← Topics
          </button>
        </div>
      ) : null}
      <V2RecordRecentEntity
        id={selected.id}
        kind="topic"
        label={selected.name}
        href={`/argus/v2/browse/topics?selected=${selected.id}`}
      />
      <div className="shrink-0 border-b border-zinc-800/80 p-3 sm:p-5">
        <V2DetailCompactHeader
          mobileDetail={mobileDetail}
          compact={compactChrome}
          title={selected.name}
          subtitle={selected.category}
          collapsedExtra={
            <>
              {panelTab === "links" ? (
                <V2EntityLinkButton
                  entityId={selected.id}
                  linkedIds={selected.linkedEntityIds}
                  subtitle={LINK_HIERARCHY.topicEventsHint}
                  className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/25"
                  buttonTitle={LINK_HIERARCHY.topicEventsHint}
                />
              ) : null}
              <V2QuickDeliverButton
                scopeType="topic"
                scopeId={selected.id}
                scopeName={selected.name}
                label="PDF"
              />
              {/* Compact chrome used to hide ···; keep delete reachable unless the unlocked manage bar is up */}
              {!showMobileManageBar ? lifecycle : null}
            </>
          }
          expanded={
            <>
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
                <div className="min-w-0 w-full lg:flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full break-words text-xl font-bold text-zinc-50 sm:truncate">
                      {selected.name}
                    </h2>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-500/25">
                      {selected.category}
                    </span>
                    <div className={showMobileManageBar ? "hidden lg:block" : undefined}>{lifecycle}</div>
                  </div>
                  <p className="hidden max-w-xl text-sm leading-relaxed text-zinc-400 sm:block">
                    {selected.description}
                  </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0">
                  <V2QuickDeliverButton
                    scopeType="topic"
                    scopeId={selected.id}
                    scopeName={selected.name}
                  />
                  <V2EntityLinkButton
                    entityId={selected.id}
                    linkedIds={selected.linkedEntityIds}
                    subtitle={LINK_HIERARCHY.topicEventsHint}
                    className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
                    buttonTitle={LINK_HIERARCHY.topicEventsHint}
                  />
                  <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
                </div>
              </div>

              {selected.tagPatterns.length > 0 ? (
                <V2TagPatternBadges
                  patterns={selected.tagPatterns}
                  signalTags={focusTags}
                  className="mb-3"
                  orientation="stack"
                  tagHref={(tag) =>
                    `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&selected=${selected.id}`
                  }
                />
              ) : null}

              {privateLocked ? (
                <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
                  Protected evidence on this topic — unlock with PIN to view counts and linked data.
                </p>
              ) : (
                <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-4">
                  <MetricPill
                    icon="📓"
                    label="Notes"
                    count={selected.journalCount}
                    onClick={() => setPanelTab("chronicle")}
                  />
                  <MetricPill
                    icon="✉"
                    label="Email"
                    count={selected.emailCount}
                    onClick={() => setPanelTab("chronicle")}
                  />
                  <MetricPill
                    icon="📎"
                    label="Attachments"
                    count={attachmentCount}
                    onClick={() => setPanelTab("chronicle")}
                  />
                  <MetricPill
                    icon="🔗"
                    label="Links"
                    count={
                      selected.eventCount +
                      selected.orgCount +
                      selected.projectCount +
                      selected.peopleCount
                    }
                    onClick={() => setPanelTab("links")}
                  />
                </div>
              )}
            </>
          }
        />

        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800/80">
          {PANEL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanelTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium ${
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
        className={`argus-v2-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 ${showMobileManageBar ? "pb-24 lg:pb-5" : ""}`}
      >
        <V2PrivateEvidenceGate
          locked={privateLocked}
          privateConfigured={privateConfigured}
          returnTo={returnTo}
        >
          {panelTab === "chronicle" ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <V2IntelHelpLink topic="topic-chronicle" label="Topic Chronicle" />
              </div>
              <V2ChronicleSelectableList
                key={selected.id}
                returnTo={returnTo}
                requiresAuthenticator
                deleteUnlocked={deleteGate.deleteUnlocked}
                deleteAuthUnlocked={deleteGate.deleteAuthUnlocked}
                deleteCodeConfigured={deleteGate.deleteCodeConfigured}
                totpConfigured={deleteGate.totpConfigured}
                deleteAuthConfigured={deleteGate.deleteAuthConfigured}
                deleteError={deleteGate.deleteError}
                deleteAuthError={deleteGate.deleteAuthError}
                totpRequired={deleteGate.totpRequired}
                empty={<p className="text-sm text-zinc-500">No evidence yet.</p>}
                items={selected.evidence.map((item) => ({
                  key: item.id,
                  logId: chronicleLogIdFromEvidenceId(item.id),
                  title: item.title,
                  href: item.href,
                  external: item.kind === "photo" || item.kind === "file",
                  preview: item.preview,
                  body: (
                    <>
                      <span className="mt-0.5 text-sm text-zinc-500">
                        <EvidenceIcon kind={item.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-200">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-zinc-600">{item.meta}</span>
                      </span>
                    </>
                  ),
                  footer:
                    (item.tags && item.tags.length > 0) || item.sourceEventHref ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {item.tags?.slice(0, 8).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-zinc-700/80 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300"
                          >
                            #{tag}
                          </span>
                        ))}
                        {item.tags && item.tags.length > 8 ? (
                          <span className="text-[10px] text-zinc-600">+{item.tags.length - 8}</span>
                        ) : null}
                        {item.sourceEventHref ? (
                          <Link
                            href={item.sourceEventHref}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-950/30 px-2 py-0.5 text-[10px] font-semibold text-rose-100 hover:bg-rose-950/55"
                            title={
                              item.sourceEventName
                                ? `Open Event · ${item.sourceEventName}`
                                : "Open Event"
                            }
                          >
                            <span aria-hidden>📅</span>
                            {item.sourceEventName
                              ? `Open Event · ${item.sourceEventName}`
                              : "Open Event"}
                            <span aria-hidden>→</span>
                          </Link>
                        ) : null}
                      </div>
                    ) : undefined,
                }))}
              />
            </div>
          ) : null}

          {panelTab === "runbooks" ? (
            <V2EntityRunbooksTab
              level="topic"
              entityId={selected.id}
              linkedRunbooks={linkedRunbooks}
              libraryRunbooks={libraryRunbooks}
              progressRecords={progressRecords}
              organizationId={linkedOrgs[0]?.id}
              organizationName={linkedOrgs[0]?.name}
              suggestionTags={[
                ...selected.tagPatterns.map((pattern) => pattern.tag),
                ...selected.aliases,
              ]}
              suggestionPriorityTags={selected.tagPatterns.map((pattern) => pattern.tag)}
            />
          ) : null}

          {panelTab === "links" ? (
            <V2EntityLinksTab
              entityId={selected.id}
              linkedIds={selected.linkedEntityIds}
              helpTopic="topic-links"
              helpLabel="Topic Links"
              intro={LINK_HIERARCHY.topicEventsHint}
              metrics={[
                { icon: "📅", label: "Events", count: selected.eventCount },
                { icon: "🏢", label: "Orgs", count: selected.orgCount },
                { icon: "📁", label: "Proj", count: selected.projectCount },
                { icon: "👤", label: "People", count: selected.peopleCount },
              ]}
              selectedEntityId={inspectEventId}
              onSelectEntity={(entity: V2LinksEntity | null) => {
                setInspectEventId(entity?.id ?? null);
              }}
              inspectSlot={
                inspectEvent ? (
                  <section
                    className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3"
                    aria-label={`Selected event ${inspectEvent.name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-200/80">
                          Selected event
                        </p>
                        <h4 className="mt-0.5 truncate text-sm font-semibold text-zinc-50">
                          {inspectEvent.name}
                        </h4>
                        {inspectEvent.dateLabel ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{inspectEvent.dateLabel}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Inspect properties here · open the Event to read its Chronicle.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectEventId(null)}
                        className="shrink-0 rounded-lg border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={inspectEvent.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-600/25 px-3 py-2 text-xs font-semibold text-rose-50 hover:bg-rose-600/40"
                      >
                        Open Event →
                      </Link>
                      <Link
                        href={inspectEvent.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                      >
                        View Event Chronicle →
                      </Link>
                    </div>
                    <div className="mt-4 rounded-xl border border-rose-500/20 bg-zinc-950/50 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-rose-200/70">
                        Quick view · evidence mix
                      </p>
                      <V2EvidenceMixDonut
                        segments={inspectEventMix}
                        size="sm"
                        emptyLabel="No notes, emails, or tags on this Event yet"
                        centerLabel={
                          inspectEvent.noteCount + inspectEvent.emailCount > 0
                            ? String(inspectEvent.noteCount + inspectEvent.emailCount)
                            : undefined
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Tags on this Event
                      </p>
                      {inspectEvent.tags.length === 0 ? (
                        <p className="mt-1.5 text-xs text-zinc-600">No tags on this Event yet.</p>
                      ) : (
                        <ul className={`mt-2 ${TAG_MANAGE_LIST_CLASS}`} aria-label="Tags on selected Event">
                          {inspectEvent.tags.map((tag) => (
                            <li key={tag}>
                              <span className={TAG_MANAGE_ROW_CLASS}>
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200"
                                  aria-hidden
                                >
                                  #
                                </span>
                                <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">
                                  {tag}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ) : selected.linkedEvents.length > 0 ? (
                  <p className="text-xs text-zinc-600">
                    Click an Event to inspect · Open Event / double-click / ··· to enter.
                  </p>
                ) : null
              }
              sections={[
                {
                  title: "Events",
                  linkLabel: "Link event",
                  initialFilter: "event",
                  subtitle: LINK_HIERARCHY.topicLinkEvents,
                  browseHref: `/argus/v2/browse/events?entity=${selected.id}`,
                  entities: selected.linkedEvents.map((event) => ({
                    id: event.id,
                    name: event.name,
                    href: event.href,
                    icon: "📅",
                    meta: event.dateLabel,
                  })),
                  tone: "event",
                  selectToInspect: true,
                },
                {
                  title: "Organizations",
                  linkLabel: "Link org",
                  initialFilter: "organization",
                  subtitle: LINK_HIERARCHY.topicLinkOrgs,
                  entities: linkedOrgs,
                },
                {
                  title: "Projects",
                  linkLabel: "Link project",
                  initialFilter: "project",
                  subtitle: LINK_HIERARCHY.topicLinkProjects,
                  entities: linkedProjects,
                },
                {
                  title: "People",
                  linkLabel: "Link person",
                  initialFilter: "person",
                  subtitle: LINK_HIERARCHY.topicLinkPeople,
                  entities: linkedPeople,
                },
                ...(linkedOther.length > 0
                  ? [
                      {
                        title: "Other",
                        linkLabel: "Link",
                        initialFilter: "all" as const,
                        subtitle: LINK_HIERARCHY.inboxLinkHint,
                        entities: linkedOther,
                      },
                    ]
                  : []),
              ]}
              evidenceCounts={[
                { label: "Notes", value: selected.journalCount },
                { label: "Emails", value: selected.emailCount },
                { label: "Attachments", value: attachmentCount },
              ]}
              neighborhood={neighborhood}
              entityName={selected.name}
              manualTags={selected.aliases}
              tagPatterns={selected.tagPatterns}
              signalTags={focusTags}
              tagsHeading="Linked to this Topic"
              tagHref={(tag) =>
                `/argus/v2/browse/topics?selected=${encodeURIComponent(selected.id)}&tag=${encodeURIComponent(tag)}&focus=1&from=tags`
              }
            />
          ) : null}

          {panelTab === "tags" ? (
            <div className="space-y-4">
              <V2BinderTagsTab
                attachedHeading="Topic Tags"
                attachedBadge="Binder"
                attachedHint="Tags attached to this Topic binder — not Note Tags."
                attachedTags={selected.aliases}
                attachedTagHref={(tag) =>
                  `/argus/v2/browse/topics?selected=${encodeURIComponent(selected.id)}&tag=${encodeURIComponent(tag)}&focus=1&from=tags`
                }
                helpTopic="topic-tags"
                attachedEditor={
                  <V2TopicAliasEditor
                    topicId={selected.id}
                    topicName={selected.name}
                    initialAliases={selected.aliases}
                    suggestedFromNotes={[
                      ...selected.topicDirectEvidenceTagCounts.map((row) => row.tag),
                      ...selected.eventEvidenceTags.flatMap((event) => event.noteTags),
                    ]}
                    signalTags={focusTags}
                    returnTo={returnTo}
                    compact
                  />
                }
                provenance={{
                  directHeading: "Tags in this Topic",
                  directBadge: "Evidence",
                  directEmptyHint:
                    "No Tags on Notes or emails linked directly to this Topic.",
                  directTags: selected.topicDirectEvidenceTagCounts.map((row) => ({
                    ...row,
                    href: `/argus/v2/browse/topics?selected=${encodeURIComponent(selected.id)}&tag=${encodeURIComponent(row.tag)}&focus=1&from=tags`,
                  })),
                  byEventHeading: "By Event",
                  eventsEmptyHint: "No linked Events yet.",
                  events: selected.eventEvidenceTags.map((event) => ({
                    id: event.id,
                    name: event.name,
                    dateLabel: event.dateLabel,
                    href: event.href,
                    eventTags: event.eventTags.map((tag) => ({
                      tag,
                      count: 0,
                      href: `/argus/v2/browse/topics?selected=${encodeURIComponent(selected.id)}&tag=${encodeURIComponent(tag)}&focus=1&from=tags`,
                    })),
                    noteTags: event.noteTags.map((tag) => ({
                      tag,
                      count: 0,
                      href: `/argus/v2/browse/topics?selected=${encodeURIComponent(selected.id)}&tag=${encodeURIComponent(tag)}&focus=1&from=tags`,
                    })),
                  })),
                }}
                signalTags={focusTags}
                onSignalTagsChange={setFocusTags}
              />
            </div>
          ) : null}
        </V2PrivateEvidenceGate>
      </div>

      <V2MobileUnlockedManageBar
        visible={showMobileManageBar}
        entityId={selected.id}
        entityName={selected.name}
        entityKind="topic"
        lifecycleStatus={selected.lifecycleStatus}
        returnTo={returnTo}
        hasPrivateEvidence={selected.hasPrivateEvidence}
        privateConfigured={privateConfigured}
        privateUnlocked={privateUnlocked}
        showDelete
        {...deleteGate}
      />
    </div>
  );
}
