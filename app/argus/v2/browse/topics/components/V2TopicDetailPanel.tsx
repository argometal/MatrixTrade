"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2EntityNeighborhoodPanel } from "@/app/argus/v2/components/V2EntityNeighborhoodPanel";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { V2EvidenceStreamKind } from "@/lib/argus/v2/evidence-stream";
import type { V2TopicDetail } from "@/lib/argus/v2/topic-browse-utils";
import { V2QuickDeliverButton } from "@/app/argus/v2/components/V2QuickDeliverModal";
import {
  V2FlaggableTagChip,
  focusKeySet,
  tagIsFlagged,
} from "@/app/argus/v2/components/V2FlaggableTagChip";
import { V2TrackerTogglePanel } from "@/app/argus/v2/components/V2TrackerTogglePanel";
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
  V2ChronicleSelectableList,
  chronicleLogIdFromEvidenceId,
} from "@/app/argus/v2/components/V2ChronicleSelectableList";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import { libraryRunbooksForRelated, progressForEntity, runbooksForEntity } from "@/lib/argus/runbook-helpers";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import type { LinkPanelFilter } from "@/lib/argus/create-flow-types";
import type { V2TopicLinkedEntity } from "@/lib/argus/v2/topic-browse-utils";

/** Topic = evidence binder → Chronicle only (Timeline stays on Org/Project). */
type PanelTab = "chronicle" | "runbooks" | "connections" | "tags";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "chronicle", label: "Chronicle" },
  { id: "runbooks", label: "Runbooks" },
  { id: "connections", label: "Connections" },
  { id: "tags", label: "Tags" },
];

const SECTION_LINK_BTN =
  "rounded-md border border-violet-500/35 bg-violet-600/10 px-2 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/20";
const EMPTY_LINK_BTN =
  "mt-2 inline-flex rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25";

