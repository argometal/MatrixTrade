"use client";

import Link from "next/link";
import { useState } from "react";
import type { Entity, Runbook, RunbookProgress } from "@/lib/argus/types";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { applyRunbookProgress, findRunbookProgress, runbookProgress } from "@/lib/argus/runbook-helpers";
import { formatDate } from "@/app/argus/components/ui";
import { V2Card } from "./v2-ui";
import { V2EntityNeighborhoodPanel } from "./V2EntityNeighborhoodPanel";
import { V2PrivateEvidenceGate } from "./V2PrivateEvidenceGate";
import { V2ProjectScopeToggle } from "./V2ProjectScopeToggle";
import { V2EntityTimelineSection } from "./V2EntityTimelineSection";
import { V2EntityChronicleRail } from "./V2EntityChronicleRail";
import { V2EntityLinksTab } from "./V2EntityLinksTab";
import { V2ProjectRunbooksTab } from "./V2ProjectRunbooksTab";
import {
  V2LegacyLink,
  V2MetricRows,
  V2MorePeopleHint,
  V2PanelCard,
  V2PanelHeader,
  V2PanelLinkAction,
  V2PersonListItem,
} from "./V2RightPanel";

const TABS = ["Overview", "Timeline", "Runbooks", "Links"] as const;
type ProjectTab = (typeof TABS)[number];

export type V2ProjectShellProps = {
  entity: Entity;
  notes: string;
  respectProjectDates: boolean;
  privateLocked: boolean;
  privateConfigured: boolean;
  returnTo: string;
  timeline: V2TimelineEntry[];
  neighborhood: V2EntityNeighborhoodGraph;
  runbooks: Runbook[];
  libraryRunbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
  durationDays?: number;
  dateRangeLabel?: string;
  peopleWithRoles: Array<{ id: string; name: string; initials: string; role: string }>;
  linkedTopics: string[];
  linkedEventsCount: number;
  tagPatterns: TagPattern[];
  keyMetrics: Array<{ label: string; value: string; highlight?: boolean }>;
  org?: { id: string; name: string };
  stats: {
    people: number;
    topics: number;
    events: number;
    emails: number;
  };
};

