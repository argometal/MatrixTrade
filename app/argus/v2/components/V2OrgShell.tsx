"use client";

import Link from "next/link";
import { useState } from "react";
import type { Entity, Runbook, RunbookProgress } from "@/lib/argus/types";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { V2Badge, V2Card } from "./v2-ui";
import { V2EntityNeighborhoodPanel } from "./V2EntityNeighborhoodPanel";
import { V2PrivateEvidenceGate } from "./V2PrivateEvidenceGate";
import { V2EntityTimelineSection } from "./V2EntityTimelineSection";
import { V2EntityChronicleRail } from "./V2EntityChronicleRail";
import { V2EntityLinksTab } from "./V2EntityLinksTab";
import { V2EntityRunbooksTab } from "./V2EntityRunbooksTab";
import { V2RelationshipChart } from "./V2RelationshipChart";
import {
  V2ContactPill,
  V2LegacyLink,
  V2MetricRows,
  V2MorePeopleHint,
  V2PanelCard,
  V2PanelHeader,
  V2PanelLinkAction,
  V2PersonListItem,
  V2ProjectListItem,
  V2SummaryStatCard,
} from "./V2RightPanel";

const TABS = ["Overview", "Timeline", "Runbooks", "Links"] as const;
type OrgTab = (typeof TABS)[number];