function TopicConnectionChips({
  entities,
  accentClass,
}: {
  entities: Array<{ id: string; name: string; href: string; icon?: string; dateLabel?: string }>;
  accentClass: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {entities.map((entity) => (
        <li key={entity.id}>
          <Link href={entity.href} className={accentClass}>
            {entity.icon ? <span aria-hidden>{entity.icon}</span> : null}
            <span>{entity.name}</span>
            {"dateLabel" in entity && entity.dateLabel ? (
              <span className="opacity-60">{entity.dateLabel}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TopicConnectionSection({
  title,
  count,
  entityId,
  linkedIds,
  linkLabel,
  initialFilter,
  subtitle,
  browseHref,
  entities,
  chipClass,
  emptyHint,
}: {
  title: string;
  count: number;
  entityId: string;
  linkedIds: string[];
  linkLabel: string;
  initialFilter: LinkPanelFilter;
  subtitle: string;
  browseHref?: string;
  entities: Array<{ id: string; name: string; href: string; icon?: string; dateLabel?: string }>;
  chipClass: string;
  emptyHint: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {title} ({count})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {browseHref && count > 0 ? (
            <Link href={browseHref} className="text-[11px] font-medium text-violet-300 hover:text-violet-200">
              Browse →
            </Link>
          ) : null}
          <V2EntityLinkButton
            entityId={entityId}
            linkedIds={linkedIds}
            label={linkLabel}
            initialFilter={initialFilter}
            subtitle={subtitle}
            className={SECTION_LINK_BTN}
            buttonTitle={subtitle}
          />
        </div>
      </div>
      {entities.length > 0 ? (
        <TopicConnectionChips entities={entities} accentClass={chipClass} />
      ) : (
        <div>
          <p className="text-sm text-zinc-500">{emptyHint}</p>
          <V2EntityLinkButton
            entityId={entityId}
            linkedIds={linkedIds}
            label={linkLabel}
            initialFilter={initialFilter}
            subtitle={subtitle}
            className={EMPTY_LINK_BTN}
            buttonTitle={subtitle}
          />
        </div>
      )}
    </div>
  );
}

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
  const router = useRouter();
  const [panelTab, setPanelTab] = useState<PanelTab>("chronicle");
  const [showGraph, setShowGraph] = useState(true);
  const [focusTags, setFocusTags] = useState<string[]>(signalTags);
  const focusKeys = useMemo(() => focusKeySet(focusTags), [focusTags]);
  const privateLocked = selected.hasPrivateEvidence && !privateUnlocked;

  useEffect(() => {
    setFocusTags(signalTags);
  }, [signalTags, selected.id]);
  const mobileDetail = Boolean(onBack);
  const compactChrome = mobileDetail && panelTab !== "tags";
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
      <div className="shrink-0 border-b border-zinc-800/80 p-5">
        <V2DetailCompactHeader
          mobileDetail={mobileDetail}
          compact={compactChrome}
          title={selected.name}
          subtitle={selected.category}
          collapsedExtra={
            <>
              {panelTab === "connections" ? (
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
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-500/25">
                      {selected.category}
                    </span>
                    <div className={showMobileManageBar ? "hidden lg:block" : undefined}>{lifecycle}</div>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-zinc-400">{selected.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
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
                <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
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
                    icon="📅"
                    label="Events"
                    count={selected.eventCount}
                    onClick={() => {
                      if (selected.eventCount > 0) {
                        router.push(`/argus/v2/browse/events?entity=${selected.id}`);
                        return;
                      }
                      setPanelTab("connections");
                    }}
                  />
                  <MetricPill
                    icon="🏢"
                    label="Orgs"
                    count={selected.orgCount}
                    onClick={() => setPanelTab("connections")}
                  />
                  <MetricPill
                    icon="📁"
                    label="Projects"
                    count={selected.projectCount}
                    onClick={() => setPanelTab("connections")}
                  />
                  <MetricPill
                    icon="👤"
                    label="People"
                    count={selected.peopleCount}
                    onClick={() => setPanelTab("connections")}
                  />
                </div>
              )}
            </>
          }
        />

        <div className="flex gap-1 border-b border-zinc-800/80">
          {PANEL_TABS.map((t) => (
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
        <V2PrivateEvidenceGate
          locked={privateLocked}
          privateConfigured={privateConfigured}
          returnTo={returnTo}
        >
          {panelTab === "chronicle" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-300">Chronicle</p>
                <V2IntelHelpLink topic="topic-chronicle" label="Topic Chronicle" />
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
                empty={<p className="text-sm text-zinc-500">No evidence yet.</p>}
                items={selected.evidence.map((item) => ({
                  key: item.id,
                  logId: chronicleLogIdFromEvidenceId(item.id),
                  title: item.title,
                  href: item.href,
                  external: item.kind === "photo" || item.kind === "file",
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
            />
          ) : null}

          {panelTab === "connections" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 max-w-xl">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-zinc-300">Connections</p>
                    <V2IntelHelpLink topic="topic-connections" label="Topic Connections" />
                  </div>
                  <p className="text-sm text-zinc-500">{LINK_HIERARCHY.topicEventsHint}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
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

              <TopicConnectionSection
                title="Events"
                count={selected.linkedEvents.length}
                entityId={selected.id}
                linkedIds={selected.linkedEntityIds}
                linkLabel="Link event"
                initialFilter="event"
                subtitle={LINK_HIERARCHY.topicLinkEvents}
                browseHref={`/argus/v2/browse/events?entity=${selected.id}`}
                entities={selected.linkedEvents.map((event) => ({
                  ...event,
                  icon: "📅",
                }))}
                chipClass="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-100 hover:border-rose-400/50"
                emptyHint="No Events linked yet. Link an Event so its Notes appear in Chronicle."
              />

              <TopicConnectionSection
                title="Organizations"
                count={linkedOrgs.length}
                entityId={selected.id}
                linkedIds={selected.linkedEntityIds}
                linkLabel="Link org"
                initialFilter="organization"
                subtitle={LINK_HIERARCHY.topicLinkOrgs}
                entities={linkedOrgs}
                chipClass="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                emptyHint="No organizations linked yet."
              />

              <TopicConnectionSection
                title="Projects"
                count={linkedProjects.length}
                entityId={selected.id}
                linkedIds={selected.linkedEntityIds}
                linkLabel="Link project"
                initialFilter="project"
                subtitle={LINK_HIERARCHY.topicLinkProjects}
                entities={linkedProjects}
                chipClass="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                emptyHint="No projects linked yet."
              />

              <TopicConnectionSection
                title="People"
                count={linkedPeople.length}
                entityId={selected.id}
                linkedIds={selected.linkedEntityIds}
                linkLabel="Link person"
                initialFilter="person"
                subtitle={LINK_HIERARCHY.topicLinkPeople}
                entities={linkedPeople}
                chipClass="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                emptyHint="No people linked yet."
              />

              {linkedOther.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Other ({linkedOther.length})
                  </h3>
                  <TopicConnectionChips
                    entities={linkedOther}
                    accentClass="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                  />
                </div>
              ) : null}

              {neighborhood ? (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">Local graph — 1–2 hops from co-mentions and explicit links.</p>
                    <button
                      type="button"
                      onClick={() => setShowGraph((v) => !v)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      {showGraph ? "Hide graph" : "Show graph"}
                    </button>
                  </div>
                  {showGraph ? (
                    <V2EntityNeighborhoodPanel graph={neighborhood} entityName={selected.name} />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {panelTab === "tags" ? (
            <div className="space-y-4">
              <V2TrackerTogglePanel
                evidenceTags={[
                  ...selected.evidenceTagCounts,
                  ...selected.aliases
                    .filter(
                      (alias) =>
                        !selected.evidenceTagCounts.some(
                          (row) => row.tag.toLowerCase() === alias.toLowerCase()
                        )
                    )
                    .map((tag) => ({ tag, count: 0 })),
                ]}
                signalTags={focusTags}
                onSignalTagsChange={setFocusTags}
                surfaceLabel="this Topic"
                heading="Flag Trackers"
                helpTopic="topic-tags"
                emptyEvidenceHint="No evidence Tags or Topic Tags yet — tag Notes on linked Events, or add Topic Tags below."
                addPlaceholder="Tag name → Flag as Tracker"
              />

              {selected.eventEvidenceTags.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                    By linked Event
                  </p>
                  <ul className="space-y-3">
                    {selected.eventEvidenceTags.map((event) => (
                      <li key={event.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5">
                        <div className="mb-2 flex flex-wrap items-baseline gap-2">
                          <Link
                            href={event.href}
                            className="text-sm font-medium text-rose-100 hover:text-rose-50"
                          >
                            📅 {event.name}
                          </Link>
                          {event.dateLabel ? (
                            <span className="text-[11px] text-zinc-600">{event.dateLabel}</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {event.tags.map((tag) => {
                            const count =
                              selected.evidenceTagCounts.find(
                                (row) => row.tag.toLowerCase() === tag.toLowerCase()
                              )?.count ?? 1;
                            return (
                              <V2FlaggableTagChip
                                key={tag}
                                tag={tag}
                                count={count}
                                flagged={tagIsFlagged(tag, focusKeys)}
                                onFlaggedChange={(next) => setFocusTags(next)}
                              />
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Topic Tags (create / manage)
                </p>
                <V2TopicAliasEditor
                  topicId={selected.id}
                  topicName={selected.name}
                  initialAliases={selected.aliases}
                  returnTo={returnTo}
                />
              </div>
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