export function V2ProjectShell(props: V2ProjectShellProps) {
  const [tab, setTab] = useState<ProjectTab>("Overview");
  const {
    entity,
    notes,
    respectProjectDates,
    privateLocked,
    privateConfigured,
    returnTo,
    timeline,
    neighborhood,
    runbooks,
    libraryRunbooks = [],
    progressRecords = [],
    durationDays,
    peopleWithRoles,
    linkedTopics,
    linkedEventsCount,
    tagPatterns,
    keyMetrics,
    org,
    stats,
  } = props;

  const morePeople = Math.max(0, peopleWithRoles.length - 4);
  const chronicleSubtitle = respectProjectDates
    ? "Bounded by project dates · direct links + via project contacts"
    : "All dates · includes evidence outside the project window";
  const runbookOpen = runbooks.reduce((sum, rb) => {
    const prog = findRunbookProgress(progressRecords, rb.id, entity.id);
    const items = applyRunbookProgress(rb, prog ?? null);
    return sum + runbookProgress(items).open;
  }, 0);

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
        {TABS.map((entry) => {
          const hint =
            entry === "Runbooks" && runbooks.length > 0
              ? ` · ${runbooks.length}`
              : entry === "Timeline" && timeline.length > 0
                ? ` · ${timeline.length}`
                : "";
          return (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === entry
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {entry}
              {hint ? <span className="ml-1 text-[11px] tabular-nums text-zinc-600">{hint}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
              <StatChip
                value={durationDays ? `${durationDays} days` : "—"}
                label="Duration"
                sub={
                  entity.startDate
                    ? `${formatDate(entity.startDate)} – ${entity.endDate ? formatDate(entity.endDate) : "open"}`
                    : undefined
                }
              />
              <StatChip value={String(stats.people)} label="People" href={`/argus/projects/${entity.id}`} />
              <StatChip value={String(stats.emails)} label="Emails" href={`/argus/v2/inbox?entity=${entity.id}`} />
              <StatChip value={String(stats.topics)} label="Topics" href={`/argus/v2/browse/topics?project=${entity.id}`} />
              <StatChip value={String(stats.events)} label="Events" href={`/argus/v2/browse/events?entity=${entity.id}`} />
              <StatChip
                value={runbooks.length > 0 ? `${runbooks.length} · ${runbookOpen} open` : "0"}
                label="Runbooks"
                onClick={() => setTab("Runbooks")}
              />
            </div>

            <V2Card className="p-5 sm:p-6">
              <V2PrivateEvidenceGate
                locked={privateLocked}
                privateConfigured={privateConfigured}
                returnTo={returnTo}
              >
                <V2EntityNeighborhoodPanel graph={neighborhood} entityName={entity.name} />
              </V2PrivateEvidenceGate>
            </V2Card>
          </div>

          <aside className="space-y-4">
            <V2PanelCard>
              <V2PanelHeader title="About" editHref={`/argus/projects/${entity.id}`} />
              {notes ? (
                <p className="text-sm leading-relaxed text-zinc-400">{notes}</p>
              ) : (
                <p className="text-sm text-zinc-500">Add a description on the project record.</p>
              )}
            </V2PanelCard>

            <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
              <V2EntityChronicleRail entries={timeline} onOpenChronicle={() => setTab("Timeline")} />
            </V2PrivateEvidenceGate>

            <V2PanelCard>
              <V2PanelHeader
                title="People"
                action={
                  peopleWithRoles.length > 0 ? (
                    <V2PanelLinkAction href={`/argus/projects/${entity.id}`}>View all</V2PanelLinkAction>
                  ) : undefined
                }
              />
              {peopleWithRoles.length === 0 ? (
                <p className="text-sm text-zinc-500">Add people via Link.</p>
              ) : (
                <>
                  <ul className="space-y-4">
                    {peopleWithRoles.slice(0, 4).map((person) => (
                      <V2PersonListItem
                        key={person.id}
                        href={`/argus/v2/network/${person.id}`}
                        name={person.name}
                        subtitle={person.role}
                        initials={person.initials}
                      />
                    ))}
                  </ul>
                  <V2MorePeopleHint people={peopleWithRoles.slice(4)} moreCount={morePeople} />
                </>
              )}
            </V2PanelCard>

            <V2PanelCard>
              <V2PanelHeader title="Key metrics" />
              <V2MetricRows metrics={keyMetrics} />
            </V2PanelCard>

            <V2LegacyLink href={`/argus/projects/${entity.id}`}>Open legacy project view →</V2LegacyLink>
          </aside>
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          <V2EntityTimelineSection
            entries={timeline}
            subtitle={chronicleSubtitle}
            headerExtra={
              <V2ProjectScopeToggle projectId={entity.id} respectDates={respectProjectDates} />
            }
          />
        </V2PrivateEvidenceGate>
      ) : null}

      {tab === "Runbooks" ? (
        <V2ProjectRunbooksTab
          runbooks={runbooks}
          projectId={entity.id}
          libraryRunbooks={libraryRunbooks}
          progressRecords={progressRecords}
        />
      ) : null}

      {tab === "Links" ? (
        <V2EntityLinksTab
          entityId={entity.id}
          linkedIds={entity.linkedEntityIds ?? []}
          people={peopleWithRoles.map((p) => ({
            id: p.id,
            name: p.name,
            subtitle: p.role,
            href: `/argus/v2/network/${p.id}`,
          }))}
          organizations={
            org ? [{ id: org.id, name: org.name, href: `/argus/v2/organizations/${org.id}` }] : []
          }
          topics={linkedTopics}
          eventsCount={linkedEventsCount}
          tagPatterns={tagPatterns}
          manualTags={(entity.linkedTags ?? []).map((t) => t.trim()).filter(Boolean)}
          tagHref={(tag) =>
            `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&project=${entity.id}`
          }
        />
      ) : null}
    </>
  );
}

function StatChip({
  value,
  label,
  sub,
  href,
  onClick,
}: {
  value: string;
  label: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-xl font-bold tabular-nums text-zinc-50">{value}</p>
      {sub ? <p className="mt-1 text-[10px] leading-snug text-zinc-600">{sub}</p> : null}
      <p className="mt-2 text-xs text-zinc-500">{label}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-left transition hover:border-violet-500/30 hover:bg-zinc-900"
      >
        {inner}
      </button>
    );
  }

  return (
    <V2Card className="p-4">
      {inner}
      {href ? (
        <Link href={href} className="mt-1 text-[10px] text-violet-400 hover:text-violet-300">
          View
        </Link>
      ) : null}
    </V2Card>
  );
}