export type V2OrgShellProps = {
  entity: Entity;
  privateLocked: boolean;
  privateConfigured: boolean;
  returnTo: string;
  timeline: V2TimelineEntry[];
  neighborhood: V2EntityNeighborhoodGraph;
  linkedPeople: Entity[];
  orgProjects: Entity[];
  recentProjects: Array<{ id: string; name: string; status: string; year: string }>;
  tagPatterns: TagPattern[];
  stats: {
    emails: number;
    emailsDelta: string;
    people: number;
    projects: number;
    topics: number;
    events: number;
    firstContact: string;
    lastActivity: string;
    isActiveToday: boolean;
  };
  relationshipScore: string;
  relationshipLabel: string;
  sparkline: number[];
  chartStartYear: number;
  chartEndYear: number;
  relationshipMetrics: Array<{ label: string; value: string }>;
  linkedTopics: string[];
  runbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
  peerOrganizations?: Array<{ id: string; name: string }>;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function V2OrgShell(props: V2OrgShellProps) {
  const [tab, setTab] = useState<OrgTab>("Overview");
  const {
    entity,
    privateLocked,
    privateConfigured,
    returnTo,
    timeline,
    neighborhood,
    linkedPeople,
    orgProjects,
    recentProjects,
    tagPatterns,
    stats,
    relationshipScore,
    relationshipLabel,
    sparkline,
    chartStartYear,
    chartEndYear,
    relationshipMetrics,
    linkedTopics,
    runbooks = [],
    progressRecords = [],
    peerOrganizations = [],
  } = props;

  const morePeople = Math.max(0, linkedPeople.length - 4);
  const moreProjects = Math.max(0, orgProjects.length - 3);

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
        {TABS.map((entry) => {
          const hint =
            entry === "Timeline" && timeline.length > 0
              ? ` · ${timeline.length}`
              : entry === "Runbooks" && runbooks.length > 0
                ? ` · ${runbooks.length}`
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <V2SummaryStatCard
                  kind="email"
                  value={String(stats.emails)}
                  label="Emails"
                  delta={stats.emailsDelta}
                  href={`/argus/v2/inbox?entity=${entity.id}`}
                />
                <V2SummaryStatCard
                  kind="people"
                  value={String(stats.people)}
                  label="People"
                  href={`/argus/v2/browse/network?org=${entity.id}`}
                  linkLabel="View all"
                />
                <V2SummaryStatCard
                  kind="projects"
                  value={String(stats.projects)}
                  label="Projects"
                  href={`/argus/v2/browse/projects?org=${entity.id}`}
                  linkLabel="View all"
                />
                <V2SummaryStatCard
                  kind="topics"
                  value={String(stats.topics)}
                  label="Topics"
                  href={`/argus/v2/browse/topics?org=${entity.id}`}
                  linkLabel="Browse"
                />
                <V2SummaryStatCard
                  kind="events"
                  value={String(stats.events)}
                  label="Events"
                  href={`/argus/v2/browse/events?entity=${entity.id}`}
                  linkLabel="Browse"
                />
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-44 lg:flex-col">
                <V2ContactPill label="First contact" value={stats.firstContact} />
                <V2ContactPill label="Last activity" value={stats.lastActivity} active={stats.isActiveToday} />
              </div>
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
              <V2PanelHeader title="Relationship Performance" />
              <div className="mb-1 flex items-end gap-1.5">
                <span className="text-4xl font-bold tabular-nums text-zinc-50">{relationshipScore}</span>
                <span className="pb-1 text-sm text-zinc-500">/ 5</span>
              </div>
              <p className="mb-4 text-sm font-semibold text-emerald-400">{relationshipLabel}</p>
              <V2RelationshipChart points={sparkline} startYear={chartStartYear} endYear={chartEndYear} />
              <div className="border-t border-zinc-800/80 pt-4">
                <V2MetricRows
                  metrics={relationshipMetrics.map((m) => ({
                    label: m.label,
                    value: m.value,
                    highlight: m.value === "High" || m.value === "Strong",
                  }))}
                />
              </div>
            </V2PanelCard>

            <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
              <V2EntityChronicleRail entries={timeline} onOpenChronicle={() => setTab("Timeline")} />
            </V2PrivateEvidenceGate>

            <V2PanelCard>
              <V2PanelHeader
                title="Key People"
                action={
                  linkedPeople.length > 0 ? (
                    <V2PanelLinkAction href={`/argus/v2/network/${entity.id}`}>View all</V2PanelLinkAction>
                  ) : undefined
                }
              />
              {linkedPeople.length === 0 ? (
                <p className="text-sm text-zinc-500">Link people on the organization record.</p>
              ) : (
                <>
                  <ul className="space-y-4">
                    {linkedPeople.slice(0, 4).map((person, index) => (
                      <V2PersonListItem
                        key={person.id}
                        href={`/argus/v2/network/${person.id}`}
                        name={person.name}
                        subtitle={person.alias || "Contact"}
                        initials={initials(person.name)}
                        badge={
                          index === 0 ? (
                            <V2Badge tone="purple">Primary Contact</V2Badge>
                          ) : (
                            <V2Badge tone="default">Contact</V2Badge>
                          )
                        }
                        active
                      />
                    ))}
                  </ul>
                  <V2MorePeopleHint
                    people={linkedPeople.slice(4).map((p) => ({ initials: initials(p.name) }))}
                    moreCount={morePeople}
                  />
                </>
              )}
            </V2PanelCard>

            <V2PanelCard>
              <V2PanelHeader
                title="Recent Projects"
                action={
                  recentProjects.length > 0 ? (
                    <V2PanelLinkAction href="/argus/v2/browse/projects">View all</V2PanelLinkAction>
                  ) : undefined
                }
              />
              {recentProjects.length === 0 ? (
                <p className="text-sm text-zinc-500">Link this org on a project record.</p>
              ) : (
                <>
                  <ul className="space-y-2.5">
                    {recentProjects.map((project) => (
                      <li key={project.id}>
                        <V2ProjectListItem
                          href={`/argus/v2/projects/${project.id}`}
                          name={project.name}
                          status={project.status}
                          year={project.year}
                          statusTone={project.status === "Completed" ? "green" : "blue"}
                        />
                      </li>
                    ))}
                  </ul>
                  {moreProjects > 0 ? (
                    <p className="mt-3 text-xs font-medium text-violet-400">+{moreProjects} more projects</p>
                  ) : null}
                </>
              )}
            </V2PanelCard>

            <V2LegacyLink href={`/argus/v2/network/${entity.id}`}>Open legacy network view →</V2LegacyLink>
          </aside>
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <V2PrivateEvidenceGate locked={privateLocked} privateConfigured={privateConfigured} returnTo={returnTo}>
          <V2EntityTimelineSection
            entries={timeline}
            subtitle="All time · Quick scan of activity on this organization"
          />
        </V2PrivateEvidenceGate>
      ) : null}

      {tab === "Runbooks" ? (
        <V2EntityRunbooksTab
          level="organization"
          entityId={entity.id}
          linkedRunbooks={runbooks}
          progressRecords={progressRecords}
          peerOrganizations={peerOrganizations}
        />
      ) : null}

      {tab === "Links" ? (
        <V2EntityLinksTab
          entityId={entity.id}
          linkedIds={entity.linkedEntityIds ?? []}
          people={linkedPeople.map((p) => ({
            id: p.id,
            name: p.name,
            subtitle: p.alias || "Contact",
            href: `/argus/v2/network/${p.id}`,
          }))}
          projects={orgProjects.map((p) => ({
            id: p.id,
            name: p.name,
            href: `/argus/v2/projects/${p.id}`,
            meta: p.endDate?.slice(0, 4) || p.startDate?.slice(0, 4),
          }))}
          topics={linkedTopics}
          eventsCount={stats.events}
          tagPatterns={tagPatterns}
          manualTags={(entity.linkedTags ?? []).map((t) => t.trim()).filter(Boolean)}
          tagHref={(tag) => `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&org=${entity.id}`}
        />
      ) : null}
    </>
  );
}
